import admin from 'firebase-admin';

// Prevent re-initialization in a hot-reload environment
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson) {
      throw new Error('The GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 environment variable is not set.');
    }
    if (!projectId) {
        throw new Error('The FIREBASE_PROJECT_ID environment variable is not set.');
    }

    const decodedServiceAccount = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
    const credentials = JSON.parse(decodedServiceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: projectId,
    });

    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    // We don't want the app to run without a database connection
    process.exit(1);
  }
}

export const firestore = admin.firestore();
export const storage = admin.storage();
