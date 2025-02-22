'use client';

import { useState } from 'react';

export default function StorageTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; downloadUrl?: string; error?: string } | null>(null);

  const testStorage = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      const response = await fetch('/api/test-storage');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test storage');
      }

      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Firebase Storage Test</h2>
      
      <button
        onClick={testStorage}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Testing...' : 'Test Storage'}
      </button>

      {result && (
        <div className="mt-4">
          {result.success ? (
            <div className="text-green-600">
              <p>✅ Storage test successful!</p>
              {result.downloadUrl && (
                <a 
                  href={result.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  View uploaded file
                </a>
              )}
            </div>
          ) : (
            <p className="text-red-600">❌ Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
} 