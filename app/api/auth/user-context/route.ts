import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get user context from the header set by middleware
    const userContextHeader = request.headers.get('x-user-context');
    
    if (!userContextHeader) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    try {
      const user = JSON.parse(userContextHeader);
      return NextResponse.json({ user }, { status: 200 });
    } catch (parseError) {
      console.error('Failed to parse user context:', parseError);
      return NextResponse.json({ user: null }, { status: 200 });
    }
  } catch (error) {
    console.error('Failed to get user context:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
} 