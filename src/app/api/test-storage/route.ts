import { NextResponse } from 'next/server';
import { testFirebaseStorage } from '@/lib/firebase/testStorage';

export async function GET() {
  try {
    const result = await testFirebaseStorage();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to test storage', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 