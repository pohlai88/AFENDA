import type { DbClient } from "@afenda/db";
import { hrmCertifications } from "@afenda/db";
import { and, desc, eq } from "drizzle-orm";

export interface ListCertificationsByEmployeeParams {
  orgId: string;
  employmentId: string;
  limit: number;
  offset: number;
}

export interface CertificationView {
  certificationId: string;
  employmentId: string;
  certificationCode: string;
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export async function listCertificationsByEmployee(
  db: DbClient,
  params: ListCertificationsByEmployeeParams,
): Promise<CertificationView[]> {
  const rows = await db
    .select({
      certificationId: hrmCertifications.id,
      employmentId: hrmCertifications.employmentId,
      certificationCode: hrmCertifications.certificationCode,
      issuedAt: hrmCertifications.issuedAt,
      expiresAt: hrmCertifications.expiresAt,
      createdAt: hrmCertifications.createdAt,
    })
    .from(hrmCertifications)
    .where(
      and(
        eq(hrmCertifications.orgId, params.orgId),
        eq(hrmCertifications.employmentId, params.employmentId),
      ),
    )
    .orderBy(desc(hrmCertifications.issuedAt))
    .limit(params.limit)
    .offset(params.offset);

  return rows.map((r) => ({
    certificationId: r.certificationId,
    employmentId: r.employmentId,
    certificationCode: r.certificationCode,
    issuedAt: String(r.issuedAt),
    expiresAt: r.expiresAt ? String(r.expiresAt) : null,
    createdAt: r.createdAt.toISOString(),
  }));
}
