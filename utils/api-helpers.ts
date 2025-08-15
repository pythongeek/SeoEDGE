import type { VercelRequest } from '@vercel/node';

/**
 * Reads the entire request body stream and returns it as a Buffer.
 * This is necessary for handling raw file uploads in Vercel Serverless Functions.
 * @param req The VercelRequest object.
 * @returns A Promise that resolves with the complete request body as a Buffer.
 */
export function buffer(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}
