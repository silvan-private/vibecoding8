'use client';

import YoutubeExtractor from '../components/YoutubeExtractor';
import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';

export default function YoutubePage() {
  const { user } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            YouTube Audio Extractor
          </h1>
          {!user ? (
            <button
              onClick={handleSignIn}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign in with Google
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.displayName || user.email}
              </span>
            </div>
          )}
        </div>
        <YoutubeExtractor />
      </div>
    </div>
  );
} 