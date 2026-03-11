import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { authConfig } from "@/features/auth/server/auth-options";

const oauthProviders = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  oauthProviders.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  oauthProviders.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...oauthProviders,
    Credentials({
      id: "credentials",
      name: "AFENDA Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
        callbackUrl: { label: "Callback URL", type: "text" },
      },
      async authorize(rawCredentials) {
        return authConfig.authorizeCredentials(rawCredentials);
      },
    }),
    Credentials({
      id: "afenda-grant",
      name: "AFENDA Session Grant",
      credentials: {
        grant: { label: "Session Grant", type: "text" },
        redirectTo: { label: "Redirect To", type: "text" },
      },
      async authorize(rawCredentials) {
        return authConfig.authorizeSessionGrant(rawCredentials);
      },
    }),
  ],
});
