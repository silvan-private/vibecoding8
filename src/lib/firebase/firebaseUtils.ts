import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { FirebaseError } from 'firebase/app';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    console.log('Sign in successful:', {
      email: result.user.email,
      displayName: result.user.displayName,
      uid: result.user.uid
    });
    
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/popup-blocked':
          throw new Error('The sign in popup was blocked by your browser. Please allow popups for this site and try again.');
        case 'auth/popup-closed-by-user':
          throw new Error('The sign in popup was closed before completing authentication.');
        case 'auth/cancelled-popup-request':
          throw new Error('The sign in process was cancelled.');
        case 'auth/unauthorized-domain':
          throw new Error(`This domain is not authorized for OAuth operations. Please add ${window.location.hostname} to your Firebase Console authorized domains.`);
        default:
          throw new Error(`Authentication error: ${error.message}`);
      }
    }
    
    throw new Error('An unexpected error occurred during sign in. Please try again.');
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File | Blob, path: string) => {
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file instanceof File ? file.type : 'application/octet-stream'
  };
  
  const uploadResult = await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(uploadResult.ref);
};

export const uploadBlob = async (blob: Blob, fileName: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const path = `uploads/${timestamp}_${fileName}`;
    const storageRef = ref(storage, path);
    
    console.log('Starting upload to path:', path);
    
    const metadata = {
      contentType: blob.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    };

    const uploadResult = await uploadBytes(storageRef, blob, metadata);
    console.log('Upload successful:', uploadResult);

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    console.log('Download URL generated:', downloadUrl);

    return downloadUrl;
  } catch (error) {
    console.error('Error in uploadBlob:', error);
    throw error instanceof Error 
      ? error 
      : new Error('An unexpected error occurred during upload');
  }
};

export const uploadAudioToStorage = async (audioData: Blob | ArrayBuffer, title: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const path = `audio/${timestamp}_${sanitizedTitle}.mp3`;
    const storageRef = ref(storage, path);
    
    // Upload the file
    const metadata = {
      contentType: 'audio/mpeg',
      customMetadata: {
        title,
        uploadedAt: new Date().toISOString()
      }
    };

    const uploadResult = await uploadBytes(storageRef, audioData, metadata);
    console.log('Audio upload successful:', uploadResult);

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    console.log('Audio download URL generated:', downloadUrl);

    return downloadUrl;
  } catch (error) {
    console.error('Error in uploadAudioToStorage:', error);
    throw error instanceof Error 
      ? error 
      : new Error('An unexpected error occurred during audio upload');
  }
};

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionData {
  text: string;
  segments: TranscriptionSegment[];
  sourceUrl?: string;
  title: string;
  audioUrl: string;
  createdAt: Date;
}

export async function saveTranscriptionToFirestore(data: TranscriptionData) {
  try {
    // Validate the data
    if (!data.text || !data.segments || !data.title || !data.audioUrl) {
      throw new Error('Missing required fields for transcription');
    }

    // Create a clean object without undefined values
    const cleanData = {
      text: data.text,
      segments: data.segments,
      sourceUrl: data.sourceUrl || null,
      title: data.title,
      audioUrl: data.audioUrl,
      createdAt: new Date()
    };

    console.log('Attempting to save transcription with data:', {
      title: cleanData.title,
      audioUrl: cleanData.audioUrl,
      textLength: cleanData.text.length,
      segmentsCount: cleanData.segments.length
    });

    const transcriptionsRef = collection(db, 'transcriptions');
    const docRef = await addDoc(transcriptionsRef, cleanData);
    
    console.log('Transcription saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error in saveTranscriptionToFirestore:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save transcription: ${error.message}`);
    }
    throw new Error('Failed to save transcription: Unknown error');
  }
}

export async function getTranscriptionsByTitle(title: string) {
  try {
    const transcriptionsRef = collection(db, 'transcriptions');
    const q = query(transcriptionsRef, where('title', '==', title));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting transcriptions:', error);
    throw error instanceof Error
      ? error
      : new Error('An unexpected error occurred while getting transcriptions');
  }
}

interface AudioRecording {
  id: string;
  url: string;
  title: string;
  createdAt: Date;
  userId: string;
}

export const saveRecording = async (data: Omit<AudioRecording, 'id'>) => {
  try {
    const recordingsRef = collection(db, 'recordings');
    const docRef = await addDoc(recordingsRef, {
      ...data,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving recording:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to save recording');
  }
};

export const getUserRecordings = async (userId: string): Promise<AudioRecording[]> => {
  try {
    const recordingsRef = collection(db, 'recordings');
    const q = query(
      recordingsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    })) as AudioRecording[];
  } catch (error) {
    console.error('Error getting recordings:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to get recordings');
  }
};

export const deleteRecording = async (recordingId: string) => {
  try {
    await deleteDoc(doc(db, 'recordings', recordingId));
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to delete recording');
  }
};
