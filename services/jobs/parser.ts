import { firestore } from '../firebase';
import { head } from '@vercel/blob';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ImportJob, ColumnMapping } from '../../types';

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
  } else if (fileType === 'xlsx') {
    const workbook = XLSX.read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sample = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 'A1:Z6' });
    const headers = (sample[0] as string[]) || [];
    const dataAsObjects = XLSX.utils.sheet_to_json(worksheet).slice(0, 5);
    return { headers, sample: dataAsObjects as Record<string, any>[] };
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
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
