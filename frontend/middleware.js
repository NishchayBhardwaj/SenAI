import { NextResponse } from "next/server";

// Paths that don't require authentication
const publicPaths = ["/", "/login", "/register", "/api/auth"];

export function middleware(request) {
  // Always allow public paths without redirection
  const path = request.nextUrl.pathname;

  if (
    publicPaths.some(
      (publicPath) => path === publicPath || path.startsWith(publicPath + "/")
    )
  ) {
    // Public path, allow access without checking auth
    return NextResponse.next();
  }

  // For protected routes, let the Protected component handle the auth check
  return NextResponse.next();
}

// Explicitly define which routes this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
