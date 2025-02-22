'use client';

import AudioRecorder from '../components/AudioRecorder';

export default function AudioPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Audio Recording Studio
        </h1>
        <AudioRecorder />
      </div>
    </div>
  );
} 