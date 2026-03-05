/**
 * NextAuth v4 App Router route handler.
 *
 * Handles GET and POST requests for all /api/auth/* endpoints:
 *   - /api/auth/signin
 *   - /api/auth/signout
 *   - /api/auth/session
 *   - /api/auth/csrf
 *   - /api/auth/callback/*
 */

import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
