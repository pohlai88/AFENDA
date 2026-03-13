import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getEffectiveActiveOrganizationId,
  listOrganizationsForCurrentUser,
  setActiveOrganization,
} from "@/lib/auth/tenant-context";
import { isTenantRoutingV2Enabled } from "@/lib/feature-flags";

export const GET = auth(async function GET(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (!isTenantRoutingV2Enabled()) {
    return NextResponse.json({
      enabled: false,
      organizations: [],
      activeOrganizationId: null,
    });
  }

  const organizations = await listOrganizationsForCurrentUser();
  const activeOrganizationId = (await getEffectiveActiveOrganizationId()) ?? null;

  return NextResponse.json({
    enabled: true,
    organizations,
    activeOrganizationId,
  });
});

export const POST = auth(async function POST(req) {
  if (!req.auth?.user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (!isTenantRoutingV2Enabled()) {
    return NextResponse.json({ message: "Tenant routing v2 is disabled." }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const organizationId =
    typeof body === "object" && body !== null && "organizationId" in body
      ? String((body as { organizationId?: unknown }).organizationId ?? "").trim()
      : "";

  if (!organizationId) {
    return NextResponse.json({ message: "organizationId is required." }, { status: 400 });
  }

  const organizations = await listOrganizationsForCurrentUser();
  const canAccess = organizations.some((organization) => organization.id === organizationId);
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden organization." }, { status: 403 });
  }

  await setActiveOrganization(organizationId);

  return NextResponse.json({ ok: true, activeOrganizationId: organizationId });
});
