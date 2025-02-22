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
      'Missing Firebase Admin credentials. Please check your environment variables.'
    );
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket,
    });

    console.log('Firebase Admin SDK initialized successfully');
    return app;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Initialize Firebase Admin and get the app instance
const app = initializeFirebaseAdmin();
const adminDb = admin.firestore(app);
const adminStorage = admin.storage(app);

export interface TranscriptionData {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  sourceUrl?: string;
  title: string;
  audioUrl: string;
}

export async function saveTranscriptionToFirestore(data: TranscriptionData) {
  try {
    if (!data.text || !data.segments || !data.title || !data.audioUrl) {
      throw new Error('Missing required fields for transcription');
    }

    const cleanData = {
      text: data.text,
      segments: data.segments,
      sourceUrl: data.sourceUrl || null,
      title: data.title,
      audioUrl: data.audioUrl,
      createdAt: admin.firestore.Timestamp.now()
    };

    const transcriptionsRef = adminDb.collection('transcriptions');
    const docRef = await transcriptionsRef.add(cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Error in saveTranscriptionToFirestore:', error);
    throw error;
  }
}

export async function uploadAudioToStorage(buffer: Buffer, title: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${timestamp}_${sanitizedTitle}.mp3`;
    const filePath = `audio/${filename}`;
    
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);
    
    await file.save(buffer, {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: {
          title,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });

    return url;
  } catch (error) {
    console.error('Error in uploadAudioToStorage:', error);
    throw error;
  }
}

export { adminDb, adminStorage }; 