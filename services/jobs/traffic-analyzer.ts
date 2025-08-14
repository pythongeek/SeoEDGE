import { firestore } from '../firebase';
import type { GscRawData, TrafficDeclineDiagnosis, AffectedPage, TrafficDeclineSummary } from '../../types';

const GSC_RAW_COLLECTION = 'gsc_raw';
const DIAGNOSTICS_COLLECTION = 'traffic_diagnostics';

interface PerformanceMetrics {
  clicks: number;
  impressions: number;
  // Position is not in GscRawData, so we remove it from the analysis for now.
  // We can add it back if the type is updated.
  count: number;
}

/**
 * Fetches GSC data for a specific date range.
 * @param startDate The start date of the period.
 * @param endDate The end date of the period.
 * @returns A map of page URLs to their performance metrics.
 */
async function getPerformanceData(startDate: string, endDate: string): Promise<Map<string, PerformanceMetrics>> {
  const snapshot = await firestore.collection(GSC_RAW_COLLECTION)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();

  const performanceMap = new Map<string, PerformanceMetrics>();

  snapshot.docs.forEach(doc => {
    const data = doc.data() as GscRawData;
    // Corrected property: 'url' instead of 'page'. It can be optional.
    const pageUrl = data.url;
    if (!pageUrl) return; // Skip rows without a URL

    const current = performanceMap.get(pageUrl) || { clicks: 0, impressions: 0, count: 0 };

    current.clicks += data.clicks || 0;
    current.impressions += data.impressions || 0;
    current.count += 1;

    performanceMap.set(pageUrl, current);
  });

  return performanceMap;
}

/**
 * Analyzes the performance data to find the cause of traffic decline.
 * @param before The performance metrics from the 'before' period.
 * @param after The performance metrics from the 'after' period.
 * @returns An object containing the cause and details of the decline.
 */
function diagnoseDecline(before: PerformanceMetrics, after: PerformanceMetrics) {
  const impressionLoss = before.impressions - after.impressions;
  const clickLoss = before.clicks - after.clicks;

  const beforeCtr = before.impressions > 0 ? before.clicks / before.impressions : 0;
  const afterCtr = after.impressions > 0 ? after.clicks / after.impressions : 0;
  const ctrChange = afterCtr - beforeCtr;

  // Determine the primary cause of the decline based on the allowed types
  let primaryCause: AffectedPage['causeCategory'];

  if (beforeCtr > 0 && (ctrChange / beforeCtr) < -0.20) {
      primaryCause = 'CTR Drop';
  } else {
      // Corrected: Map "Impression Loss" to the allowed "Ranking Loss" category
      primaryCause = 'Ranking Loss';
  }

  return { impressionLoss, clickLoss, ctrChange, primaryCause };
}

/**
 * Main function to run the traffic decline diagnosis.
 * @param coreUpdateDate The central date for the analysis (e.g., a Google update).
 * @param comparisonWindow The number of days to compare before and after the date.
 */
export async function runTrafficDeclineDiagnosis(coreUpdateDate: string, comparisonWindow: number): Promise<TrafficDeclineDiagnosis> {
  console.log(`Running Traffic Decline Diagnosis around ${coreUpdateDate} with a ${comparisonWindow}-day window.`);

  const updateDate = new Date(coreUpdateDate);

  const beforeEndDate = new Date(updateDate);
  beforeEndDate.setDate(updateDate.getDate() - 1);
  const beforeStartDate = new Date(beforeEndDate);
  beforeStartDate.setDate(beforeEndDate.getDate() - (comparisonWindow - 1));

  const afterStartDate = new Date(updateDate);
  const afterEndDate = new Date(afterStartDate);
  afterEndDate.setDate(afterStartDate.getDate() + (comparisonWindow - 1));

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const preUpdatePeriod = { start: formatDate(beforeStartDate), end: formatDate(beforeEndDate) };
  const postUpdatePeriod = { start: formatDate(afterStartDate), end: formatDate(afterEndDate) };

  const [beforeData, afterData] = await Promise.all([
    getPerformanceData(preUpdatePeriod.start, preUpdatePeriod.end),
    getPerformanceData(postUpdatePeriod.start, postUpdatePeriod.end)
  ]);

  const affectedPages: AffectedPage[] = [];
  let totalImpressionsChange = 0;
  let totalClicksChange = 0;

  for (const [page, beforeMetrics] of beforeData.entries()) {
    const afterMetrics = afterData.get(page) || { clicks: 0, impressions: 0, count: 0 };

    totalImpressionsChange += (afterMetrics.impressions - beforeMetrics.impressions);
    totalClicksChange += (afterMetrics.clicks - beforeMetrics.clicks);

    const impressionChangePercent = beforeMetrics.impressions > 0 ? (afterMetrics.impressions - beforeMetrics.impressions) / beforeMetrics.impressions : 0;

    if (impressionChangePercent < -0.10 && beforeMetrics.impressions > 1000) {
      // Corrected: Removed `positionChange`
      const { impressionLoss, clickLoss, ctrChange, primaryCause } = diagnoseDecline(beforeMetrics, afterMetrics);

      const priorityScore = Math.abs(impressionLoss) * Math.abs(impressionChangePercent) / 1000;

      // Corrected: Create an object that matches the `AffectedPage` type
      affectedPages.push({
        url: page,
        impressionLoss,
        clickLoss,
        ctrChange,
        causeCategory: primaryCause,
        priorityScore: Math.round(priorityScore),
      });
    }
  }

  affectedPages.sort((a, b) => b.priorityScore - a.priorityScore);

  const beforeTotalImpressions = Array.from(beforeData.values()).reduce((sum, m) => sum + m.impressions, 0);
  const afterTotalImpressions = Array.from(afterData.values()).reduce((sum, m) => sum + m.impressions, 0);
  const beforeTotalClicks = Array.from(beforeData.values()).reduce((sum, m) => sum + m.clicks, 0);
  const afterTotalClicks = Array.from(afterData.values()).reduce((sum, m) => sum + m.clicks, 0);
  const beforeTotalCtr = beforeTotalImpressions > 0 ? beforeTotalClicks / beforeTotalImpressions : 0;
  const afterTotalCtr = afterTotalImpressions > 0 ? afterTotalClicks / afterTotalImpressions : 0;

  // Corrected: Create a summary object that matches the `TrafficDeclineSummary` type
  const summary: TrafficDeclineSummary = {
      impressionsChange: totalImpressionsChange,
      clicksChange: totalClicksChange,
      ctrChange: afterTotalCtr - beforeTotalCtr,
      preUpdatePeriod,
      postUpdatePeriod,
  };

  const diagnosisResult: TrafficDeclineDiagnosis = {
    summary,
    affectedPages: affectedPages.slice(0, 50),
  };

  // Corrected: Create the ID separately and do not add it to the diagnosis object itself.
  const diagnosisId = `diag_${coreUpdateDate}_${comparisonWindow}`;
  await firestore.collection(DIAGNOSTICS_COLLECTION).doc(diagnosisId).set(diagnosisResult);

  console.log(`Diagnosis complete. Found ${affectedPages.length} affected pages. Results saved to Firestore.`);
  return diagnosisResult;
}
