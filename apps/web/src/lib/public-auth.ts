import type {
  AcceptPortalInvitationCommand,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
  SignUpCommand,
} from "@afenda/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiErrorShape {
  error?: {
    code?: string;
    message?: string;
  };
}

async function parseApiError(response: Response): Promise<{ code: string; message: string }> {
  try {
    const payload = (await response.json()) as ApiErrorShape;
    return {
      code: payload.error?.code ?? `HTTP_${response.status}`,
      message: payload.error?.message ?? `Request failed with status ${response.status}`,
    };
  } catch {
    return {
      code: `HTTP_${response.status}`,
      message: `Request failed with status ${response.status}`,
    };
  }
}

function toApiError(details: { code: string; message: string }): Error {
  const err = new Error(details.message);
  err.name = details.code;
  return err;
}

export async function signUpPublic(command: SignUpCommand): Promise<{ orgSlug: string }> {
  const response = await fetch(`${API_BASE}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toApiError(await parseApiError(response));
  }

  const payload = (await response.json()) as { data: { orgSlug: string } };
  return { orgSlug: payload.data.orgSlug };
}

export async function requestPasswordResetPublic(
  command: RequestPasswordResetCommand,
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toApiError(await parseApiError(response));
  }
}

export async function resetPasswordPublic(command: ResetPasswordCommand): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toApiError(await parseApiError(response));
  }
}

export async function acceptPortalInvitationPublic(
  command: AcceptPortalInvitationCommand,
): Promise<{ portal: "supplier" | "customer" }> {
  const response = await fetch(`${API_BASE}/v1/auth/accept-portal-invitation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toApiError(await parseApiError(response));
  }

  const payload = (await response.json()) as { data: { portal: "supplier" | "customer" } };
  return payload.data;
}
