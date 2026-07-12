import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { timeoutFetch } from "@/lib/guard";

// Paths reachable without a session. Everything else redirects to /login
// (API routes pass through and enforce their own 401s).
function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/") || pathname === "/icon.svg";
}

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, skip the auth refresh and pass through.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  try {
    let response = supabaseResponse;
    const supabase = createServerClient(url, anonKey, {
      // Middleware runs on every request — the session refresh gets a short
      // budget so a slow auth server can never stall page loads.
      global: { fetch: timeoutFetch(5000) },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Login wall: no session → only /login (and API routes, which 401).
    if (!user && !isPublicPath(request.nextUrl.pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      const redirect = NextResponse.redirect(loginUrl);
      // Preserve any refreshed auth cookies on the redirect.
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }

    return response;
  } catch {
    // Auth outage: fail closed for pages (login wall), open for public paths.
    if (!isPublicPath(request.nextUrl.pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }
}
