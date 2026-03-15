import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { neonProtectedRouteMiddleware } from "./src/lib/auth/server";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/afenda") {
    return NextResponse.redirect(new URL("/AFENDA", req.url));
  }

  if (neonProtectedRouteMiddleware) {
    return neonProtectedRouteMiddleware(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/afenda",
    "/admin",
    "/admin/:path*",
    "/analytics",
    "/analytics/:path*",
    "/announcements",
    "/announcements/:path*",
    "/app",
    "/app/:path*",
    "/approvals",
    "/approvals/:path*",
    "/boardroom",
    "/boardroom/:path*",
    "/crm",
    "/crm/:path*",
    "/docs",
    "/docs/:path*",
    "/finance",
    "/portal/:path*",
    "/governance",
    "/finance/:path*",
    "/hr",
    "/hr/:path*",
    "/inbox",
    "/inbox/:path*",
    "/inventory",
    "/inventory/:path*",
    "/portal",
    "/portal/:path*",
    "/project",
    "/project/:path*",
    "/projects",
    "/projects/:path*",
    "/purchasing",
    "/purchasing/:path*",
    "/sales",
    "/sales/:path*",
    "/suppliers",
    "/suppliers/:path*",
    "/tasks",
    "/tasks/:path*",
    "/workflows",
    "/workflows/:path*",
    "/api/private/:path*",
  ],
};
