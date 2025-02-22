'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TimeInput {
    minutes: string;
    seconds: string;
}

interface ExtractionResult {
    title: string;
    duration: number;
    audioUrl: string;
    firebaseUrl?: string;
}

export default function YoutubeExtractor() {
    const [url, setUrl] = useState('');
    const [startTime, setStartTime] = useState<TimeInput>({ minutes: '0', seconds: '0' });
    const [endTime, setEndTime] = useState<TimeInput>({ minutes: '0', seconds: '0' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const { user } = useAuth();

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
        setIsLoading(true);
        setError('');
        setResult(null);

        try {
            const startTimeInSeconds = convertToSeconds(startTime);
            const endTimeInSeconds = convertToSeconds(endTime);

            if (endTimeInSeconds <= startTimeInSeconds) {
                throw new Error('End time must be greater than start time');
            }

            const response = await fetch('/api/extract-audio', {
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract audio');
            }

            // Upload to Firebase Storage if extraction was successful
            let firebaseUrl = undefined;
            if (data.success && user) {
                const storage = getStorage();
                const audioFile = await fetch(data.output_file).then(res => res.blob());
                const storageRef = ref(storage, `audio/${user.uid}/${data.title}_${Date.now()}.mp3`);
                await uploadBytes(storageRef, audioFile);
                firebaseUrl = await getDownloadURL(storageRef);
            }

            setResult({
                title: data.title,
                duration: data.duration,
                audioUrl: data.output_file,
                firebaseUrl
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">
                YouTube Audio Extractor
            </h1>
            
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
                    {isLoading ? 'Processing...' : 'Extract Audio'}
                </button>

                {error && (
                    <div className="p-4 text-red-700 bg-red-100 rounded-lg text-lg font-medium border-2 border-red-200">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <h3 className="text-lg font-semibold text-green-800">
                            Audio Extracted Successfully!
                        </h3>
                        <div className="space-y-2">
                            <p className="text-gray-900">Title: {result.title}</p>
                            <p className="text-gray-900">Duration: {result.duration.toFixed(1)} seconds</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-gray-900">Preview:</p>
                            <audio 
                                controls 
                                className="w-full" 
                                src={result.audioUrl}
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                        {result.firebaseUrl && (
                            <div className="space-y-2">
                                <p className="font-medium text-gray-900">Saved to Firebase:</p>
                                <a 
                                    href={result.firebaseUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    Download Audio File
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
} 