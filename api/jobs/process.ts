import { runFinalProcessing } from '../../services/jobs/parser'; // This function will be created in the next step
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ColumnMapping } from '../../types';

function isAuthorized(request: VercelRequest): boolean {
  const sharedSecret = process.env.ADMIN_SHARED_SECRET;
  const requestSecret = request.headers['x-admin-secret'];

  if (!sharedSecret) {
    return false;
  }
  return sharedSecret === requestSecret;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // This endpoint could be called from the frontend, so we should protect it.
  // In a real app with user accounts, we'd check the user's session here.
  if (!isAuthorized(request)) {
    return response.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  const { jobId, confirmedSchema } = request.body as { jobId: string; confirmedSchema: ColumnMapping[] };

  if (!jobId || !confirmedSchema) {
    return response.status(400).json({ message: 'Missing required fields: jobId and confirmedSchema.' });
  }

  try {
    // Run the final processing job in the background
    runFinalProcessing(jobId, confirmedSchema).catch(error => {
        console.error(`[Background Final Processing Job] Error for job ${jobId}:`, error);
    });

    return response.status(202).json({
      message: 'Final processing job accepted and is running in the background.',
    });

  } catch (error: any) {
    console.error('Failed to start final processing job:', error);
    return response.status(500).json({ message: 'Failed to start final processing job.', error: error.message });
  }
}
