import * as admin from 'firebase-admin';
import { App } from 'firebase-admin/app';

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.apps[0] as App;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = 'vibecoding8';
  const storageBucket = 'vibecoding8.firebasestorage.app';

  if (!privateKey || !clientEmail) {
    throw new Error(
      'Missing Firebase Admin credentials. Please check your environment variables:\n' +
      `FIREBASE_PRIVATE_KEY: ${privateKey ? 'Set' : 'Missing'}\n` +
      `FIREBASE_CLIENT_EMAIL: ${clientEmail ? 'Set' : 'Missing'}`
    );
  }

  try {
    // Initialize the admin app with credentials
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket,
      databaseURL: `https://${projectId}.firebaseio.com`
    });

    // Initialize Firestore with settings
    const db = admin.firestore(app);
    db.settings({ 
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true
    });

    console.log('Firebase Admin SDK initialized successfully with:', {
      projectId,
      clientEmail: clientEmail.split('@')[0] + '@...',
      storageBucket,
      firestoreInitialized: !!db
    });

    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Initialize Firebase Admin and get the app instance
const app = initializeFirebaseAdmin();

// Get service instances
const adminAuth = admin.auth(app);
const adminDb = admin.firestore(app);
const adminStorage = admin.storage(app);

export { admin, adminAuth, adminDb, adminStorage }; 