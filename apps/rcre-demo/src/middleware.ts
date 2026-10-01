import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const headers = new Headers(request.headers)
  headers.set('x-rcre-request-id', requestId)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('x-rcre-request-id', requestId)
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
