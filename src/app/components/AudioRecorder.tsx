'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { uploadBlob } from '@/lib/firebase/firebaseUtils';
import { motion } from 'framer-motion';

interface AudioRecording {
  id: string;
  url: string;
  title: string;
  createdAt: Date;
}

export default function AudioRecorder() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Load existing recordings from Firebase here
    // This will be implemented later
  }, [user]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const timestamp = Date.now();
          const fileName = `recording_${timestamp}.webm`;
          const url = await uploadBlob(audioBlob, fileName);
          
          const newRecording: AudioRecording = {
            id: timestamp.toString(),
            url,
            title: fileName,
            createdAt: new Date(),
          };
          
          setRecordings(prev => [newRecording, ...prev]);
        } catch (err) {
          setError('Failed to save recording. Please try again.');
          console.error('Error saving recording:', err);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording. Please check your microphone permissions.');
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-lg text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Please Sign In
        </h2>
        <p className="text-gray-600">
          You need to be signed in to record and save audio.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Audio Recorder
        </h2>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-colors ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {isRecording && (
          <div className="mt-4 flex justify-center">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-4 h-4 bg-red-500 rounded-full"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Your Recordings
        </h3>
        {recordings.length === 0 ? (
          <p className="text-gray-600 text-center py-4">
            No recordings yet. Start recording to see them here!
          </p>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <p className="font-medium text-gray-900 mb-2">
                  {recording.title}
                </p>
                <audio
                  src={recording.url}
                  controls
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Recorded on {recording.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 