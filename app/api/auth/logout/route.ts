import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth cookies
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
} 