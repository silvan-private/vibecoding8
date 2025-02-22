'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveRecording } from '@/lib/firebase/firebaseUtils';

interface TimeInput {
    minutes: string;
    seconds: string;
}

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

export default function YoutubeExtractor() {
    const { user, signOut } = useAuth();
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState<TimeInput>({ minutes: '0', seconds: '0' });
    const [endTime, setEndTime] = useState<TimeInput>({ minutes: '0', seconds: '0' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<TranscriptionResult | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);

    const convertToSeconds = (time: TimeInput): number => {
        const minutes = parseInt(time.minutes) || 0;
        const seconds = parseInt(time.seconds) || 0;
        return minutes * 60 + seconds;
    };

    const handleTimeChange = (type: 'start' | 'end', field: 'minutes' | 'seconds', value: string) => {
        // Ensure value is between 0 and 59 for seconds, and non-negative for minutes
        let numValue = parseInt(value) || 0;
        if (field === 'seconds') {
            numValue = Math.min(Math.max(numValue, 0), 59);
        } else {
            numValue = Math.max(numValue, 0);
        }

        if (type === 'start') {
            setStartTime(prev => ({ ...prev, [field]: numValue.toString() }));
        } else {
            setEndTime(prev => ({ ...prev, [field]: numValue.toString() }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError('Please sign in to extract audio');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setResult(null);

            const startTimeInSeconds = convertToSeconds(startTime);
            const endTimeInSeconds = convertToSeconds(endTime);

            if (endTimeInSeconds <= startTimeInSeconds) {
                throw new Error('End time must be greater than start time');
            }

            // First extract the audio
            const extractResponse = await fetch('/api/extract-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    startTime: startTimeInSeconds,
                    endTime: endTimeInSeconds,
                }),
            });

            const extractData = await extractResponse.json();

            if (!extractResponse.ok) {
                throw new Error(extractData.error || 'Failed to extract audio');
            }

            // Then process the audio with Whisper and save to Firebase
            const processResponse = await fetch('/api/process-audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audioPath: extractData.output_file,
                    title: extractData.title,
                    sourceUrl: url,
                }),
            });

            const processData = await processResponse.json();

            if (!processResponse.ok) {
                throw new Error(processData.error || 'Failed to process audio');
            }

            // Save recording metadata to Firestore
            await saveRecording({
                url: processData.audioUrl,
                title: extractData.title,
                createdAt: new Date(),
                userId: user.uid,
            });

            setResult(processData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
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
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                    Extract Audio from YouTube
                </h2>
                <div className="flex items-center gap-4">
                    <span className="text-gray-600">
                        Signed in as: {user?.email}
                    </span>
                    <button
                        onClick={signOut}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <label htmlFor="url" className="block text-lg font-semibold text-gray-900">
                        YouTube URL
                    </label>
                    <input
                        type="text"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube URL here"
                        className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg placeholder-gray-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <label className="block text-lg font-semibold text-gray-900">
                            Start Time
                        </label>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 space-y-2">
                                <input
                                    type="number"
                                    value={startTime.minutes}
                                    onChange={(e) => handleTimeChange('start', 'minutes', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg"
                                    min="0"
                                />
                                <span className="block text-base font-medium text-gray-900">Minutes</span>
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    type="number"
                                    value={startTime.seconds}
                                    onChange={(e) => handleTimeChange('start', 'seconds', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg"
                                    min="0"
                                    max="59"
                                />
                                <span className="block text-base font-medium text-gray-900">Seconds</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <label className="block text-lg font-semibold text-gray-900">
                            End Time
                        </label>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1 space-y-2">
                                <input
                                    type="number"
                                    value={endTime.minutes}
                                    onChange={(e) => handleTimeChange('end', 'minutes', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg"
                                    min="0"
                                />
                                <span className="block text-base font-medium text-gray-900">Minutes</span>
                            </div>
                            <div className="flex-1 space-y-2">
                                <input
                                    type="number"
                                    value={endTime.seconds}
                                    onChange={(e) => handleTimeChange('end', 'seconds', e.target.value)}
                                    placeholder="0"
                                    className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-lg"
                                    min="0"
                                    max="59"
                                />
                                <span className="block text-base font-medium text-gray-900">Seconds</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-colors ${
                        isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                    }`}
                >
                    {isLoading ? 'Processing...' : 'Extract and Process Audio'}
                </button>
            </form>

            {error && (
                <div className="mt-6 p-4 text-red-700 bg-red-100 rounded-lg text-lg font-medium border-2 border-red-200">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-8 space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900">Transcription Results</h2>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <audio 
                            ref={audioRef}
                            src={result.audioUrl}
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            className="w-full mb-4"
                        />
                        <h3 className="font-medium mb-2 text-gray-900">Full Text:</h3>
                        <p className="text-gray-700">{result.text}</p>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2 text-gray-900">Segments:</h3>
                        <div className="space-y-2">
                            {result.segments.map((segment, index) => (
                                <div
                                    key={index}
                                    className={`bg-white p-4 rounded-lg border-2 border-gray-200 cursor-pointer transition-colors ${
                                        currentTime >= segment.start && currentTime <= segment.end
                                            ? 'bg-blue-50 border-blue-300'
                                            : ''
                                    }`}
                                    onClick={() => jumpToSegment(segment.start)}
                                >
                                    <div className="text-sm text-gray-500 mb-1">
                                        {formatTime(segment.start)} - {formatTime(segment.end)}
                                    </div>
                                    <p className="text-gray-900">{segment.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 