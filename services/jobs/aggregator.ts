import { firestore } from '../firebase';
import type { GscRawData } from '../../types';

const GSC_RAW_COLLECTION = 'gsc_raw';
const ANALYTICS_AGG_COLLECTION = 'analytics_agg';

interface AggregatedMetrics {
  clicks: number;
  impressions: number;
  // Position is not suitable for simple aggregation, so we omit it.
  // A more complex calculation would be needed, like weighted average.
}

/**
 * Calculates the date string for the previous day in YYYY-MM-DD format.
 */
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Runs the daily aggregation job.
 * - Reads all raw GSC data for the previous day.
 * - Aggregates metrics by site|country|device and by page.
 * - Writes the aggregated results to a new daily collection in Firestore.
 * @param date The date to process in YYYY-MM-DD format. Defaults to yesterday.
 */
export async function runDailyAggregation(date: string = getYesterdayDateString()) {
  console.log(`Starting daily aggregation for date: ${date}`);

  const snapshot = await firestore.collection(GSC_RAW_COLLECTION)
    .where('date', '==', date)
    .get();

  if (snapshot.empty) {
    console.log(`No raw data found for ${date}. Aggregation skipped.`);
    return;
  }

  const siteAggregates = new Map<string, AggregatedMetrics>();
  const pageAggregates = new Map<string, AggregatedMetrics>();

  console.log(`Processing ${snapshot.size} raw documents...`);

  snapshot.forEach(doc => {
    const data = doc.data() as GscRawData;
    const { siteUrl, country, device, url: pageUrl, clicks = 0, impressions = 0 } = data;

    if (!siteUrl || !country || !device || !pageUrl) {
      return; // Skip records with missing key dimensions
    }

    // R4: Produce daily aggregated metrics for site|country|device
    const siteAggKey = `${siteUrl}|${country}|${device}`;
    const currentSiteAgg = siteAggregates.get(siteAggKey) || { clicks: 0, impressions: 0 };
    currentSiteAgg.clicks += clicks;
    currentSiteAgg.impressions += impressions;
    siteAggregates.set(siteAggKey, currentSiteAgg);

    // R5: Produce page-level aggregates for each canonical URL
    // As per plan, we assume the normalized URL from ingestion is the canonical URL.
    const currentPageAgg = pageAggregates.get(pageUrl) || { clicks: 0, impressions: 0 };
    currentPageAgg.clicks += clicks;
    currentPageAgg.impressions += impressions;
    pageAggregates.set(pageUrl, currentPageAgg);
  });

  // R6: Write the aggregated data to a new daily subcollection
  const dailyCollectionId = `daily_${date.replace(/-/g, '')}`;
  const dailyAggCollection = firestore.collection(ANALYTICS_AGG_COLLECTION).doc(dailyCollectionId).collection('results');

  const batch = firestore.batch();
  let batchCounter = 0;

  console.log('Writing site-level aggregates...');
  for (const [key, metrics] of siteAggregates.entries()) {
    const [siteUrl, country, device] = key.split('|');
    const docRef = dailyAggCollection.doc(`site_${siteUrl}_${country}_${device}`);
    batch.set(docRef, { type: 'site_summary', siteUrl, country, device, ...metrics });
    batchCounter++;
  }

  console.log('Writing page-level aggregates...');
  for (const [pageUrl, metrics] of pageAggregates.entries()) {
    // Using a hash of the URL for a cleaner document ID
    const docId = `page_${Buffer.from(pageUrl).toString('base64')}`;
    const docRef = dailyAggCollection.doc(docId);
    batch.set(docRef, { type: 'page_summary', url: pageUrl, ...metrics });
    batchCounter++;
  }

  if (batchCounter > 0) {
    await batch.commit();
    console.log(`Successfully wrote ${batchCounter} aggregated documents to '${ANALYTICS_AGG_COLLECTION}/${dailyCollectionId}/results'.`);
  } else {
    console.log('No aggregated documents to write.');
  }

  console.log(`Daily aggregation for ${date} complete.`);
}
