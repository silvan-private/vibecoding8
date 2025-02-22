'use client';

import { useState, useRef } from 'react';

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  success: boolean;
  segments: Segment[];
  text: string;
  transcriptionId: string;
  audioUrl: string;
}

export default function AudioProcessor({ audioPath, title, sourceUrl }: { 
  audioPath: string;
  title?: string;
  sourceUrl?: string;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const processAudio = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioPath, title, sourceUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process audio');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const jumpToSegment = (start: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = start;
      audioRef.current.play();
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={processAudio}
        disabled={isProcessing}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Process Audio'}
      </button>

      {error && (
        <div className="text-red-500 bg-red-50 p-4 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Transcription Results</h3>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <audio 
              ref={audioRef}
              src={result.audioUrl}
              controls
              onTimeUpdate={handleTimeUpdate}
              className="w-full mb-4"
            />
            <h4 className="font-medium mb-2">Full Text:</h4>
            <p>{result.text}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Segments:</h4>
            {result.segments.map((segment, index) => (
              <div
                key={index}
                className={`bg-white p-3 rounded-md border border-gray-200 cursor-pointer transition-colors ${
                  currentTime >= segment.start && currentTime <= segment.end
                    ? 'bg-blue-50'
                    : ''
                }`}
                onClick={() => jumpToSegment(segment.start)}
              >
                <div className="text-sm text-gray-500 mb-1">
                  {formatTime(segment.start)} - {formatTime(segment.end)}
                </div>
                <p>{segment.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 