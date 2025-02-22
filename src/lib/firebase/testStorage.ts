import { storage, auth } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export async function testFirebaseStorage() {
  try {
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated. Please sign in first.',
        errorDetails: null
      };
    }

    // Create a test string
    const testData = 'Hello Firebase Storage! ' + new Date().toISOString();
    
    // Create a test blob
    const blob = new Blob([testData], { type: 'text/plain' });
    
    // Create a reference to 'test.txt' in your storage bucket
    const testRef = ref(storage, `users/${user.uid}/test/test.txt`);
    
    console.log('Starting test upload...', {
      bucket: storage.app.options.storageBucket,
      path: testRef.fullPath,
      user: user.uid,
      dataSize: blob.size
    });
    
    // Upload the blob
    const snapshot = await uploadString(testRef, testData, 'raw', {
      contentType: 'text/plain',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: user.uid
      }
    });
    console.log('Upload successful:', snapshot);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(testRef);
    console.log('File available at:', downloadURL);
    
    return {
      success: true,
      downloadURL,
      message: 'Test upload successful',
      user: user.uid,
      path: testRef.fullPath,
      size: blob.size
    };
  } catch (error) {
    console.error('Error testing storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error
    };
  }
} 