import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAuthorizedAdminOperationSession,
} from "../_lib/authorization";
import { parsePositiveInteger } from "../_lib/parse";
import { listNeonAdminUsers } from "@/lib/auth/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!hasAuthorizedAdminOperationSession(session, AdminOperation.LIST_USERS)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const offset = parsePositiveInteger(url.searchParams.get("offset"), 0);
  const limit = Math.min(100, Math.max(1, parsePositiveInteger(url.searchParams.get("limit"), 25)));

  const response = await listNeonAdminUsers({
    query: {
      searchValue: search,
      offset,
      limit,
    },
  });

  if (response.error) {
    return NextResponse.json(
      {
        message: response.error.message,
      },
      { status: 502 },
    );
  }

  await publishAuthAuditEvent("auth.ops.admin_users_listed", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.LIST_USERS, {
      search: search ?? null,
      offset,
      limit,
      total: response.data?.total ?? 0,
    }),
  });

  return NextResponse.json({
    users: response.data?.users ?? [],
    total: response.data?.total ?? 0,
    pagination: {
      offset,
      limit,
    },
  });
}
