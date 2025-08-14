import { runTrafficDeclineDiagnosis } from '../../services/jobs/traffic-analyzer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a simplified authorization check. In a real-world app,
// you would use a more robust authentication/authorization system.
function isAuthorized(request: VercelRequest): boolean {
  const sharedSecret = process.env.ADMIN_SHARED_SECRET;
  const requestSecret = request.headers['x-admin-secret'];

  if (!sharedSecret) {
    console.warn("ADMIN_SHARED_SECRET is not configured. Denying all requests for this endpoint.");
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

  if (!isAuthorized(request)) {
    return response.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  const { coreUpdateDate, comparisonWindow } = request.body;

  if (!coreUpdateDate || !comparisonWindow) {
    return response.status(400).json({
      message: 'Missing required fields. Please provide coreUpdateDate and comparisonWindow.',
    });
  }

  try {
    // Don't await the diagnosis. It can be a long-running process.
    // Acknowledge the request immediately and let the job run in the background.
    runTrafficDeclineDiagnosis(coreUpdateDate, comparisonWindow).catch(error => {
        // Log any errors from the background job for debugging.
        console.error(`[Background Diagnosis Job] Error for date ${coreUpdateDate}:`, error);
    });

    // Return a 202 Accepted response to indicate the request has been received
    // and is being processed asynchronously.
    return response.status(202).json({
      message: 'Diagnosis job accepted and is running in the background.',
      details: `The analysis for the date ${coreUpdateDate} with a ${comparisonWindow}-day window has started. Results will be available in Firestore shortly.`,
    });

  } catch (error: any) {
    console.error('Failed to start diagnosis job:', error);
    return response.status(500).json({ message: 'Failed to start diagnosis job.', error: error.message });
  }
}
