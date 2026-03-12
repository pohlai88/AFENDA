"use server";

import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { auth } from "@/auth";
import { organizationCreateSchema, organizationInviteMemberSchema } from "../_lib/auth-schemas";

export type CreateOrganizationResult =
  | { ok: true; data?: { id?: string; name?: string; slug?: string } }
  | { ok: false; error: string };

/**
 * Create a new organization (Neon Auth auth.organization.create).
 * Available when the organizations plugin is enabled.
 */
export async function createOrganizationAction(
  _prevState: unknown,
  formData: FormData,
): Promise<CreateOrganizationResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to create an organization." };
  }

  const parsed = organizationCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      [first.name?.[0], first.slug?.[0]].filter(Boolean).join(" ") || "Invalid input.";
    return { ok: false, error: message };
  }

  const { name, slug } = parsed.data;
  const slugValue = slug?.trim() || undefined;

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Organizations are not configured." };
  }

  try {
    const orgApi = (
      neonAuth as unknown as {
        organization?: {
          create?: (opts: {
            name: string;
            slug?: string;
          }) => Promise<{ data?: unknown; error?: { message?: string } }>;
        };
      }
    ).organization;
    const create = orgApi?.create?.bind(orgApi);
    if (!create) {
      return {
        ok: false,
        error: "Create organization is not available. Enable the organizations plugin.",
      };
    }

    const { data, error } = await create({
      name,
      ...(slugValue ? { slug: slugValue } : {}),
    });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to create organization." };
    }

    return {
      ok: true,
      data: data as { id?: string; name?: string; slug?: string } | undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create organization.";
    return { ok: false, error: message };
  }
}

/** Organization item returned by auth.organization.list(). */
export interface OrganizationListItem {
  id?: string;
  name?: string;
  slug?: string;
  [key: string]: unknown;
}

export type ListOrganizationsResult =
  | { ok: true; organizations: OrganizationListItem[] }
  | { ok: false; error: string };

/**
 * List the current user's organizations (Neon Auth auth.organization.list).
 */
export async function listOrganizationsAction(): Promise<ListOrganizationsResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to list organizations." };
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Organizations are not configured." };
  }

  try {
    const orgApi = (
      neonAuth as unknown as {
        organization?: {
          list?: () => Promise<{ data?: OrganizationListItem[]; error?: { message?: string } }>;
        };
      }
    ).organization;
    const list = orgApi?.list?.bind(orgApi);
    if (!list) {
      return {
        ok: false,
        error: "List organizations is not available. Enable the organizations plugin.",
      };
    }

    const { data, error } = await list();

    if (error) {
      return { ok: false, error: error.message ?? "Failed to list organizations." };
    }

    return { ok: true, organizations: Array.isArray(data) ? data : [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list organizations.";
    return { ok: false, error: message };
  }
}

export type InviteMemberResult = { ok: true } | { ok: false; error: string };

/**
 * Invite a member to an organization (Neon Auth auth.organization.inviteMember).
 */
export async function inviteMemberAction(
  _prevState: unknown,
  formData: FormData,
): Promise<InviteMemberResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "You must be signed in to invite members." };
  }

  const parsed = organizationInviteMemberSchema.safeParse({
    organizationId: formData.get("organizationId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      [first.organizationId?.[0], first.email?.[0], first.role?.[0]].filter(Boolean).join(" ") ||
      "Invalid input.";
    return { ok: false, error: message };
  }

  const { organizationId, email, role } = parsed.data;
  const roleValue = role?.trim() || undefined;

  if (!isNeonAuthConfigured || !neonAuth) {
    return { ok: false, error: "Organizations are not configured." };
  }

  try {
    const orgApi = (
      neonAuth as unknown as {
        organization?: {
          inviteMember?: (opts: {
            organizationId: string;
            email: string;
            role?: string;
          }) => Promise<{ data?: unknown; error?: { message?: string } }>;
        };
      }
    ).organization;
    const inviteMember = orgApi?.inviteMember?.bind(orgApi);
    if (!inviteMember) {
      return {
        ok: false,
        error: "Invite member is not available. Enable the organizations plugin.",
      };
    }

    const { error } = await inviteMember({
      organizationId,
      email,
      ...(roleValue ? { role: roleValue } : {}),
    });

    if (error) {
      return { ok: false, error: error.message ?? "Failed to invite member." };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to invite member.";
    return { ok: false, error: message };
  }
}
