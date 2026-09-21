import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'tythas_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Protected paths
  const isProtectedPath =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/pages') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/media') ||
    pathname.startsWith('/navigation') ||
    pathname.startsWith('/forms') ||
    pathname.startsWith('/leads') ||
    pathname.startsWith('/seo') ||
    pathname.startsWith('/schema') ||
    pathname.startsWith('/technical-seo') ||
    pathname.startsWith('/redirects') ||
    pathname.startsWith('/integrations');

  // Auth pages (login, signup, reset-password)
  const isAuthPath =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/reset-password');

  if (isProtectedPath && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
