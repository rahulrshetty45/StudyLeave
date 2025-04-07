import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login'];

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl;
  
  // Check if the path is a public route or an API route or a static file
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/);
  
  // If it's not a public route or API route and we have no auth token, redirect to login
  if (!isPublicRoute && !isApiRoute && !isStaticFile) {
    // Check for the auth cookie/token
    const authToken = request.cookies.get('authenticated')?.value;
    
    if (!authToken || authToken !== 'true') {
      // User is not authenticated, redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

// Configure middleware to run on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - img (local images folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|img).*)',
  ],
}; 