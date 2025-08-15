import { firestore } from '../firebase';
import { head } from '@vercel/blob';
import { put as vercelPut } from '@vercel/blob';
import Papa from 'papaparse';
import crypto from 'crypto';
import type { ImportJob, ColumnMapping, GscRawData } from '../../types';
import { normalizeUrl } from '../ingestion/url-normalizer';

const JOBS_COLLECTION = 'importJobs';

// --- Schema Detection Logic ---

// Pre-defined target fields in our master schema
const TARGET_SCHEMA_FIELDS = [
  'date', 'query', 'url', 'impressions', 'clicks', 'ctr', 'position', 'sessions', 'users', 'bounceRate'
];

// Keywords to help identify a column's content
const SCHEMA_KEYWORDS: { [key: string]: string[] } = {
  date: ['date', 'day'],
  query: ['query', 'keyword', 'search term'],
  url: ['url', 'page', 'landing page'],
  impressions: ['impressions', 'imps'],
  clicks: ['clicks'],
  ctr: ['ctr', 'click-through rate'],
  position: ['position', 'rank', 'ranking'],
  sessions: ['sessions', 'visits'],
  users: ['users', 'visitors'],
  bounceRate: ['bounce rate'],
};

/**
 * Heuristically detects the schema of a file based on its headers.
 * @param headers An array of header strings from the file.
 * @returns An array of ColumnMapping objects with detected fields and confidence.
 */
function detectSchema(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();

  headers.forEach(header => {
    const normalizedHeader = header.toLowerCase().trim();
    let bestMatch: string | null = null;
    let highestConfidence = 0;

    for (const field of TARGET_SCHEMA_FIELDS) {
      if (usedFields.has(field)) continue; // Don't map to an already used field

      const keywords = SCHEMA_KEYWORDS[field];
      if (keywords.includes(normalizedHeader)) {
        bestMatch = field;
        highestConfidence = 1.0;
        break;
      }
      for (const keyword of keywords) {
        if (normalizedHeader.includes(keyword) && highestConfidence < 0.8) {
          bestMatch = field;
          highestConfidence = 0.8;
        }
      }
    }

    if (bestMatch) {
      usedFields.add(bestMatch);
    }

    mappings.push({
      header: header,
      targetField: bestMatch,
      confidence: highestConfidence,
    });
  });

  return mappings;
}

// --- File Parsing Logic ---

async function fetchFileContent(fileUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.arrayBuffer();
}

function parseFileSample(fileContent: ArrayBuffer, filename: string): { headers: string[], sample: Record<string, any>[] } {
  const fileType = filename.split('.').pop()?.toLowerCase();

  if (fileType === 'csv' || fileType === 'txt') {
    const text = new TextDecoder().decode(fileContent);
    const result = Papa.parse(text, { header: true, preview: 5, skipEmptyLines: true });
    return { headers: result.meta.fields || [], sample: result.data as Record<string, any>[] };
  } else {
    throw new Error(`Unsupported file type: ${fileType}. Please upload a CSV or TXT file for now.`);
  }
}

// --- Main Service Function ---

export async function runInitialParse(jobId: string) {
  const jobRef = firestore.collection(JOBS_COLLECTION).doc(jobId);

  try {
    await jobRef.update({ status: 'parsing', updatedAt: new Date().toISOString() });

    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) throw new Error(`Job ${jobId} not found.`);
    const jobData = jobDoc.data() as ImportJob;

    await head(jobData.fileUrl);

    const fileContent = await fetchFileContent(jobData.fileUrl);

    const { headers, sample } = parseFileSample(fileContent, jobData.filename);
    if (headers.length === 0) {
      throw new Error("Could not parse headers from the file.");
    }

    const detectedSchema = detectSchema(headers);

    await jobRef.update({
      status: 'validating',
      updatedAt: new Date().toISOString(),
      detectedSchema: detectedSchema,
      sampleData: sample,
    });

    console.log(`Job ${jobId} parsed successfully. Schema detected, awaiting user validation.`);

  } catch (error: any) {
    console.error(`Failed to process job ${jobId}:`, error);
    await jobRef.update({
      status: 'failed',
      error: error.message,
      updatedAt: new Date().toISOString(),
    });
  }
}


// --- Final Processing Logic ---

const GSC_RAW_COLLECTION = 'gsc_raw';
const FIRESTORE_BATCH_SIZE = 450;

/**
 * Normalizes and validates a single row of data based on the confirmed schema.
 * @param row A single row object from the parsed file.
 * @param confirmedSchema The user-confirmed column mapping.
 * @returns A normalized GscRawData object or null if validation fails.
 */
