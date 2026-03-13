"use server";

function resolveServerApiBase(): string {
  const explicitServerBase = process.env.AFENDA_API_URL ?? process.env.API_BASE_URL;
  if (explicitServerBase) return explicitServerBase;

  const publicBase = process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === "production") {
    return publicBase ?? "http://localhost:3001";
  }

  if (publicBase && /localhost|127\.0\.0\.1/i.test(publicBase)) {
    return publicBase;
  }

  return "http://localhost:3001";
}

interface EstablishWebSessionFromGrantInput {
  grant: string;
  redirectTo: string;
}

export async function establishWebSessionFromGrant(
  input: EstablishWebSessionFromGrantInput,
): Promise<void> {
  const baseUrl = resolveServerApiBase();

  const res = await fetch(`${baseUrl}/v1/auth/verify-session-grant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant: input.grant }),
    cache: "no-store",
  });

  const json = (await res.json()) as
    | { ok: true; data: { principalId: string; email: string; portal: string } }
    | { ok: false; code: string; message: string };

  if (!res.ok || !json.ok) {
    throw new Error("Unable to establish session from grant. Please sign in again.");
  }
}
