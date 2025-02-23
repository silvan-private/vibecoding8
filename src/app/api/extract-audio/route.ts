import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VideoInfo {
    title: string;
    duration: number;
    description: string;
    [key: string]: any;
}

export async function POST(req: Request) {
    try {
        const { url, startTime, endTime } = await req.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        try {
            // Create output directory if it doesn't exist
            const publicDir = path.join(process.cwd(), 'public', 'temp');
            await fs.mkdir(publicDir, { recursive: true });

            // Generate unique filenames
            const timestamp = Date.now();
            const fullOutputFilename = `${timestamp}_full.mp3`;
            const trimmedOutputFilename = `${timestamp}_trimmed.mp3`;
            const fullOutputPath = path.join(publicDir, fullOutputFilename);
            const trimmedOutputPath = path.join(publicDir, trimmedOutputFilename);
            const outputPath = path.join('temp', trimmedOutputFilename);

            // Get video info first
            const { stdout: infoJson } = await execAsync(`yt-dlp -j "${url}"`);
            const videoInfo = JSON.parse(infoJson);

            if (!videoInfo) {
                throw new Error('Could not get video information');
            }

            // Download audio using yt-dlp
            await execAsync(
                `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${fullOutputPath}" "${url}"`
            );

            // Verify the file exists
            const fileStats = await fs.stat(fullOutputPath);
            if (!fileStats.size) {
                throw new Error('Downloaded file is empty');
            }

            // Trim the audio using ffmpeg
            const duration = endTime - startTime;
            await execAsync(
                `ffmpeg -i "${fullOutputPath}" -ss ${startTime} -t ${duration} "${trimmedOutputPath}"`
            );

            // Clean up the full file
            await fs.unlink(fullOutputPath);

            return NextResponse.json({
                success: true,
                output_file: outputPath,
                title: videoInfo.title || trimmedOutputFilename
            });

        } catch (ytError) {
            console.error('YouTube extraction error:', ytError);
            return NextResponse.json(
                { 
                    error: 'Failed to extract audio from YouTube. The video might be restricted or unavailable.',
                    details: ytError instanceof Error ? ytError.message : 'Unknown error'
                },
                { status: 422 }
            );
        }

    } catch (error) {
        console.error('Error in extract-audio:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
} 