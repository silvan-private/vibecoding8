'use client';

import { useState, useEffect } from 'react';
import TestAuth from '../components/TestAuth';
import { testFirebaseStorage } from '@/lib/firebase/testStorage';
import { auth } from '@/lib/firebase/firebase';
import { logoutUser } from '@/lib/firebase/firebaseUtils';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const handleTestStorage = async () => {
    try {
      setLoading(true);
      const response = await testFirebaseStorage();
      setResult(response);
      
      // If successful, fetch and display the file content
      if (response.success && response.downloadURL) {
        const content = await fetch(response.downloadURL).then(res => res.text());
        setFileContent(content);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setResult(null);
      setFileContent(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Firebase Storage Test</h1>
          {auth.currentUser && (
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
        
        <div className="mb-8 bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Step 1: Authentication</h2>
          {auth.currentUser ? (
            <div className="text-gray-700">
              <p>Signed in as: <span className="font-semibold">{auth.currentUser.email}</span></p>
              <p>Display Name: <span className="font-semibold">{auth.currentUser.displayName}</span></p>
              <p>User ID: <span className="font-mono text-sm">{auth.currentUser.uid}</span></p>
            </div>
          ) : (
            <TestAuth />
          )}
        </div>

        <div className="mb-8 bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Step 2: Test Storage</h2>
          <button
            onClick={handleTestStorage}
            disabled={loading || !auth.currentUser}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Testing...' : 'Test Storage Upload'}
          </button>
          {!auth.currentUser && (
            <p className="mt-2 text-amber-600">Please sign in first to test storage.</p>
          )}
        </div>

        {result && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Upload Result:</h3>
              <div className="bg-gray-800 text-white p-4 rounded-lg overflow-auto">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>

            {fileContent && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">File Content:</h3>
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap break-words text-gray-700">
                    {fileContent}
                  </pre>
                </div>
              </div>
            )}

            {result.success && result.downloadURL && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Actions:</h3>
                <a 
                  href={result.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 