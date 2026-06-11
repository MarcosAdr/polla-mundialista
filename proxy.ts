import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from './lib/session'

export default async function proxy(request: NextRequest) {
  const session = await getSession()

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Protect /predictions routes
  if (request.nextUrl.pathname.startsWith('/predictions')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/predictions/:path*'],
}
