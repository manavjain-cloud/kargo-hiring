import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional workspace gate. When BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are set,
 * every page and API route requires HTTP Basic auth (candidate data is personal data).
 */
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  // Enforced on deployed (production-mode) builds; `next dev` on localhost stays open for development.
  if (!user || !pass || process.env.NODE_ENV !== "production") return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (u === user && rest.join(":") === pass) return NextResponse.next();
    } catch {
      // malformed header → fall through to 401
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Kargo Hiring Intelligence", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
