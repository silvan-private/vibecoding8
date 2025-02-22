import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { url, startTime, endTime } = data;

        if (!url || startTime === undefined || endTime === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const pythonScript = path.join(process.cwd(), 'src', 'lib', 'python', 'youtube_audio_extractor.py');
        const pythonInterpreter = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');

        return new Promise((resolve) => {
            const pythonProcess = spawn(pythonInterpreter, [
                pythonScript,
                url,
                startTime.toString(),
                endTime.toString()
            ]);

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                try {
                    // Try to find the JSON output in stdout
                    const jsonMatch = stdoutData.match(/\{.*\}/);
                    if (jsonMatch && code === 0) {
                        const result = JSON.parse(jsonMatch[0]);
                        resolve(NextResponse.json(result));
                    } else {
                        console.error('Python script error:', stderrData || stdoutData);
                        resolve(NextResponse.json(
                            { error: 'Failed to extract audio', details: stderrData || stdoutData },
                            { status: 500 }
                        ));
                    }
                } catch (error) {
                    console.error('Error parsing Python output:', error);
                    resolve(NextResponse.json(
                        { 
                            error: 'Invalid response from Python script', 
                            details: error instanceof Error ? error.message : String(error)
                        },
                        { status: 500 }
                    ));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                resolve(NextResponse.json(
                    { 
                        error: 'Failed to start Python process', 
                        details: error instanceof Error ? error.message : String(error)
                    },
                    { status: 500 }
                ));
            });
        });
    } catch (error) {
        console.error('API route error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 