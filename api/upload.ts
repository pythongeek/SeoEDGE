import { put } from '@vercel/blob';
import { firestore } from '../services/firebase';
import { nanoid } from 'nanoid';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ImportJob } from '../types';

const JOBS_COLLECTION = 'importJobs';

// By not exporting a config object, we use the default Vercel body parser behavior.
// However, for streaming, we pass the `request` object itself, which is a Readable stream.

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    console.log('Upload API: Method not allowed');
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const filename = (request.headers['x-vercel-filename'] as string) || 'unknown-file';
  console.log(`Upload API: Received request for filename: ${filename}`);

  const jobId = nanoid();
  const blobPath = `uploads/${jobId}/${filename}`;
  console.log(`Upload API: Generated Job ID ${jobId} and blob path ${blobPath}`);

  try {
    console.log('Upload API: Attempting to upload file stream to Vercel Blob...');
    // Pass the request object itself as the body. `request` is a Readable stream.
    const blob = await put(blobPath, request, {
      access: 'public',
      contentType: request.headers['content-type'],
    });
    console.log(`Upload API: Successfully uploaded to ${blob.url}`);

    console.log(`Upload API: Creating Firestore job document for job ${jobId}...`);
    const jobRef = firestore.collection(JOBS_COLLECTION).doc(jobId);

    const newJob: ImportJob = {
      id: jobId,
      userId: 'user_placeholder',
      filename: filename,
      fileUrl: blob.url,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await jobRef.set(newJob);
    console.log(`Upload API: Firestore job document created for job ${jobId}`);

    console.log(`Upload API: Triggering background processing for job ${jobId}...`);
    fetch(`${process.env.VERCEL_URL}/api/jobs/start-processing`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': process.env.ADMIN_SHARED_SECRET || '',
        },
        body: JSON.stringify({ jobId }),
    }).catch(err => console.error(`Upload API: Failed to trigger processing for job ${jobId}`, err));

    console.log(`Upload API: Returning success response for job ${jobId}`);
    return response.status(201).json({
      message: 'File uploaded and job created successfully.',
      jobId: jobId,
    });

  } catch (error: any) {
    console.error(`Upload API: An error occurred for job ${jobId}.`, error);
    return response.status(500).json({ message: 'An internal server error occurred.', error: error.message });
  }
}
