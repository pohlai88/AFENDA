import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string;
    tenantSlug: string;
    portal: string;
    roles: string[];
    permissions: string[];
    accessToken?: string | null;
    refreshToken?: string | null;
    requiresMfa?: boolean;
    mfaToken?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tenantId: string;
      tenantSlug: string;
      portal: string;
      roles: string[];
      permissions: string[];
    };
    accessToken?: string | null;
    requiresMfa?: boolean;
    mfaToken?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    tenantSlug?: string;
    portal?: string;
    roles?: string[];
    permissions?: string[];
    accessToken?: string | null;
    refreshToken?: string | null;
    requiresMfa?: boolean;
    mfaToken?: string | null;
  }
}
