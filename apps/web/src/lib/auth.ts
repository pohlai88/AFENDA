/**
 * NextAuth v4 configuration.
 *
 * Providers:
 * - CredentialsProvider: email + password verified via API verify-credentials
 * - GoogleProvider: OAuth 2.0 authentication via Google
 * - GitHubProvider: OAuth 2.0 authentication via GitHub
 * 
 * Session strategy: JWT (so the API can verify tokens independently).
 */

import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PortalTypeValues, type PortalType } from "@afenda/contracts";

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
          typeof rawPortal === "string" && PortalTypeValues.includes(rawPortal as PortalType)
            ? (rawPortal as PortalType)
            : "app";

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
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
    async jwt({ token, user, account }) {
      if (user) {
        const authUser = user as User;
        token.email = authUser.email;
        
        // For OAuth providers (Google, GitHub), default to "app" portal
        // For Credentials provider, use the portal from authorize()
        if (account?.provider === "google" || account?.provider === "github") {
          token.portal = "app";
          token.provider = account.provider;
        } else {
          token.portal = authUser.portal;
          token.provider = "credentials";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as Session).user!.email = token.email as string;
        (session as Session).user!.portal = (token.portal as PortalType | undefined) ?? "app";
      }
      return session;
    },
  },
};
