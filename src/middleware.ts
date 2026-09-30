import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSession } from '@/lib/auth/session'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/login') return NextResponse.next()

  const password = process.env.APP_PASSWORD
  if (!password) {
    return new NextResponse('APP_PASSWORD não configurada.', { status: 503 })
  }

  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value, password)) {
    return NextResponse.next()
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(url)
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
