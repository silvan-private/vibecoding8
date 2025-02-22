import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { uploadAudioToStorage, saveTranscriptionToFirestore } from '@/lib/firebase/adminUtils';

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  let fullPath = '';
  
  try {
    const { audioPath, title, sourceUrl } = await req.json();
    
    if (!audioPath) {
      return NextResponse.json(
        { error: 'Audio path is required' },
        { status: 400 }
      );
    }

    console.log('Processing audio request:', { audioPath, title });

    // Get the full path to the audio file
    fullPath = path.join(process.cwd(), 'public', audioPath);
    
    // Check if file exists and is readable
    let audioBuffer: Buffer;
    try {
      audioBuffer = await fs.promises.readFile(fullPath);
      console.log('Audio file read:', { size: audioBuffer.length, path: fullPath });
      
      if (audioBuffer.length === 0) {
        throw new Error('Audio file is empty');
      }
    } catch (error) {
      console.error('Error reading audio file:', error);
      return NextResponse.json(
        { error: 'Audio file not found or not accessible' },
        { status: 404 }
      );
    }

    // Upload to Firebase Storage using Admin SDK
    let audioUrl;
    try {
      audioUrl = await uploadAudioToStorage(audioBuffer, title || 'untitled');
      console.log('Audio uploaded to Firebase:', audioUrl);
    } catch (uploadError) {
      console.error('Firebase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio to storage' },
        { status: 500 }
      );
    }

    // Create a File object for OpenAI
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    // Transcribe with Whisper
    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      }) as unknown as WhisperResponse;
      
      console.log('Whisper transcription completed');
    } catch (whisperError) {
      console.error('Whisper transcription error:', whisperError);
      return NextResponse.json(
        { error: 'Failed to transcribe audio' },
        { status: 500 }
      );
    }

    // Process segments
    const segments = transcription.segments.map((segment: WhisperSegment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
    }));

    // Save to Firestore
    let transcriptionId;
    try {
      transcriptionId = await saveTranscriptionToFirestore({
        text: transcription.text,
        segments,
        sourceUrl,
        title: title || 'untitled',
        audioUrl,
      });
      
      console.log('Transcription saved to Firestore:', transcriptionId);
    } catch (firestoreError) {
      console.error('Firestore save error:', firestoreError);
      return NextResponse.json(
        { error: 'Failed to save transcription data' },
        { status: 500 }
      );
    }

    // Clean up the local file
    try {
      await fs.promises.unlink(fullPath);
      console.log('Local audio file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up local file:', cleanupError);
      // Non-critical error, don't fail the request
    }

    return NextResponse.json({
      success: true,
      segments,
      text: transcription.text,
      transcriptionId,
      audioUrl,
    });

  } catch (error) {
    console.error('Unhandled error in process-audio:', error);
    
    // Try to clean up the file if it exists
    if (fullPath) {
      try {
        await fs.promises.unlink(fullPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up file after error:', cleanupError);
      }
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 