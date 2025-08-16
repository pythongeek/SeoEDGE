import { runDailyAggregation } from '../../services/jobs/aggregator.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { date } = request.body; // Optional date parameter

  // Validate date format if provided
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return response.status(400).json({
      message: 'Invalid date format. Please use YYYY-MM-DD or omit to process yesterday.',
    });
  }

  try {
    // Run the job in the background
    runDailyAggregation(date).catch(error => {
        console.error(`[Background Aggregation Job] Error for date ${date || 'yesterday'}:`, error);
    });

    const jobDate = date || 'yesterday';
    return response.status(202).json({
      message: 'Aggregation job accepted and is running in the background.',
      details: `Processing data for ${jobDate}.`,
    });

  } catch (error: any) {
    console.error('Failed to start aggregation job:', error);
    return response.status(500).json({ message: 'Failed to start aggregation job.', error: error.message });
  }
}
