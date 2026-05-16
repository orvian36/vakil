import { NextRequest, NextResponse } from 'next/server';
const currentUrl = process.env.NEXT_PUBLIC_BASE_URL;



// Function to verify access token
export async function verifyAccessToken(accessToken) {
  try {
    const response = await fetch('https://platform.makebell.com/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        access_token: accessToken
      })
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return { valid: data.valid || true, user: data.user || data };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false };
  }
}

// Function to refresh tokens
export async function refreshTokens(refreshToken) {
  try {
    const response = await fetch('https://platform.makebell.com/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false };
  }
}

export async function middleware(request) {
  const { searchParams, pathname } = request.nextUrl;

  if (pathname === '/manifest.json') {
    // [Middleware] Processing request for: /manifest.json
    return NextResponse.next();
  }
  
  // Debug logging
  console.log(`[Middleware] Processing request for: ${pathname}`);
  console.log(`[Middleware] Request URL: ${request.url}`);
  
  // Check for tokens in query parameters first (from auth redirect)
  const accessTokenFromQuery = searchParams.get('access_token');
  const refreshTokenFromQuery = searchParams.get('refresh_token');
  
  // Get the appropriate base URL based on environment
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    return process.env.NEXT_PUBLIC_BASE_URL;
  };
  
  // If tokens are in query params, store them in cookies and redirect to clean URL
  if (accessTokenFromQuery && refreshTokenFromQuery) {
    console.log('[Middleware] Found tokens in query params, storing in cookies');
    const response = NextResponse.redirect(new URL(pathname, getBaseUrl()));
    
    // Set cookies with the tokens
    response.cookies.set('access_token', accessTokenFromQuery, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    response.cookies.set('refresh_token', refreshTokenFromQuery, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    
    return response;
  }
  
  // Get tokens from cookies
  
  let accessToken = request.cookies.get('access_token')?.value;
  if (!accessToken) {
    // Try to get from Authorization header if not in cookies
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }
  const refreshToken = request.cookies.get('refresh_token')?.value;
  
  console.log(`[Middleware] Access token exists: ${!!accessToken}, Refresh token exists: ${!!refreshToken}`);
  
  // If no tokens found, redirect to auth service
  if (!accessToken && !refreshToken) {
    console.log('[Middleware] No tokens found, redirecting to auth service');
    

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Meeting Minutes AI';
    const loginUrl = `https://platform.makebell.com/auth/login?redirect_url=${encodeURIComponent(currentUrl)}&app_name=${encodeURIComponent(appName)}`;
    
    console.log(`[Middleware] Redirecting to: ${loginUrl}`);
    return NextResponse.redirect(loginUrl);
  }
  
  // If we have an access token, verify it
  if (accessToken) {
    console.log('[Middleware] Verifying access token');
    const verification = await verifyAccessToken(accessToken);
    
    if (verification.valid) {
      console.log('[Middleware] Access token valid, allowing request');
      // Token is valid, add user context to headers and allow request to continue
      const response = NextResponse.next();
      response.headers.set('x-user-context', JSON.stringify(verification.user));
      return response;
    } else {
      console.log('[Middleware] Access token invalid');
    }
  }
  
  // Access token is invalid or doesn't exist, try to refresh with refresh token
  if (refreshToken) {
    console.log('[Middleware] Attempting to refresh tokens');
    const refreshResult = await refreshTokens(refreshToken);
    
    if (refreshResult.success && refreshResult.access_token && refreshResult.refresh_token) {
      console.log('[Middleware] Token refresh successful');
      // Successfully refreshed tokens, update cookies and continue
      const response = NextResponse.next();
      
      response.cookies.set('access_token', refreshResult.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      response.cookies.set('refresh_token', refreshResult.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      // Add user context after successful refresh
      const verification = await verifyAccessToken(refreshResult.access_token);
      if (verification.valid) {
        response.headers.set('x-user-context', JSON.stringify(verification.user));
      }
      
      return response;
    } else {
      console.log('[Middleware] Token refresh failed');
    }
  }
  
  // Both access token and refresh token are invalid, redirect to login
  console.log('[Middleware] All tokens invalid, redirecting to login');
  
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Meeting Minutes AI';
  const loginUrl = `https://platform.makebell.com/auth/login?redirect_url=${encodeURIComponent(currentUrl)}&app_name=${encodeURIComponent(appName)}`;
  
  // Clear invalid cookies
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  
  console.log(`[Middleware] Final redirect to: ${loginUrl}`);
  return response;
}

export const config = {
  matcher: [
    // Match all routes including API routes for development bypass
    '/',
    '/test',
    '/wizard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 