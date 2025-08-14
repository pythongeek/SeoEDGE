import { runInitialParse } from '../../services/jobs/parser';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  // This endpoint could be called from another backend service,
  // but we'll protect it just in case.
  if (!isAuthorized(request)) {
    return response.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  const { jobId } = request.body;

  if (!jobId) {
    return response.status(400).json({ message: 'Missing required field: jobId.' });
  }

  try {
    // Run the job in the background
    runInitialParse(jobId).catch(error => {
        console.error(`[Background Initial Parse Job] Error for job ${jobId}:`, error);
    });

    return response.status(202).json({
      message: 'Initial parsing job accepted and is running in the background.',
    });

  } catch (error: any) {
    console.error('Failed to start initial parse job:', error);
    return response.status(500).json({ message: 'Failed to start initial parse job.', error: error.message });
  }
}
