"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { auth as neonAuth, isNeonAuthConfigured } from "@/lib/auth/server";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  listOrganizationsForCurrentUser,
  resolvePostSelectionCallback,
  setActiveOrganization,
} from "@/lib/auth/tenant-context";

import { organizationCreateSchema } from "../_lib/auth-schemas";

function withError(path: string, errorCode: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(errorCode)}`;
}

async function safePublishRoutingTelemetry(event: "auth.signin.success" | "auth.signin.failure", payload: Parameters<typeof publishAuthAuditEvent>[1]) {
  try {
    await publishAuthAuditEvent(event, payload);
  } catch {
    // Best-effort telemetry only.
  }
}

export async function selectOrganizationAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const callbackUrl = String(formData.get("callback") ?? "").trim();

  if (!organizationId) {
    redirect(withError(`/auth/select-organization?callback=${encodeURIComponent(resolvePostSelectionCallback(callbackUrl))}`, "missing_org"));
  }

  const organizations = await listOrganizationsForCurrentUser();
  const canAccess = organizations.some((organization) => organization.id === organizationId);
  if (!canAccess) {
    redirect(withError(`/auth/select-organization?callback=${encodeURIComponent(resolvePostSelectionCallback(callbackUrl))}`, "forbidden_org"));
  }

  await setActiveOrganization(organizationId);

  await safePublishRoutingTelemetry("auth.signin.success", {
    email: session.user.email,
    userId: session.user.id,
    portal: "app",
    metadata: {
      metric: "select_org_success",
      organizationId,
    },
  });

  redirect(resolvePostSelectionCallback(callbackUrl));
}

export async function createOrganizationAndActivateAction(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const parsed = organizationCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect(withError("/auth/onboarding", "invalid_org_input"));
  }

  if (!isNeonAuthConfigured || !neonAuth) {
    redirect(withError("/auth/onboarding", "auth_not_configured"));
  }

  const orgApi = (neonAuth as unknown as {
    organization?: {
      create?: (opts: {
        name: string;
        slug?: string;
      }) => Promise<{ data?: { id?: string }; error?: { message?: string } }>;
    };
  }).organization;

  const create = orgApi?.create?.bind(orgApi);
  if (!create) {
    redirect(withError("/auth/onboarding", "org_plugin_unavailable"));
  }

  const { data, error } = await create({
    name: parsed.data.name,
    ...(parsed.data.slug ? { slug: parsed.data.slug } : {}),
  });

  if (error || !data?.id) {
    redirect(withError("/auth/onboarding", "create_org_failed"));
  }

  await setActiveOrganization(data.id);
  redirect("/app");
}
