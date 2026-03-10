import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      portal?: "app" | "supplier" | "customer" | "cid" | "investor" | "franchisee" | "contractor";
    };
  }

  interface User {
    portal?: "app" | "supplier" | "customer" | "cid" | "investor" | "franchisee" | "contractor";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    portal?: "app" | "supplier" | "customer" | "cid" | "investor" | "franchisee" | "contractor";
  }
}
