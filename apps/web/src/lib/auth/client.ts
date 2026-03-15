"use client";

import { createAuthClient } from "@neondatabase/auth/next";

export const neonAuthClient = createAuthClient();

export const {
  emailOtp,
  getSession,
  linkSocial,
  listAccounts,
  listSessions,
  organization,
  requestPasswordReset,
  revokeOtherSessions,
  revokeSession,
  revokeSessions,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  unlinkAccount,
  useActiveOrganization,
  useListOrganizations,
  useSession,
  verifyEmail,
} = neonAuthClient;

export type ClientFacadeResult<TData> = {
  data: TData | null;
  error: {
    message: string;
  } | null;
};

type OrganizationRole = "admin" | "member" | "owner";
type VerificationOtpType = "sign-in" | "email-verification" | "forget-password";

function hasMethod<TObject extends object>(
  value: TObject | null | undefined,
  key: string,
): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const method = (value as Record<string, unknown>)[key];
  return typeof method === "function";
}

export const neonClientCapabilities = {
  organization: {
    list: hasMethod(organization, "list"),
    setActive: hasMethod(organization, "setActive"),
    create: hasMethod(organization, "create"),
    inviteMember: hasMethod(organization, "inviteMember"),
  },
  emailOtp: {
    sendVerificationOtp: hasMethod(emailOtp, "sendVerificationOtp"),
    verifyEmail: hasMethod(emailOtp, "verifyEmail"),
  },
  signIn: {
    emailOtp: hasMethod(signIn, "emailOtp"),
  },
} as const;

function toClientFacadeError(error: unknown, fallback: string): { message: string } {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return { message };
    }
  }

  return { message: fallback };
}

async function runClientFacade<TData>(
  execute: () => Promise<{ data?: TData; error?: unknown }>,
  fallbackMessage: string,
): Promise<ClientFacadeResult<TData>> {
  try {
    const response = await execute();
    if (response.error) {
      return {
        data: null,
        error: toClientFacadeError(response.error, fallbackMessage),
      };
    }

    return {
      data: response.data ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toClientFacadeError(error, fallbackMessage),
    };
  }
}

function toOrganizationSlug(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "organization";
}

function toOrganizationRole(role?: string): OrganizationRole {
  const normalized = role?.trim().toLowerCase();
  if (normalized === "admin" || normalized === "owner" || normalized === "member") {
    return normalized;
  }

  return "member";
}

export async function getNeonClientAccountInfo() {
  return runClientFacade(() => neonAuthClient.accountInfo(), "Unable to load account information.");
}

export async function updateNeonClientUserProfile(input: { name?: string; image?: string }) {
  return runClientFacade(() => neonAuthClient.updateUser(input), "Unable to update user profile.");
}

export async function changeNeonClientPassword(input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}) {
  return runClientFacade(() => neonAuthClient.changePassword(input), "Unable to change password.");
}

export async function createNeonClientOrganization(input: { name: string; slug?: string }) {
  const slug = input.slug?.trim() || toOrganizationSlug(input.name);
  return runClientFacade(
    () => organization.create({ name: input.name, slug }),
    "Unable to create organization.",
  );
}

export async function listNeonClientOrganizations() {
  return runClientFacade(() => organization.list(), "Unable to list organizations.");
}

export async function updateNeonClientOrganization(input: {
  organizationId: string;
  name?: string;
  slug?: string;
  metadata?: Record<string, unknown>;
}) {
  return runClientFacade(
    () =>
      organization.update({
        organizationId: input.organizationId,
        data: {
          name: input.name,
          slug: input.slug,
          metadata: input.metadata,
        },
      }),
    "Unable to update organization.",
  );
}

export async function deleteNeonClientOrganization(input: { organizationId: string }) {
  return runClientFacade(() => organization.delete(input), "Unable to delete organization.");
}

export async function inviteNeonClientOrganizationMember(input: {
  organizationId: string;
  email: string;
  role?: string;
}) {
  return runClientFacade(
    () =>
      organization.inviteMember({
        organizationId: input.organizationId,
        email: input.email,
        role: toOrganizationRole(input.role),
      }),
    "Unable to invite organization member.",
  );
}

export async function listNeonClientOrganizationMembers(input: { organizationId: string }) {
  return runClientFacade(
    () =>
      organization.listMembers({
        query: {
          organizationId: input.organizationId,
        },
      }),
    "Unable to list organization members.",
  );
}

export async function updateNeonClientOrganizationMemberRole(input: {
  organizationId: string;
  memberId: string;
  role: string;
}) {
  return runClientFacade(
    () =>
      organization.updateMemberRole({
        organizationId: input.organizationId,
        memberId: input.memberId,
        role: toOrganizationRole(input.role),
      }),
    "Unable to update organization member role.",
  );
}

export async function removeNeonClientOrganizationMember(input: {
  organizationId: string;
  memberId: string;
}) {
  return runClientFacade(
    () =>
      organization.removeMember({
        organizationId: input.organizationId,
        memberIdOrEmail: input.memberId,
      }),
    "Unable to remove organization member.",
  );
}

export async function listNeonClientUserInvitations() {
  return runClientFacade(
    () => organization.listUserInvitations(),
    "Unable to list organization invitations.",
  );
}

export async function acceptNeonClientInvitation(input: { invitationId: string }) {
  return runClientFacade(
    () => organization.acceptInvitation(input),
    "Unable to accept organization invitation.",
  );
}

export async function rejectNeonClientInvitation(input: { invitationId: string }) {
  return runClientFacade(
    () => organization.rejectInvitation(input),
    "Unable to reject organization invitation.",
  );
}

export async function setNeonClientActiveOrganization(input: { organizationId: string }) {
  return runClientFacade(() => organization.setActive(input), "Unable to set active organization.");
}

export async function sendNeonClientVerificationOtp(input: {
  email: string;
  type: VerificationOtpType;
}) {
  return runClientFacade(
    () => emailOtp.sendVerificationOtp(input),
    "Unable to send verification code.",
  );
}

export async function verifyNeonClientEmailOtp(input: { email: string; otp: string }) {
  return runClientFacade(() => emailOtp.verifyEmail(input), "Unable to verify email code.");
}

export async function signInWithNeonClientEmailOtp(input: { email: string; otp: string }) {
  return runClientFacade(() => signIn.emailOtp(input), "Unable to sign in with email code.");
}
