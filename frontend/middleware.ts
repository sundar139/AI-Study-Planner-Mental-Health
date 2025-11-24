import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authentication middleware protecting non-public routes.
 *
 * - Allows static assets and public pages.
 * - Redirects unauthenticated users to `/login`.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get('assignwell_token')?.value || null
  const { pathname } = req.nextUrl

  const isStaticAsset = pathname.startsWith('/_next') || /\.(png|jpg|jpeg|svg|ico|css|js|map)$/.test(pathname)
  const isPublicPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/favicon.ico')
  if (isStaticAsset || isPublicPage) return NextResponse.next()

  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}