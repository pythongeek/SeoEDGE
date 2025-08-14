import { put } from '@vercel/blob';
import { firestore } from '../../services/firebase';
import { nanoid } from 'nanoid'; // A small library for generating unique IDs
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ImportJob } from '../../types';

const JOBS_COLLECTION = 'importJobs';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  // We get the filename from a header instead of a query param now.
  // This is a common pattern for file uploads.
  const filename = request.headers['x-vercel-filename'] as string || 'unknown-file';

  if (!request.body) {
    return response.status(400).json({ message: 'No file content provided.' });
  }

  const jobId = nanoid();
  const blobPath = `uploads/${jobId}/${filename}`;

  try {
    // 1. Upload the file to Vercel Blob storage
    const blob = await put(blobPath, request.body, {
      access: 'public', // The file needs to be public for the backend parser to fetch it
    });

    // 2. Create the initial job document in Firestore
    const jobRef = firestore.collection(JOBS_COLLECTION).doc(jobId);

    const newJob: ImportJob = {
      id: jobId,
      userId: 'user_placeholder', // TODO: Replace with real user ID
      filename: filename,
      fileUrl: blob.url,
      status: 'pending', // The job is now pending processing
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await jobRef.set(newJob);

    // 3. Trigger the background processing job (don't await this)
    fetch(`${process.env.VERCEL_URL}/api/jobs/start-processing`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': process.env.ADMIN_SHARED_SECRET || '',
        },
        body: JSON.stringify({ jobId }),
    }).catch(console.error);


    // 4. Return the jobId to the client immediately
    return response.status(201).json({
      message: 'File uploaded and job created successfully.',
      jobId: jobId,
    });

  } catch (error: any) {
    console.error('Error in upload handler:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error.message) {
      errorMessage = error.message;
    }
    return response.status(500).json({ message: 'Error uploading file and creating job.', error: errorMessage });
  }
}
