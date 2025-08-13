import { google } from 'googleapis';
import { firestore } from '../firebase';
import { normalizeUrl } from './url-normalizer';

const searchconsole = google.searchconsole('v1');
const GSC_RAW_COLLECTION = 'gsc_raw';
const FIRESTORE_BATCH_SIZE = 450; // Firestore limit is 500 writes per batch

/**
 * Sets up the Google API client with authentication.
 * @returns An authenticated Google API client.
 */
function getAuthenticatedClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!serviceAccountJson) {
    throw new Error('The GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 environment variable is not set.');
  }

  const decodedServiceAccount = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
  const credentials = JSON.parse(decodedServiceAccount);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  google.options({ auth });
  return google;
}

/**
 * Pauses execution for a specified duration.
 * @param ms The number of milliseconds to wait.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from the GSC API with exponential backoff for retries.
 * @param siteUrl The URL of the site to fetch data for.
 *@param requestBody The body of the GSC API request.
 * @param startRow The starting row for pagination.
 * @param attempts The number of attempts made so far.
 * @returns The API response.
 */
async function fetchWithRetry(
    siteUrl: string,
    requestBody: any,
    startRow: number,
    attempts: number = 0
): Promise<any> {
  try {
    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { ...requestBody, startRow },
    });
    return response;
  } catch (error: any) {
    if (attempts < 5 && (error.code === 429 || error.code >= 500)) {
      const waitTime = (2 ** attempts) * 1000 + Math.random() * 1000;
      console.warn(`API error (code: ${error.code}). Retrying in ${Math.round(waitTime / 1000)}s...`);
      await delay(waitTime);
      return fetchWithRetry(siteUrl, requestBody, startRow, attempts + 1);
    }
    console.error(`GSC API request failed after ${attempts} attempts. Error: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches GSC data for a given site and date range and stores it in Firestore.
 * @param siteUrl The URL of the site to process.
 * @param startDate The start date in YYYY-MM-DD format.
 * @param endDate The end date in YYYY-MM-DD format.
 */
export async function fetchAndStoreGscData(siteUrl: string, startDate: string, endDate: string) {
  console.log(`Starting GSC data ingestion for ${siteUrl} from ${startDate} to ${endDate}...`);
  getAuthenticatedClient();

  let startRow = 0;
  let totalRowsFetched = 0;
  let hasMoreData = true;

  const requestBody = {
    startDate,
    endDate,
    dimensions: ['date', 'query', 'page', 'device', 'country', 'searchAppearance'],
    type: 'web',
    rowLimit: 25000, // Max rows per request
    dataState: 'all',
  };

  let batch = firestore.batch();
  let itemsInBatch = 0;

  while (hasMoreData) {
    console.log(`Fetching data starting from row ${startRow}...`);
    const res = await fetchWithRetry(siteUrl, requestBody, startRow);

    const rows = res.data.rows;
    if (!rows || rows.length === 0) {
      hasMoreData = false;
      continue;
    }

    totalRowsFetched += rows.length;

    for (const row of rows) {
      const [date, query, page, device, country, searchAppearance] = row.keys;
      const normalizedPage = normalizeUrl(page);

      // Create a unique ID based on the dimensions to prevent duplicates
      const docId = `${date}-${country}-${device}-${searchAppearance || 'none'}-${Buffer.from(normalizedPage).toString('base64')}-${Buffer.from(query).toString('base64')}`;

      const docRef = firestore.collection(GSC_RAW_COLLECTION).doc(docId);

      const data = {
        siteUrl,
        date,
        query,
        page: normalizedPage,
        device,
        country,
        searchAppearance: searchAppearance || null,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        updatedAt: new Date().toISOString(),
      };

      batch.set(docRef, data, { merge: true });
      itemsInBatch++;

      if (itemsInBatch >= FIRESTORE_BATCH_SIZE) {
        console.log(`Committing batch of ${itemsInBatch} documents to Firestore...`);
        await batch.commit();
        batch = firestore.batch();
        itemsInBatch = 0;
      }
    }

    if (rows.length < requestBody.rowLimit) {
      hasMoreData = false;
    } else {
      startRow += rows.length;
    }
  }

  if (itemsInBatch > 0) {
    console.log(`Committing final batch of ${itemsInBatch} documents.`);
    await batch.commit();
  }

  console.log('--------------------------------------------------');
  console.log(`GSC data ingestion complete for ${siteUrl}.`);
  console.log(`Total rows fetched: ${totalRowsFetched}`);
  console.log('--------------------------------------------------');
}
