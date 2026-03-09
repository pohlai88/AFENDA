/**
 * NextAuth v4 configuration.
 *
 * CredentialsProvider: email + password verified via API verify-credentials.
 * Session strategy: JWT (so the API can verify tokens independently).
 */

import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { PortalType } from "@afenda/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type VerifyCredentialsSuccess = {
  data?: {
    principalId: string;
    email: string;
  };
};

type VerifyCredentialsError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@demo.afenda" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const rawPortal = credentials.portal;
        const portal: PortalType =
          rawPortal === "supplier" || rawPortal === "customer" ? rawPortal : "app";

        try {
          const res = await fetch(`${API_BASE}/v1/auth/verify-credentials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email.trim(),
              password: credentials.password,
              portal,
            }),
          });

          if (!res.ok) {
            let code = "IAM_CREDENTIALS_INVALID";
            let message = "Authentication failed";
            try {
              const payload = (await res.json()) as VerifyCredentialsError;
              code = payload.error?.code ?? code;
              message = payload.error?.message ?? message;
            } catch {
              // Keep default machine-friendly code when response parsing fails.
            }

            console.error("[NextAuth] verify-credentials failed:", res.status, code, message);
            throw new Error(code);
          }

          const json = (await res.json()) as VerifyCredentialsSuccess;
          const data = json?.data;
          if (!data?.principalId || !data?.email) {
            console.error("[NextAuth] verify-credentials: invalid response shape", json);
            throw new Error("AUTH_INVALID_RESPONSE");
          }

          return {
            id: data.principalId,
            email: data.email,
            name: data.email.split("@")[0],
            portal,
          };
        } catch (err) {
          if (err instanceof Error) {
            throw err;
          }
          console.error("[NextAuth] verify-credentials fetch error:", err);
          throw new Error("AUTH_UPSTREAM_UNAVAILABLE");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as User;
        token.email = authUser.email;
        token.portal = authUser.portal;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as Session).user!.email = token.email as string;
        (session as Session).user!.portal = token.portal as PortalType | undefined;
      }
      return session;
    },
  },
};
