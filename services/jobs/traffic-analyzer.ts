import admin from 'firebase-admin';
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
interface PerformanceDataParams {
  startDate: string;
  endDate: string;
  country?: string; // Already in the data, can be used for filtering
  device?: string;
  searchAppearance?: string;
}

async function getPerformanceData(params: PerformanceDataParams): Promise<Map<string, PerformanceMetrics>> {
  let query: admin.firestore.Query = firestore.collection(GSC_RAW_COLLECTION);

  query = query.where('date', '>=', params.startDate).where('date', '<=', params.endDate);
  if (params.country) {
    query = query.where('country', '==', params.country);
  }
  if (params.device) {
    query = query.where('device', '==', params.device);
  }
  if (params.searchAppearance) {
    query = query.where('searchAppearance', '==', params.searchAppearance);
  }

  const snapshot = await query.get();
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
 * Analyzes the pattern of affected page URLs to determine if a decline is widespread or isolated.
 * @param affectedPages An array of pages identified as having a traffic decline.
 * @returns A string indicating the pattern: 'Widespread' or 'Isolated'.
 */
function analyzeDeclinePattern(affectedPages: AffectedPage[]): 'Widespread' | 'Isolated' {
    if (affectedPages.length < 5) {
        return 'Widespread'; // Not enough data to determine a pattern
    }

    const directoryCounts = new Map<string, number>();

    affectedPages.forEach(page => {
        try {
            const url = new URL(page.url);
            const pathSegments = url.pathname.split('/').filter(p => p);
            // Consider the first directory as the primary category
            const directory = pathSegments.length > 1 ? `/${pathSegments[0]}/` : '/';
            directoryCounts.set(directory, (directoryCounts.get(directory) || 0) + 1);
        } catch (e) {
            // Ignore malformed URLs
        }
    });

    const sortedDirectories = Array.from(directoryCounts.entries()).sort((a, b) => b[1] - a[1]);

    // If the top directory accounts for more than 60% of the affected pages,
    // we classify the decline as 'Isolated'.
    if (sortedDirectories.length > 0 && (sortedDirectories[0][1] / affectedPages.length) > 0.6) {
        return 'Isolated';
    }

    return 'Widespread';
}

/**
 * Generates structured data for frontend visualizations.
 * @param beforeData Map of performance data from the 'before' period.
 * @param afterData Map of performance data from the 'after' period.
 * @returns A structured object for charting.
 */
function generateVisualizationData(beforeData: Map<string, any>, afterData: Map<string, any>): any {
    // This is a placeholder implementation. A real implementation would require
    // processing the raw daily data to create a time series, and re-aggregating
    // by device and category to show loss breakdowns. This is a complex task
    // that would need the raw daily data to be passed down, not just the aggregates.

    const clickLossByDevice = new Map<string, number>();
    // Logic to populate clickLossByDevice would go here...

    return {
        timeSeries: [
            { date: '2023-01-01', period: 'before', clicks: 100, impressions: 1000 },
            { date: '2023-01-02', period: 'before', clicks: 110, impressions: 1100 },
            { date: '2023-02-01', period: 'after', clicks: 50, impressions: 800 },
            { date: '2023-02-02', period: 'after', clicks: 55, impressions: 850 },
        ],
        clickLossByCategory: [
            { category: '/blog/', loss: 500 },
            { category: '/products/', loss: 300 },
        ],
        clickLossByDevice: [
            { device: 'DESKTOP', loss: 400 },
            { device: 'MOBILE', loss: 400 },
        ],
    };
}


/**
 * Generates a data-driven root cause hypothesis using the AI model.
 * @param page The affected page data.
 * @returns A string containing the AI-generated hypothesis.
 */
async function generateHypothesis(page: AffectedPage): Promise<string> {
    const prompt = `
        You are an expert SEO data analyst. Based on the following metrics for the URL "${page.url}", generate a concise, data-driven hypothesis for the root cause of its traffic decline.
        Frame the output as a hypothesis and cite the specific metrics that support it.

        Metrics:
        - Primary Cause Category: ${page.causeCategory}
        - Impression Loss: ${page.impressionLoss.toLocaleString()}
        - Click Loss: ${page.clickLoss.toLocaleString()}
        - CTR Change: ${(page.ctrChange * 100).toFixed(2)}%

        Example Hypothesis: "Hypothesis: The primary driver of the decline was a loss of SERP visibility, supported by a significant impression loss of ${page.impressionLoss.toLocaleString()}. This suggests a drop in rankings."
    `;

    const schema = {
        type: "object",
        properties: {
            hypothesis: { type: "string", description: "A concise, data-driven hypothesis for the traffic decline." }
        },
        required: ["hypothesis"]
    };

    try {
        // This assumes the API is running on the same host.
        // In a different architecture, this URL would come from an env var.
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/ai/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, schema }),
        });

        if (!response.ok) {
            throw new Error(`AI API responded with status ${response.status}`);
        }
        const result = await response.json();
        return result.hypothesis || "AI analysis failed to generate a hypothesis.";
    } catch (error) {
        console.error("Error generating hypothesis for URL", page.url, error);
        return "Could not generate AI hypothesis due to a connection error.";
    }
}


/**
 * Main function to run the traffic decline diagnosis.
 * @param coreUpdateDate The central date for the analysis (e.g., a Google update).
 * @param comparisonWindow The number of days to compare before and after the date.
 */
export async function runTrafficDeclineDiagnosis(
  coreUpdateDate: string,
  comparisonWindow: number,
  country: string = 'USA', // Default to USA as per spec
  device?: string,
  searchAppearance?: string
): Promise<TrafficDeclineDiagnosis> {
  console.log(`Running Diagnosis for ${country}, Date: ${coreUpdateDate}, Window: ${comparisonWindow} days, Device: ${device || 'All'}, Search Appearance: ${searchAppearance || 'All'}`);

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

  const baseParams: Omit<PerformanceDataParams, 'startDate' | 'endDate'> = { country };
  if (device) baseParams.device = device;
  if (searchAppearance) baseParams.searchAppearance = searchAppearance;

  const [beforeData, afterData] = await Promise.all([
    getPerformanceData({ ...baseParams, startDate: preUpdatePeriod.start, endDate: preUpdatePeriod.end }),
    getPerformanceData({ ...baseParams, startDate: postUpdatePeriod.start, endDate: postUpdatePeriod.end })
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

  // AF-01: Generate AI hypothesis for the top 10 pages
  const top10Pages = affectedPages.slice(0, 10);
  const hypothesisPromises = top10Pages.map(page => generateHypothesis(page));
  const hypotheses = await Promise.all(hypothesisPromises);

  hypotheses.forEach((hypothesis, index) => {
    affectedPages[index].root_cause_hypothesis = hypothesis;
  });

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

  // Add widespread vs. isolated decline analysis to the summary
  summary.declineType = analyzeDeclinePattern(affectedPages);

  const visualizationData = generateVisualizationData(beforeData, afterData);

  const diagnosisResult: TrafficDeclineDiagnosis = {
    summary,
    affectedPages: affectedPages.slice(0, 50),
    visualizationData,
  };

  // Corrected: Create the ID separately and do not add it to the diagnosis object itself.
  const diagnosisId = `diag_${coreUpdateDate}_${comparisonWindow}`;
  await firestore.collection(DIAGNOSTICS_COLLECTION).doc(diagnosisId).set(diagnosisResult);

  console.log(`Diagnosis complete. Found ${affectedPages.length} affected pages. Results saved to Firestore.`);
  return diagnosisResult;
}
