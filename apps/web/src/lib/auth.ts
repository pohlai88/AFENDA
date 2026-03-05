/**
 * NextAuth v4 configuration.
 *
 * Sprint 0: CredentialsProvider with email-only login (no password).
 * Sprint 1+: add password verification, DB adapter, and additional providers.
 *
 * Session strategy: JWT (so the API can verify tokens independently).
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@demo.afenda" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Sprint 0: accept any email — the API resolves the real user from DB.
        // In production, verify credentials against the database.
        return {
          id: credentials.email,
          email: credentials.email,
          name: credentials.email.split("@")[0],
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin", // custom sign-in page (Sprint 1+)
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
