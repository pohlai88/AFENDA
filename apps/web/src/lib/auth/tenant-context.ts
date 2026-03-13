import { cookies } from "next/headers";

import { auth as neonAuth, isNeonAuthConfigured } from "./server";

export const ACTIVE_ORG_COOKIE_NAME = "active_org";

export interface UserOrganization {
  id: string;
  name: string;
  slug?: string;
}

function normalizeCallbackPath(callbackUrl?: string | null): string {
  if (!callbackUrl || !callbackUrl.startsWith("/")) return "/app";
  if (callbackUrl.startsWith("/auth/")) return "/app";
  return callbackUrl;
}

function getOrganizationApi() {
  return (
    neonAuth as unknown as {
      organization?: {
        list?: () => Promise<{
          data?: Array<{ id?: string; name?: string; slug?: string }>;
          error?: { message?: string };
        }>;
        setActive?: (opts: { organizationId: string }) => Promise<{ error?: { message?: string } }>;
        setActiveOrganization?: (opts: {
          organizationId: string;
        }) => Promise<{ error?: { message?: string } }>;
      };
    }
  ).organization;
}

export async function listOrganizationsForCurrentUser(): Promise<UserOrganization[]> {
  if (!isNeonAuthConfigured || !neonAuth) {
    return [];
  }

  const organizationApi = getOrganizationApi();
  const list = organizationApi?.list?.bind(organizationApi);
  if (!list) {
    return [];
  }

  const { data, error } = await list();
  if (error || !Array.isArray(data)) {
    return [];
  }

  return data
    .filter(
      (org): org is { id: string; name?: string; slug?: string } =>
        typeof org?.id === "string" && org.id.length > 0,
    )
    .map((org) => ({
      id: org.id,
      name: org.name?.trim() || "Untitled organization",
      slug: org.slug,
    }));
}

export async function getActiveOrganizationIdFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value;
}

export async function getActiveOrganizationIdFromNeon(): Promise<string | undefined> {
  if (!isNeonAuthConfigured || !neonAuth) {
    return undefined;
  }

  const result = await neonAuth.getSession();
  if (result.error || !result.data?.session) {
    return undefined;
  }

  // activeOrganizationId is not directly available on Better Auth session
  // Fall back to cookie-based organization context
  return undefined;
}

export async function getEffectiveActiveOrganizationId(): Promise<string | undefined> {
  return (await getActiveOrganizationIdFromNeon()) ?? (await getActiveOrganizationIdFromCookie());
}

export async function setActiveOrganizationCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, orgId, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveOrganizationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE_NAME);
}

export async function setActiveOrganization(orgId: string): Promise<void> {
  if (!orgId) {
    throw new Error("Organization id is required.");
  }

  if (isNeonAuthConfigured && neonAuth) {
    const organizationApi = getOrganizationApi();

    const setActive = organizationApi?.setActive?.bind(organizationApi);
    if (setActive) {
      await setActive({ organizationId: orgId });
    } else {
      const setActiveOrganization = organizationApi?.setActiveOrganization?.bind(organizationApi);
      if (setActiveOrganization) {
        await setActiveOrganization({ organizationId: orgId });
      }
    }
  }

  await setActiveOrganizationCookie(orgId);
}

export function buildSelectOrganizationRedirect(callbackUrl?: string | null): string {
  const safeCallback = normalizeCallbackPath(callbackUrl);
  return `/auth/select-organization?callback=${encodeURIComponent(safeCallback)}`;
}

export function resolvePostSelectionCallback(callbackUrl?: string | null): string {
  return normalizeCallbackPath(callbackUrl);
}
