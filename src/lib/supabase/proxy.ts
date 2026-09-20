
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT use getSession() here — it reads from cookies without
  // verification. Use getClaims() which verifies the JWT signature.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  const { pathname } = request.nextUrl

  // Define public auth routes (accessible only when NOT logged in)
  const authRoutes = ['/login', '/signup', '/forgot-password']
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Define protected routes (require authentication)
  const isProtectedRoute = pathname.startsWith('/app')

  // If user is NOT authenticated and tries to access a protected route → redirect to login
  if (!claims && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user IS authenticated and tries to access auth routes → redirect to /app
  if (claims && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
