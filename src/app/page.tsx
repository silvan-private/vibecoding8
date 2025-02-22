'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { signInWithGoogle } from '@/lib/firebase/firebaseUtils';
import YoutubeExtractor from './components/YoutubeExtractor';

export default function HomePage() {
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
        {!user ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              YouTube Audio Extractor
            </h1>
            <p className="text-gray-600 mb-8">
              Sign in to extract audio from YouTube videos
            </p>
            <button
              onClick={handleSignIn}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                YouTube Audio Extractor
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, {user.displayName || user.email}
                </span>
              </div>
            </div>
            <YoutubeExtractor />
          </>
        )}
      </div>
    </div>
  );
}
