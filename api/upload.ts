import { put } from '@vercel/blob';

export default async function POST(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return new Response('No filename specified.', { status: 400 });
  }

  if (!request.body) {
    return new Response('No file content provided.', { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return new Response(JSON.stringify(blob), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new Response(`Error uploading file: ${errorMessage}`, { status: 500 });
  }
}
