import { searchconsole_v1, searchconsole } from '@googleapis/searchconsole';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

// --- Configuration & Initialization ---

// Securely load Google Cloud service account credentials from environment variables.
const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
if (!serviceAccountBase64) {
    console.error('FATAL: FIREBASE_ADMIN_SDK_JSON_BASE64 environment variable not set.');
    process.exit(1);
}

let serviceAccount: ServiceAccount;
try {
    serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
} catch (error) {
    console.error('FATAL: Could not parse Firebase service account credentials. Check if the Base64 string is valid.', error);
    process.exit(1);
}

// Initialize the Firebase Admin SDK to interact with Firestore.
initializeApp({
    credential: cert(serviceAccount),
});
const db = getFirestore();

// Initialize the Google Search Console API client.
const gscClient = searchconsole({
    version: 'v1',
    auth: new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    }),
});

// --- Type Definitions ---

// Based on GSC API response for searchanalytics.query
interface GscApiRow {
    keys?: (string | null)[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
}

// Our Firestore document schema
interface GscFirestoreDoc {
    siteUrl: string;
    normalizedUrl: string;
    query: string;
    date: string; // YYYY-MM-DD
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
    device: string;
    country: string;
    searchAppearance: string;
    ingestedAt: FieldValue;
}


/**
 * Main orchestration function (ingestGSCData).
 * This is the entry point of the service.
 * It accepts a siteUrl, startDate, and endDate as input.
 * It will loop through each day in the specified date range.
 * For each day, it will call a dedicated function to fetch all data from the GSC API.
 * It will then process the returned data, normalize it, and write it to Firestore in batches.
 * It must include clear logging for progress and error reporting.
 *
 * @param siteUrl The site property from GSC, e.g., 'sc-domain:example.com'
 * @param startDate The start date of the report in YYYY-MM-DD format.
 * @param endDate The end date of the report in YYYY-MM-DD format.
 * @returns An object with the success status and total rows written.
 */
export async function ingestGSCData(
    siteUrl: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; totalRowsWritten: number }> {
    console.log(`[ingestGSCData] Starting GSC data ingestion for ${siteUrl} from ${startDate} to ${endDate}.`);
    let totalRowsWritten = 0;

    // Validate inputs
    if (!siteUrl || !startDate || !endDate) {
        console.error('[ingestGSCData] Error: siteUrl, startDate, and endDate must be provided.');
        return { success: false, totalRowsWritten: 0 };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        const currentDate = dt.toISOString().split('T')[0];
        console.log(`[ingestGSCData] Processing date: ${currentDate}`);

        try {
            const rawRows = await fetchGSCDataForDate(gscClient, siteUrl, currentDate);
            console.log(`[ingestGSCData] Fetched ${rawRows.length} raw rows for ${currentDate}.`);

            if (rawRows.length > 0) {
                const normalizedRows = rawRows.map(row => normalizeRow(row, siteUrl, currentDate));
                await writeToFirestoreInBatches(db, 'ingestion/gsc/daily', normalizedRows);
                totalRowsWritten += normalizedRows.length;
                console.log(`[ingestGSCData] Successfully wrote ${normalizedRows.length} rows to Firestore for ${currentDate}.`);
            }
        } catch (error) {
            console.error(`[ingestGSCData] Failed to process data for ${currentDate}. Error:`, error);
            // Continue to the next day
        }
    }

    console.log(`[ingestGSCData] Ingestion finished. Total rows written: ${totalRowsWritten}.`);
    return { success: true, totalRowsWritten };
}

/**
 * Data Fetching Function (fetchGSCDataForDate).
 * Handles the direct communication with the GSC API.
 * It must request the following dimensions: date, page, query, device, country, searchAppearance.
 * It must handle API pagination to ensure all data for a given day is retrieved.
 * It needs to have a robust retry mechanism with exponential backoff.
 *
 * @param gscClient The initialized GSC API client.
 * @param siteUrl The site property from GSC.
 * @param date The date to fetch data for in YYYY-MM-DD format.
 * @returns An array of raw row objects from the GSC API.
 */
export async function fetchGSCDataForDate(
    gscClient: searchconsole_v1.Searchconsole,
    siteUrl: string,
    date: string
): Promise<GscApiRow[]> {
    const allRows: GscApiRow[] = [];
    let startRow = 0;
    const rowLimit = 25000; // GSC API max limit is 25,000
    let hasMore = true;
    let attempt = 0;
    const maxRetries = 5;
    const initialDelay = 1000;

    console.log(`[fetchGSCDataForDate] Fetching data for ${siteUrl} on ${date}.`);

    while (hasMore) {
        try {
            const request: searchconsole_v1.Params$Resource$Searchanalytics$Query = {
                siteUrl,
                requestBody: {
                    startDate: date,
                    endDate: date,
                    dimensions: ['page', 'query', 'device', 'country', 'searchAppearance'],
                    rowLimit,
                    startRow,
                    type: 'web',
                },
            };

            const response = await gscClient.searchanalytics.query(request);

            const rows = response.data.rows;
            if (rows && rows.length > 0) {
                allRows.push(...rows);
                startRow += rows.length;
                hasMore = rows.length === rowLimit;
                if (hasMore) {
                    console.log(`[fetchGSCDataForDate] Fetched ${rows.length} rows, requesting next page...`);
                }
            } else {
                hasMore = false;
            }
            attempt = 0; // Reset retry counter on a successful API call
        } catch (error: any) {
            console.error(`[fetchGSCDataForDate] API Error on attempt ${attempt + 1}.`, error.message);
            if (attempt < maxRetries) {
                attempt++;
                const delay = Math.pow(2, attempt) * initialDelay + Math.random() * 1000; // Exponential backoff with jitter
                console.log(`[fetchGSCDataForDate] Retrying in ${Math.round(delay / 1000)} seconds...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error(`[fetchGSCDataForDate] Max retries reached for date ${date}. Aborting fetch for this date.`);
                throw new Error(`Failed to fetch GSC data for ${date} after ${maxRetries} attempts.`);
            }
        }
    }
    console.log(`[fetchGSCDataForDate] Finished fetching for ${date}. Total rows: ${allRows.length}.`);
    return allRows;
}


/**
 * Data Transformation Function (normalizeRow).
 * This will be a pure function that takes a single raw data row from the GSC API
 * and transforms it into our desired schema.
 *
 * @param rawRow The raw row object from the GSC API.
 * @param siteUrl The site URL for which the data is being ingested.
 * @param date The date for which the data is being ingested.
 * @returns A single document object matching the Firestore schema.
 */
export function normalizeRow(rawRow: GscApiRow, siteUrl: string, date: string): GscFirestoreDoc {
    // Destructure with default values to handle potential nulls from the API
    const [
        page = '',
        query = '',
        device = 'UNKNOWN',
        country = 'UNKNOWN',
        searchAppearance = 'NONE'
    ] = rawRow.keys || [];

    // URL Normalization
    let normalizedUrl = page || '';
    try {
        const url = new URL(page || '');
        // 1. Remove all utm_* tracking parameters.
        url.searchParams.forEach((_, key) => {
            if (key.toLowerCase().startsWith('utm_')) {
                url.searchParams.delete(key);
            }
        });
        // 2. Convert the URL to lowercase (hostname and pathname).
        // 3. Ensure a consistent trailing slash policy (always remove it).
        let path = url.pathname;
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        normalizedUrl = `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;
    } catch (e) {
        // If URL is invalid, use the original string but log a warning.
        if (page) console.warn(`[normalizeRow] Could not parse URL: '${page}'. Using as is.`);
        normalizedUrl = page || 'INVALID_URL';
    }


    return {
        siteUrl,
        normalizedUrl,
        query: query || '',
        date,
        impressions: rawRow.impressions || 0,
        clicks: rawRow.clicks || 0,
        position: rawRow.position || 0,
        ctr: rawRow.ctr || 0,
        device,
        country: country ? country.toUpperCase() : 'UNKNOWN', // e.g., 'usa' -> 'USA'
        searchAppearance,
        ingestedAt: FieldValue.serverTimestamp(),
    };
}


/**
 * Data Loading Function (writeToFirestoreInBatches).
 * This function will receive an array of normalized data rows.
 * To write data efficiently and avoid hitting Firestore limits, it must use batched writes.
 * It will chunk the data into groups of 500.
 *
 * @param db The Firestore instance.
 * @param collectionPath The path to the Firestore collection.
 * @param documents The array of documents to write.
 */
export async function writeToFirestoreInBatches(
    db: FirebaseFirestore.Firestore,
    collectionPath: string,
    documents: GscFirestoreDoc[]
): Promise<void> {
    const batchSize = 500; // Firestore limit
    console.log(`[writeToFirestoreInBatches] Writing ${documents.length} documents to '${collectionPath}' in batches of ${batchSize}.`);

    for (let i = 0; i < documents.length; i += batchSize) {
        const chunk = documents.slice(i, i + batchSize);
        const batch = db.batch();
        chunk.forEach(doc => {
            const docRef = db.collection(collectionPath).doc(); // Auto-generate document ID
            batch.set(docRef, doc);
        });
        try {
            await batch.commit();
            console.log(`[writeToFirestoreInBatches] Committed a batch of ${chunk.length} documents.`);
        } catch (error) {
            console.error(`[writeToFirestoreInBatches] Error committing batch.`, error);
            // Depending on requirements, you might want to re-throw or handle this differently
            throw error;
        }
    }
}
