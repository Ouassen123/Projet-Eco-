import { NextRequest, NextResponse } from "next/server";
import { verifierTokenSession, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifierTokenSession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { code: "NON_AUTHENTIFIE", message: "Authentification requise." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ajouter les infos utilisateur dans les headers pour les routes API
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.utilisateurId);
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-user-login", session.login);
  response.headers.set("x-user-nom", encodeURIComponent(session.nomComplet));
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|templates|.*\\.png$|.*\\.svg$).*)",
  ],
};
