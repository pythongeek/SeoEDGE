import { put } from '@vercel/blob';
import { firestore } from '../services/firebase';
import { nanoid } from 'nanoid';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ImportJob } from '../types';
import { buffer } from '../utils/api-helpers';

const JOBS_COLLECTION = 'importJobs';

export const config = {
  api: {
    bodyParser: false, // We need to disable the default body parser to handle the raw stream
  },
};

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const filename = request.headers['x-vercel-filename'] as string || 'unknown-file';
  const jobId = nanoid();
  const blobPath = `uploads/${jobId}/${filename}`;

  try {
    // 1. Buffer the raw request body into a single Buffer
    const fileBuffer = await buffer(request);

    // 2. Upload the buffered file to Vercel Blob storage
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: request.headers['content-type'], // Pass content type for correct handling
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
