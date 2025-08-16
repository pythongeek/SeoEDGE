import { fetchAndStoreGscData } from '../../services/ingestion/gsc-connector.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// TODO: Implement proper admin role-based authentication.
function isAuthorized(request: VercelRequest): boolean {
  // For now, we can use a simple secret key for protection.
  // In a real app, this would be a session check for an admin user.
  const sharedSecret = process.env.ADMIN_SHARED_SECRET;
  const requestSecret = request.headers['x-admin-secret'];

  if (!sharedSecret) {
    // If no secret is configured, deny access by default for security.
    console.warn("ADMIN_SHARED_SECRET is not configured. Denying all requests.");
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

  // Placeholder for admin-role protection
  if (!isAuthorized(request)) {
    return response.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  const { siteUrl, startDate, endDate } = request.body;

  // Basic input validation
  if (!siteUrl || !startDate || !endDate) {
    return response.status(400).json({
      message: 'Missing required fields. Please provide siteUrl, startDate, and endDate.',
    });
  }

  // Basic date format validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return response.status(400).json({
          message: 'Invalid date format. Please use YYYY-MM-DD.',
      });
  }

  try {
    // Don't await this call. The ingestion can take a long time.
    // Respond immediately to the client that the job has started.
    fetchAndStoreGscData(siteUrl, startDate, endDate).catch(error => {
        // Log errors that happen in the background process.
        console.error(`[Background Ingestion Job] Error for site ${siteUrl}:`, error);
    });

    const jobId = `ingest-${siteUrl}-${new Date().getTime()}`;

    return response.status(200).json({
      message: 'Ingestion job started successfully.',
      jobId: jobId,
    });
  } catch (error: any) {
    console.error('Failed to start ingestion job:', error);
    return response.status(500).json({ message: 'Failed to start ingestion job.', error: error.message });
  }
}
