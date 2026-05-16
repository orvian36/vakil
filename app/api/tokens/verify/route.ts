import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estimateTokens } = body;

    if (!estimateTokens || typeof estimateTokens !== 'number') {
      return NextResponse.json({ error: 'Invalid estimateTokens parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const response = await fetch('https://platform.makebell.com/api/tokens/verifyTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ estimateTokens })
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Token verification failed' }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json({ is_enough_balance: result.is_enough_balance || false });

  } catch (error: any) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}