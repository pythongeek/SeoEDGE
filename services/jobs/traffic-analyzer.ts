import { firestore } from '../firebase';
import type { GscRawData, TrafficDeclineDiagnosis, AffectedPage } from '../../types';

const GSC_RAW_COLLECTION = 'gsc_raw';
const DIAGNOSTICS_COLLECTION = 'traffic_diagnostics';

interface PerformanceMetrics {
  clicks: number;
  impressions: number;
  position: number;
  count: number; // To average position
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
    const page = data.page;

    const current = performanceMap.get(page) || { clicks: 0, impressions: 0, position: 0, count: 0 };

    current.clicks += data.clicks;
    current.impressions += data.impressions;
    current.position += data.position * data.impressions; // Weighted average calculation part 1
    current.count += data.impressions; // Weighted average calculation part 2

    performanceMap.set(page, current);
  });

  // Calculate the final weighted average position
  for (const [page, metrics] of performanceMap.entries()) {
    if (metrics.count > 0) {
      metrics.position = metrics.position / metrics.count;
    }
  }

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
  const positionChange = after.position - before.position;

  const beforeCtr = before.impressions > 0 ? before.clicks / before.impressions : 0;
  const afterCtr = after.impressions > 0 ? after.clicks / after.impressions : 0;
  const ctrChange = afterCtr - beforeCtr;

  // Determine the primary cause of the decline
  let primaryCause: AffectedPage['causeCategory'] = 'Impression Loss';

  // A significant drop in CTR is a strong signal, even if impressions also dropped.
  // We consider a CTR drop significant if it drops by more than 20% relative to the original.
  if (beforeCtr > 0 && (ctrChange / beforeCtr) < -0.20) {
      primaryCause = 'CTR Drop';
  }
  // If CTR is stable or improved, the main issue is loss of visibility (rankings).
  else if (impressionLoss > clickLoss) {
      primaryCause = 'Ranking Loss'; // A more specific type of impression loss
  }

  return { impressionLoss, clickLoss, positionChange, ctrChange, primaryCause };
}

/**
 * Main function to run the traffic decline diagnosis.
 * @param coreUpdateDate The central date for the analysis (e.g., a Google update).
 * @param comparisonWindow The number of days to compare before and after the date.
 */
export async function runTrafficDeclineDiagnosis(coreUpdateDate: string, comparisonWindow: number): Promise<TrafficDeclineDiagnosis> {
  console.log(`Running Traffic Decline Diagnosis around ${coreUpdateDate} with a ${comparisonWindow}-day window.`);

  const updateDate = new Date(coreUpdateDate);

  // Define the 'before' and 'after' periods
  const beforeEndDate = new Date(updateDate);
  beforeEndDate.setDate(updateDate.getDate() - 1);
  const beforeStartDate = new Date(beforeEndDate);
  beforeStartDate.setDate(beforeEndDate.getDate() - (comparisonWindow - 1));

  const afterStartDate = new Date(updateDate);
  const afterEndDate = new Date(afterStartDate);
  afterEndDate.setDate(afterStartDate.getDate() + (comparisonWindow - 1));

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Fetch data for both periods
  const [beforeData, afterData] = await Promise.all([
    getPerformanceData(formatDate(beforeStartDate), formatDate(beforeEndDate)),
    getPerformanceData(formatDate(afterStartDate), formatDate(afterEndDate))
  ]);

  const affectedPages: AffectedPage[] = [];

  // Compare the data for each page present in the 'before' period
  for (const [page, beforeMetrics] of beforeData.entries()) {
    const afterMetrics = afterData.get(page) || { clicks: 0, impressions: 0, position: 0, count: 0 };

    const impressionChange = afterMetrics.impressions - beforeMetrics.impressions;
    const impressionChangePercent = beforeMetrics.impressions > 0 ? impressionChange / beforeMetrics.impressions : 0;

    // Consider a page 'affected' if it lost more than 10% of its impressions and had at least 1000 impressions before.
    if (impressionChangePercent < -0.10 && beforeMetrics.impressions > 1000) {
      const { impressionLoss, clickLoss, positionChange, ctrChange, primaryCause } = diagnoseDecline(beforeMetrics, afterMetrics);

      // Calculate a priority score. Higher is more important.
      // We prioritize pages that had high impressions and lost a large percentage of them.
      const priorityScore = Math.abs(impressionLoss) * Math.abs(impressionChangePercent) / 1000;

      affectedPages.push({
        url: page,
        impressionLoss,
        clickLoss,
        positionChange,
        ctrChange,
        causeCategory: primaryCause,
        priorityScore: Math.round(priorityScore),
      });
    }
  }

  // Sort by the highest priority
  affectedPages.sort((a, b) => b.priorityScore - a.priorityScore);

  const diagnosisResult: TrafficDeclineDiagnosis = {
    id: `diag_${coreUpdateDate}_${comparisonWindow}`,
    coreUpdateDate,
    comparisonWindow,
    createdAt: new Date().toISOString(),
    status: 'completed',
    affectedPages: affectedPages.slice(0, 50), // Limit to top 50 for performance
    summary: {
      totalpagesAnalyzed: beforeData.size,
      affectedPagesCount: affectedPages.length,
    }
  };

  // Save the result to Firestore
  await firestore.collection(DIAGNOSTICS_COLLECTION).doc(diagnosisResult.id).set(diagnosisResult);

  console.log(`Diagnosis complete. Found ${affectedPages.length} affected pages. Results saved to Firestore.`);
  return diagnosisResult;
}