function normalizeAndValidateRow(row: Record<string, any>, confirmedSchema: ColumnMapping[]): Partial<GscRawData> | null {
    const normalizedData: Partial<GscRawData> = {};
    let hasError = false;

    confirmedSchema.forEach(mapping => {
        if (!mapping.targetField) return; // Ignore columns the user skipped

        const rawValue = row[mapping.header];

        switch (mapping.targetField) {
            case 'date':
                const date = new Date(rawValue);
                if (isNaN(date.getTime())) { hasError = true; }
                else { normalizedData.date = date.toISOString().split('T')[0]; }
                break;
            case 'url':
                normalizedData.url = normalizeUrl(String(rawValue));
                break;
            case 'impressions':
            case 'clicks':
            case 'position':
                const num = Number(String(rawValue).replace(/,/g, ''));
                if (isNaN(num)) { hasError = true; }
                else { normalizedData[mapping.targetField] = num; }
                break;
            case 'ctr':
                // CTR is often a percentage string, e.g., "5.5%"
                const ctrStr = String(rawValue).replace('%', '').trim();
                const ctrNum = Number(ctrStr);
                if (isNaN(ctrNum)) { hasError = true; }
                else { normalizedData.ctr = ctrNum / 100; } // Store as a decimal
                break;
            case 'query':
            case 'siteUrl':
            case 'country':
            case 'device':
            case 'searchAppearance':
                normalizedData[mapping.targetField] = String(rawValue).trim();
                break;
        }
    });

    // Basic validation: ensure key fields are present
    if (!normalizedData.date || !normalizedData.url || !normalizedData.query) {
        hasError = true;
    }

    return hasError ? null : normalizedData;
}


export async function runFinalProcessing(jobId: string, confirmedSchema: ColumnMapping[]) {
  const jobRef = firestore.collection(JOBS_COLLECTION).doc(jobId);
  await jobRef.update({ status: 'importing', confirmedSchema, updatedAt: new Date().toISOString() });

  const jobDoc = await jobRef.get();
  if (!jobDoc.exists) throw new Error(`Job ${jobId} not found.`);
  const jobData = jobDoc.data() as ImportJob;

  const fileContent = await fetchFileContent(jobData.fileUrl);
  const fileType = jobData.filename.split('.').pop()?.toLowerCase();
  if (fileType !== 'csv' && fileType !== 'txt') {
    throw new Error(`Unsupported file type for final processing: ${fileType}.`);
  }
  const records: Record<string, any>[] = Papa.parse(new TextDecoder().decode(fileContent), { header: true, skipEmptyLines: true }).data as any[];

  let batch = firestore.batch();
  let itemsInBatch = 0;
  const errorRows: any[] = [];
  let importedCount = 0;

  for (const record of records) {
    const normalizedRow = normalizeAndValidateRow(record, confirmedSchema);

    if (normalizedRow) {
        const sourceTag = `upload_${jobId.substring(0, 8)}`;
        const finalData = { ...normalizedRow, source: sourceTag, updatedAt: new Date().toISOString() };

        // Create a unique ID for deduplication
        const keyString = `${finalData.date}-${finalData.url}-${finalData.query}`;
        const docId = crypto.createHash('md5').update(keyString).digest('hex');

        const docRef = firestore.collection(GSC_RAW_COLLECTION).doc(docId);
        batch.set(docRef, finalData, { merge: true }); // Use merge to upsert
        itemsInBatch++;
        importedCount++;
    } else {
        errorRows.push(record);
    }

    if (itemsInBatch >= FIRESTORE_BATCH_SIZE) {
        await batch.commit();
        batch = firestore.batch();
        itemsInBatch = 0;
    }
  }

  if (itemsInBatch > 0) {
    await batch.commit();
  }

  // Final job update
  const summary = {
    totalRows: records.length,
    importedRows: importedCount,
    failedRows: errorRows.length,
  };

  let errorReportUrl: string | undefined = undefined;
  if (errorRows.length > 0) {
    const errorCsv = Papa.unparse(errorRows);
    const errorBlob = await vercelPut(`error_reports/${jobId}-errors.csv`, errorCsv, { access: 'public', contentType: 'text/csv' });
    errorReportUrl = errorBlob.url;
  }

  await jobRef.update({
      status: 'completed',
      updatedAt: new Date().toISOString(),
      summary,
      errorReportUrl,
  });

  console.log(`Final processing complete for job ${jobId}. Imported: ${summary.importedRows}, Failed: ${summary.failedRows}`);
}
