import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import ytdl from 'ytdl-core';
import fs from 'fs/promises';

export async function POST(req: Request) {
    try {
        const { url, startTime, endTime } = await req.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate YouTube URL
        if (!ytdl.validateURL(url)) {
            return NextResponse.json(
                { error: 'Invalid YouTube URL' },
                { status: 400 }
            );
        }

        // Get video info
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Create output directory if it doesn't exist
        const publicDir = path.join(process.cwd(), 'public', 'temp');
        await fs.mkdir(publicDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const outputFilename = `${timestamp}_${videoTitle}.mp3`;
        const outputPath = path.join('temp', outputFilename);
        const fullOutputPath = path.join(publicDir, outputFilename);

        // Download audio
        const audioStream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });

        // Save to file
        const fileStream = await fs.open(fullOutputPath, 'w');
        const writeStream = fileStream.createWriteStream();
        audioStream.pipe(writeStream);

        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', () => resolve());
            writeStream.on('error', reject);
        });

        return NextResponse.json({
            success: true,
            output_file: outputPath,
            title: videoTitle
        });

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