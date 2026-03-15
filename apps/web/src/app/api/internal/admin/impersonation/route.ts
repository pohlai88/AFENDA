import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { publishAuthAuditEvent } from "@/features/auth/server/audit/audit.helpers";
import {
  AdminOperation,
  buildAdminAuditMetadata,
  hasAdminOperationAccess,
} from "../_lib/authorization";
import { stopNeonImpersonation } from "@/lib/auth/server";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!hasAdminOperationAccess(session, AdminOperation.STOP_IMPERSONATION)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const response = await stopNeonImpersonation();
  if (response.error) {
    return NextResponse.json({ message: response.error.message }, { status: 502 });
  }

  await publishAuthAuditEvent("auth.ops.admin_user_impersonation_stopped", {
    userId: session.user.id,
    email: session.user.email,
    metadata: buildAdminAuditMetadata(AdminOperation.STOP_IMPERSONATION),
  });

  return NextResponse.json({
    ok: true,
    result: response.data,
  });
}
