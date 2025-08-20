import { google } from 'googleapis';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// --- Configuration & Initialization ---

// Securely load Google Cloud service account credentials from environment variables.
const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
if (!serviceAccountBase64) {
    console.error('FATAL: FIREBASE_ADMIN_SDK_JSON_BASE64 environment variable not set.');
    process.exit(1);
}

let serviceAccount: ServiceAccount;
try {
    // The JSON object from base64 needs to be cast to any to satisfy fromJSON
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
// FIX: Use the main 'googleapis' package for robust authentication.
const auth = google.auth.fromJSON(serviceAccount as any);
auth.scopes = ['https://www.googleapis.com/auth/webmasters.readonly'];

const gscClient = google.searchconsole({
    version: 'v1',
    auth,
});

// --- Type Definitions ---

// Get the specific type for a row from the googleapis library itself.
type GscApiRow = google.searchconsole_v1.Schema$ApiDataRow;
type SearchConsoleApiClient = google.searchconsole_v1.Searchconsole;


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
 */
export async function ingestGSCData(
    siteUrl: string,
    startDate: string,
    endDate: string
): Promise<{ success: boolean; totalRowsWritten: number }> {
    console.log(`[ingestGSCData] Starting GSC data ingestion for ${siteUrl} from ${startDate} to ${endDate}.`);
    let totalRowsWritten = 0;

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
        }
    }

    console.log(`[ingestGSCData] Ingestion finished. Total rows written: ${totalRowsWritten}.`);
    return { success: true, totalRowsWritten };
}

/**
 * Data Fetching Function (fetchGSCDataForDate).
 */
export async function fetchGSCDataForDate(
    gscClient: SearchConsoleApiClient,
    siteUrl: string,
    date: string
): Promise<GscApiRow[]> {
    const allRows: GscApiRow[] = [];
    let startRow = 0;
    const rowLimit = 25000;
    let hasMore = true;
    let attempt = 0;
    const maxRetries = 5;
    const initialDelay = 1000;

    console.log(`[fetchGSCDataForDate] Fetching data for ${siteUrl} on ${date}.`);

    while (hasMore) {
        try {
            const request: google.searchconsole_v1.Params$Resource$Searchanalytics$Query = {
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
            attempt = 0;
        } catch (error: any) {
            console.error(`[fetchGSCDataForDate] API Error on attempt ${attempt + 1}.`, error.message);
            if (attempt < maxRetries) {
                attempt++;
                const delay = Math.pow(2, attempt) * initialDelay + Math.random() * 1000;
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
 */
export function normalizeRow(rawRow: GscApiRow, siteUrl: string, date: string): GscFirestoreDoc {
    const [
        page,
        query,
        device,
        country,
        searchAppearance
    ] = rawRow.keys || [];

    const finalPage = page || '';
    let normalizedUrl = finalPage;
    try {
        const url = new URL(finalPage);
        url.searchParams.forEach((_, key) => {
            if (key.toLowerCase().startsWith('utm_')) {
                url.searchParams.delete(key);
            }
        });
        let path = url.pathname;
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        normalizedUrl = `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;
    } catch (e) {
        if (finalPage) console.warn(`[normalizeRow] Could not parse URL: '${finalPage}'. Using as is.`);
        normalizedUrl = finalPage || 'INVALID_URL';
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
        device: device || 'UNKNOWN',
        country: (country || 'zzz').toUpperCase(),
        searchAppearance: searchAppearance || 'NONE',
        ingestedAt: FieldValue.serverTimestamp(),
    };
}


/**
 * Data Loading Function (writeToFirestoreInBatches).
 */
export async function writeToFirestoreInBatches(
    db: FirebaseFirestore.Firestore,
    collectionPath: string,
    documents: GscFirestoreDoc[]
): Promise<void> {
    const batchSize = 500;
    console.log(`[writeToFirestoreInBatches] Writing ${documents.length} documents to '${collectionPath}' in batches of ${batchSize}.`);

    for (let i = 0; i < documents.length; i += batchSize) {
        const chunk = documents.slice(i, i + batchSize);
        const batch = db.batch();
        chunk.forEach(doc => {
            const docRef = db.collection(collectionPath).doc();
            batch.set(docRef, doc);
        });
        try {
            await batch.commit();
            console.log(`[writeToFirestoreInBatches] Committed a batch of ${chunk.length} documents.`);
        } catch (error) {
            console.error(`[writeToFirestoreInBatches] Error committing batch.`, error);
            throw error;
        }
    }
}
