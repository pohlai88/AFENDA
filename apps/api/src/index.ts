import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

// OTel bootstrap is handled by --import ./src/otel-preload.ts
// (must run before static imports so http/pg can be monkey-patched)

import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { validatorCompiler, serializerCompiler } from "fastify-type-provider-zod";
import { z } from "zod";
import { OrgIdHeader } from "@afenda/contracts";
import { validateEnv, ApiEnvSchema, checkDbHealth, resolveOrgId, redactEnv } from "@afenda/core";

// Plugins
import { dbPlugin } from "./plugins/db.js";
import { headersPlugin } from "./plugins/headers.js";
import { authPlugin } from "./plugins/auth.js";
import { idempotencyPlugin } from "./plugins/idempotency.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { otelEnrichmentPlugin } from "./plugins/otel.js";

// Helpers
import { ERR } from "./helpers/responses.js";
import { createBoundedCache } from "./helpers/cache.js";

// Routes
import { authRoutes } from "./routes/kernel/auth.js";
import { evidenceRoutes } from "./routes/kernel/evidence.js";
import { iamRoutes } from "./routes/kernel/identity.js";
import { invoiceRoutes } from "./routes/erp/finance/ap.js";
import { glRoutes } from "./routes/erp/finance/gl.js";
import { treasuryRoutes } from "./routes/erp/finance/treasury.js";
import { auditRoutes } from "./routes/kernel/audit.js";
import { capabilitiesRoutes } from "./routes/kernel/capabilities.js";
import { supplierRoutes } from "./routes/erp/supplier.js";
import { settingsRoutes } from "./routes/kernel/settings.js";
import { customFieldRoutes } from "./routes/kernel/custom-fields.js";
import { organizationRoutes } from "./routes/kernel/organization.js";
import { numberingRoutes } from "./routes/kernel/numbering.js";
import { exportPdfRoutes } from "./routes/kernel/export-pdf.js";
// AP sub-entity routes
import { holdRoutes } from "./routes/erp/finance/ap/hold.js";
import { invoiceLineRoutes } from "./routes/erp/finance/ap/invoice-line.js";
import { matchToleranceRoutes } from "./routes/erp/finance/ap/match-tolerance.js";
import { paymentRunRoutes } from "./routes/erp/finance/ap/payment-run.js";
import { paymentRunItemRoutes } from "./routes/erp/finance/ap/payment-run-item.js";
import { paymentTermsRoutes } from "./routes/erp/finance/ap/payment-terms.js";
import { prepaymentRoutes } from "./routes/erp/finance/ap/prepayment.js";
import { whtCertificateRoutes } from "./routes/erp/finance/ap/wht-certificate.js";
import apAgingRoutes from "./routes/erp/finance/ap/aging-routes.js";
import { purchaseOrderRoutes } from "./routes/erp/purchasing/purchase-order.js";
import { receiptRoutes } from "./routes/erp/purchasing/receipt.js";
import { hrAcceptOfferRoutes } from "./routes/erp/hr/accept-offer.js";
import { hrApproveRequisitionRoutes } from "./routes/erp/hr/approve-requisition.js";
import { hrCreatePersonRoutes } from "./routes/erp/hr/create-person.js";
import { hrRecordPersonIdentityRoutes } from "./routes/erp/hr/record-person-identity.js";
import { hrListPersonIdentitiesRoutes } from "./routes/erp/hr/list-person-identities.js";
import { hrAddPersonAddressRoutes } from "./routes/erp/hr/add-person-address.js";
import { hrListPersonAddressesRoutes } from "./routes/erp/hr/list-person-addresses.js";
import { hrAddEmergencyContactRoutes } from "./routes/erp/hr/add-emergency-contact.js";
import { hrListEmergencyContactsRoutes } from "./routes/erp/hr/list-emergency-contacts.js";
import { hrAddDependentRoutes } from "./routes/erp/hr/add-dependent.js";
import { hrListDependentsRoutes } from "./routes/erp/hr/list-dependents.js";
import { hrAddEmployeeDocumentRoutes } from "./routes/erp/hr/add-employee-document.js";
import { hrListEmployeeDocumentsRoutes } from "./routes/erp/hr/list-employee-documents.js";
import { hrAssignPositionRoutes } from "./routes/erp/hr/assign-position.js";
import { hrAssignWorkRoutes } from "./routes/erp/hr/assign-work.js";
import { hrClosePositionRoutes } from "./routes/erp/hr/close-position.js";
import { hrClearExitItemRoutes } from "./routes/erp/hr/clear-exit-item.js";
import { hrCompleteOnboardingTaskRoutes } from "./routes/erp/hr/complete-onboarding-task.js";
import { hrCreateCandidateRoutes } from "./routes/erp/hr/create-candidate.js";
import { hrCreateGradeRoutes } from "./routes/erp/hr/create-grade.js";
import { hrCreateJobRoutes } from "./routes/erp/hr/create-job.js";
import { hrCreateOrgUnitRoutes } from "./routes/erp/hr/create-org-unit.js";
import { hrCreatePositionRoutes } from "./routes/erp/hr/create-position.js";
import { hrCreateRequisitionRoutes } from "./routes/erp/hr/create-requisition.js";
import { hrGetCandidatePipelineRoutes } from "./routes/erp/hr/get-candidate-pipeline.js";
import { hrGetApplicationRoutes } from "./routes/erp/hr/get-application.js";
import { hrGetEmployeeProfileRoutes } from "./routes/erp/hr/get-employee-profile.js";
import { hrGetEmploymentTimelineRoutes } from "./routes/erp/hr/get-employment-timeline.js";
import { hrGetOnboardingChecklistRoutes } from "./routes/erp/hr/get-onboarding-checklist.js";
import { hrGetOrgTreeRoutes } from "./routes/erp/hr/get-org-tree.js";
import { hrGetPositionIncumbencyRoutes } from "./routes/erp/hr/get-position-incumbency.js";
import { hrGetRequisitionRoutes } from "./routes/erp/hr/get-requisition.js";
import { hrGetSeparationCaseRoutes } from "./routes/erp/hr/get-separation-case.js";
import { hrHireEmployeeRoutes } from "./routes/erp/hr/hire-employee.js";
import { hrIssueOfferRoutes } from "./routes/erp/hr/issue-offer.js";
import { hrListEmployeesRoutes } from "./routes/erp/hr/list-employees.js";
import { hrListPendingOnboardingRoutes } from "./routes/erp/hr/list-pending-onboarding.js";
import { hrListPositionsRoutes } from "./routes/erp/hr/list-positions.js";
import { hrListRequisitionsRoutes } from "./routes/erp/hr/list-requisitions.js";
import { hrListAttendanceRecordsRoutes } from "./routes/erp/hr/list-attendance-records.js";
import { hrListRosterAssignmentsRoutes } from "./routes/erp/hr/list-roster-assignments.js";
import { hrListLeaveRequestsRoutes } from "./routes/erp/hr/list-leave-requests.js";
import { hrListLeaveBalancesRoutes } from "./routes/erp/hr/list-leave-balances.js";
import { hrRecordProbationReviewRoutes } from "./routes/erp/hr/record-probation-review.js";
import { hrRehireEmployeeRoutes } from "./routes/erp/hr/rehire-employee.js";
import { hrScheduleInterviewRoutes } from "./routes/erp/hr/schedule-interview.js";
import { hrStartOnboardingRoutes } from "./routes/erp/hr/start-onboarding.js";
import { hrStartSeparationRoutes } from "./routes/erp/hr/start-separation.js";
import { hrSubmitApplicationRoutes } from "./routes/erp/hr/submit-application.js";
import { hrSubmitInterviewFeedbackRoutes } from "./routes/erp/hr/submit-feedback.js";
import { hrTerminateEmploymentRoutes } from "./routes/erp/hr/terminate-employment.js";
import { hrSuspendEmploymentRoutes } from "./routes/erp/hr/suspend-employment.js";
import { hrResumeEmploymentRoutes } from "./routes/erp/hr/resume-employment.js";
import { hrFinalizeSeparationRoutes } from "./routes/erp/hr/finalize-separation.js";
import { hrTransferEmployeeRoutes } from "./routes/erp/hr/transfer-employee.js";
import { hrPromoteEmployeeRoutes } from "./routes/erp/hr/promote-employee.js";
import { hrAddEmploymentContractRoutes } from "./routes/erp/hr/add-employment-contract.js";
import { hrChangeEmploymentTermsRoutes } from "./routes/erp/hr/change-employment-terms.js";
import { hrRecordAttendanceRoutes } from "./routes/erp/hr/record-attendance.js";
import { hrCreateRosterAssignmentRoutes } from "./routes/erp/hr/create-roster-assignment.js";
import { hrCreateLeaveRequestRoutes } from "./routes/erp/hr/create-leave-request.js";
import { hrApproveLeaveRequestRoutes } from "./routes/erp/hr/approve-leave-request.js";
import { hrRecalculateLeaveBalanceRoutes } from "./routes/erp/hr/recalculate-leave-balance.js";
import { hrCreateCompensationStructureRoutes } from "./routes/erp/hr/create-compensation-structure.js";
import { hrAssignCompensationPackageRoutes } from "./routes/erp/hr/assign-compensation-package.js";
import { hrProcessSalaryChangeRoutes } from "./routes/erp/hr/process-salary-change.js";
import { hrCreateBenefitPlanRoutes } from "./routes/erp/hr/create-benefit-plan.js";
import { hrEnrollBenefitRoutes } from "./routes/erp/hr/enroll-benefit.js";
import { hrListCompensationStructuresRoutes } from "./routes/erp/hr/list-compensation-structures.js";
import { hrListCompensationPackagesRoutes } from "./routes/erp/hr/list-compensation-packages.js";
import { hrListSalaryHistoryRoutes } from "./routes/erp/hr/list-salary-history.js";
import { hrListBenefitEnrollmentsRoutes } from "./routes/erp/hr/list-benefit-enrollments.js";
import { hrOpenPayrollPeriodRoutes } from "./routes/erp/hr/open-payroll-period.js";
import { hrLockPayrollPeriodRoutes } from "./routes/erp/hr/lock-payroll-period.js";
import { hrCreatePayrollRunRoutes } from "./routes/erp/hr/create-payroll-run.js";
import { hrSubmitPayrollRunRoutes } from "./routes/erp/hr/submit-payroll-run.js";
import { hrApprovePayrollRunRoutes } from "./routes/erp/hr/approve-payroll-run.js";
import { hrListPayrollPeriodsRoutes } from "./routes/erp/hr/list-payroll-periods.js";
import { hrGetPayrollRunRoutes } from "./routes/erp/hr/get-payroll-run.js";
import { hrListPayrollRunEmployeesRoutes } from "./routes/erp/hr/list-payroll-run-employees.js";
import { hrListPayrollInputsRoutes } from "./routes/erp/hr/list-payroll-inputs.js";
import { hrPublishPayslipsRoutes } from "./routes/erp/hr/publish-payslips.js";
import { hrGeneratePaymentBatchRoutes } from "./routes/erp/hr/generate-payment-batch.js";
import { hrPostPayrollToGlRoutes } from "./routes/erp/hr/post-payroll-to-gl.js";
import { hrCreateReviewCycleRoutes } from "./routes/erp/hr/create-review-cycle.js";
import { hrListReviewCyclesRoutes } from "./routes/erp/hr/list-review-cycles.js";
import { hrCreatePerformanceReviewRoutes } from "./routes/erp/hr/create-performance-review.js";
import { hrSubmitSelfReviewRoutes } from "./routes/erp/hr/submit-self-review.js";
import { hrCompleteManagerReviewRoutes } from "./routes/erp/hr/complete-manager-review.js";
import { hrCreateGoalRoutes } from "./routes/erp/hr/create-goal.js";
import { hrGetPerformanceReviewRoutes } from "./routes/erp/hr/get-performance-review.js";
import { hrListReviewsByEmployeeRoutes } from "./routes/erp/hr/list-reviews-by-employee.js";
import { hrListManagerReviewQueueRoutes } from "./routes/erp/hr/list-manager-review-queue.js";
import { hrCreateTalentProfileRoutes } from "./routes/erp/hr/create-talent-profile.js";
import { hrCreateSuccessionPlanRoutes } from "./routes/erp/hr/create-succession-plan.js";
import { hrNominateSuccessorRoutes } from "./routes/erp/hr/nominate-successor.js";
import { hrGetTalentProfileRoutes } from "./routes/erp/hr/get-talent-profile.js";
import { hrListSuccessionPlansRoutes } from "./routes/erp/hr/list-succession-plans.js";
import { hrListSuccessorsForPositionRoutes } from "./routes/erp/hr/list-successors-for-position.js";
import { hrCreateCourseRoutes } from "./routes/erp/hr/create-course.js";
import { hrCreateCourseSessionRoutes } from "./routes/erp/hr/create-course-session.js";
import { hrEnrollLearnerRoutes } from "./routes/erp/hr/enroll-learner.js";
import { hrRecordCompletionRoutes } from "./routes/erp/hr/record-completion.js";
import { hrRecordCertificationRoutes } from "./routes/erp/hr/record-certification.js";
import { hrListCoursesRoutes } from "./routes/erp/hr/list-courses.js";
import { hrListEnrollmentsRoutes } from "./routes/erp/hr/list-enrollments.js";
import { hrListCertificationsByEmployeeRoutes } from "./routes/erp/hr/list-certifications-by-employee.js";
import { hrCreatePolicyDocumentRoutes } from "./routes/erp/hr/create-policy-document.js";
import { hrRecordPolicyAcknowledgementRoutes } from "./routes/erp/hr/record-policy-acknowledgement.js";
import { hrCreateComplianceCheckRoutes } from "./routes/erp/hr/create-compliance-check.js";
import { hrRecordWorkPermitRoutes } from "./routes/erp/hr/record-work-permit.js";
import { hrListPolicyAcknowledgementsRoutes } from "./routes/erp/hr/list-policy-acknowledgements.js";
import { hrListComplianceChecksByEmployeeRoutes } from "./routes/erp/hr/list-compliance-checks-by-employee.js";
import { hrListOverdueComplianceChecksRoutes } from "./routes/erp/hr/list-overdue-compliance-checks.js";
import { hrCreateGrievanceCaseRoutes } from "./routes/erp/hr/create-grievance-case.js";
import { hrCreateDisciplinaryActionRoutes } from "./routes/erp/hr/create-disciplinary-action.js";
import { hrAttachEvidenceRoutes } from "./routes/erp/hr/attach-evidence.js";
import { hrCloseGrievanceCaseRoutes } from "./routes/erp/hr/close-grievance-case.js";
import { hrCloseDisciplinaryActionRoutes } from "./routes/erp/hr/close-disciplinary-action.js";
import { hrListCasesByEmployeeRoutes } from "./routes/erp/hr/list-cases-by-employee.js";
import { hrListOpenGrievanceCasesRoutes } from "./routes/erp/hr/list-open-grievance-cases.js";
import { hrListOpenDisciplinaryActionsRoutes } from "./routes/erp/hr/list-open-disciplinary-actions.js";
import { hrListCaseEvidenceRoutes } from "./routes/erp/hr/list-case-evidence.js";
import { hrCreateWorkforcePlanRoutes } from "./routes/erp/hr/create-workforce-plan.js";
import { hrCreateScenarioRoutes } from "./routes/erp/hr/create-scenario.js";
import { hrSetPositionBudgetRoutes } from "./routes/erp/hr/set-position-budget.js";
import { hrCreateHiringForecastRoutes } from "./routes/erp/hr/create-hiring-forecast.js";
import { hrListWorkforcePlansRoutes } from "./routes/erp/hr/list-workforce-plans.js";
import { hrGetScenarioProjectionRoutes } from "./routes/erp/hr/get-scenario-projection.js";
import { hrListHeadcountByOrgRoutes } from "./routes/erp/hr/list-headcount-by-org.js";
// Supplier sub-entity routes (templates — uncomment when implemented)
// import { supplierSiteRoutes } from "./routes/erp/supplier/supplier-site.js";
// import { supplierBankAccountRoutes } from "./routes/erp/supplier/supplier-bank-account.js";
import { commTaskRoutes } from "./routes/comm/tasks.js";
import { commProjectRoutes } from "./routes/comm/projects.js";
import { commApprovalRoutes } from "./routes/comm/approvals.js";
import { commAnnouncementRoutes } from "./routes/comm/announcements.js";
import { commDocumentRoutes } from "./routes/comm/docs.js";
import { commBoardMeetingRoutes } from "./routes/comm/boardroom/meeting.js";
import { commSharedRoutes } from "./routes/comm/shared.js";
import { commWorkflowRoutes } from "./routes/comm/workflows.js";

// Type augmentations (side-effect import — registers Fastify generics)
import "./types.js";

// ── Validate environment before anything else ────────────────────────────────
const env = validateEnv(ApiEnvSchema);

const isDev = process.env.NODE_ENV !== "production";

// ─── Build app (exported for testing) ────────────────────────────────────────
export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
      ...(isDev
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            },
          }
        : {}),
    },
  });

  // ── Zod type provider — auto-validates request body/querystring/params ────
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ── Plugins — registration order determines onRequest hook firing order ─────
  //
  //   1. dbPlugin          → decorates app.db (sync, no hooks)
  //   2. CORS              → preflight + headers (onRequest)
  //   3. headersPlugin     → onRequest: set req.correlationId + mirror x-request-id/x-correlation-id
  //   4. orgSlug           → onRequest: set req.orgSlug / req.orgId
  //   5. authPlugin        → onRequest: reads correlationId+orgSlug, sets req.ctx
  //   6. rateLimit         → onRequest: keys by req.ctx.principalId (set by step 5)
  //   7. idempotencyPlugin → preHandler: dedup writes

  await app.register(dbPlugin as any);

  // ── OpenAPI spec + Scalar docs UI ──────────────────────────────────────────
  await app.register(swaggerPlugin as any);

  // ── CORS ───────────────────────────────────────────────────────────────────
  if (!isDev && env.ALLOWED_ORIGINS.length === 0) {
    throw new Error("ALLOWED_ORIGINS must be set in production");
  }

  await app.register(cors as any, {
    origin: env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : isDev,
    credentials: true,
  });

  // ── Canonical wire headers (request/correlation IDs) ─────────────────────
  await app.register(headersPlugin as any);

  // ── Org slug → UUID resolution (ADR-0003) ─────────────────────────────────
  // Bounded cache with LRU eviction (max 1000 entries, prevents memory leak)
  const orgCache = createBoundedCache<string, string>(1000);

  app.addHook("onRequest", async (req) => {
    const host = req.hostname ?? "";
    const subdomainMatch = host.match(/^([^.]+)\./);
    const slug = subdomainMatch?.[1] ?? (req.headers[OrgIdHeader] as string | undefined) ?? "demo";

    req.orgSlug = slug;

    // Resolve UUID (cached)
    if (orgCache.has(slug)) {
      req.orgId = orgCache.get(slug);
    } else {
      const id = await resolveOrgId(app.db, slug);
      if (id) {
        orgCache.set(slug, id);
        req.orgId = id;
      }
    }
  });

  // ── Auth (onRequest — must be after correlationId + orgSlug hooks) ─────────
  await app.register(authPlugin as any);

  // ── OTel enrichment (after auth — stamps org/principal/correlationId on span)
  await app.register(otelEnrichmentPlugin);

  // ── Rate limiting (onRequest — must be after authPlugin so req.ctx is set) ─
  // Unauthenticated requests: 100 req/min (keyed by IP).
  // Authenticated requests:   300 req/min (keyed by principalId).
  // Per-route overrides are set via route config.rateLimit.
  await app.register(rateLimit as any, {
    global: true,
    max: (req: any) => (req.ctx?.principalId ? 300 : 100),
    timeWindow: "1 minute",
    keyGenerator: (req: any) => req.ctx?.principalId ?? req.ip,
  });

  // ── Idempotency ────────────────────────────────────────────────────────────
  await app.register(idempotencyPlugin as any);

  // ── Error envelope (Stripe-inspired) ──────────────────────────────────────
  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    const correlationId = req.correlationId ?? crypto.randomUUID();
    const statusCode = err.statusCode ?? 500;

    app.log.error({ correlationId, err }, "request error");

    const message = statusCode >= 500 ? "Internal server error" : err.message;

    reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? ERR.INTERNAL : ERR.VALIDATION,
        message,
      },
      correlationId,
    });
  });

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get(
    "/healthz",
    {
      schema: {
        description: "Liveness probe — returns 200 if the process is alive.",
        tags: ["Health"],
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    async () => ({ ok: true }),
  );

  app.get(
    "/readyz",
    {
      schema: {
        description: "Readiness probe — returns 200 if DB connection and migrations are current.",
        tags: ["Health"],
        response: {
          200: z.object({
            ok: z.boolean(),
            db: z.string(),
            latencyMs: z.number(),
            migrationHash: z.string().nullable(),
            migratedAt: z.number().nullable(),
          }),
        },
      },
    },
    async () => {
      const health = await checkDbHealth(app.db);
      return {
        ok: health.ok,
        db: health.ok ? "connected" : "error",
        latencyMs: health.latencyMs,
        migrationHash: health.migrationHash ?? null,
        migratedAt: health.migratedAt ?? null,
      };
    },
  );

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.get(
    "/v1",
    {
      schema: {
        description: "API version info.",
        tags: ["Health"],
        response: {
          200: z.object({
            service: z.string(),
            version: z.string(),
            timestamp: z.string().datetime(),
          }),
        },
      },
    },
    async () => ({
      service: "afenda-api",
      version: "v1",
      timestamp: new Date().toISOString(),
    }),
  );

  // ── Domain routes ──────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/v1" });
  await app.register(evidenceRoutes, { prefix: "/v1" });
  await app.register(iamRoutes, { prefix: "/v1" });
  await app.register(invoiceRoutes, { prefix: "/v1" });
  await app.register(glRoutes, { prefix: "/v1" });
  await app.register(treasuryRoutes, { prefix: "/v1" });
  await app.register(auditRoutes, { prefix: "/v1" });
  await app.register(capabilitiesRoutes, { prefix: "/v1" });
  await app.register(supplierRoutes, { prefix: "/v1" });
  await app.register(settingsRoutes, { prefix: "/v1" });
  await app.register(customFieldRoutes, { prefix: "/v1" });
  await app.register(organizationRoutes, { prefix: "/v1" });
  await app.register(numberingRoutes, { prefix: "/v1" });
  await app.register(exportPdfRoutes, { prefix: "/v1" });
  // AP sub-entity routes
  await app.register(holdRoutes, { prefix: "/v1" });
  await app.register(invoiceLineRoutes, { prefix: "/v1" });
  await app.register(matchToleranceRoutes, { prefix: "/v1" });
  await app.register(paymentRunRoutes, { prefix: "/v1" });
  await app.register(paymentRunItemRoutes, { prefix: "/v1" });
  await app.register(paymentTermsRoutes, { prefix: "/v1" });
  await app.register(prepaymentRoutes, { prefix: "/v1" });
  await app.register(whtCertificateRoutes, { prefix: "/v1" });
  await app.register(apAgingRoutes);
  await app.register(purchaseOrderRoutes, { prefix: "/v1" });
  await app.register(receiptRoutes, { prefix: "/v1" });
  await app.register(hrAcceptOfferRoutes, { prefix: "/v1" });
  await app.register(hrApproveRequisitionRoutes, { prefix: "/v1" });
  await app.register(hrAssignPositionRoutes, { prefix: "/v1" });
  await app.register(hrAssignWorkRoutes, { prefix: "/v1" });
  await app.register(hrClosePositionRoutes, { prefix: "/v1" });
  await app.register(hrClearExitItemRoutes, { prefix: "/v1" });
  await app.register(hrCompleteOnboardingTaskRoutes, { prefix: "/v1" });
  await app.register(hrCreateCandidateRoutes, { prefix: "/v1" });
  await app.register(hrCreateGradeRoutes, { prefix: "/v1" });
  await app.register(hrCreateJobRoutes, { prefix: "/v1" });
  await app.register(hrCreateOrgUnitRoutes, { prefix: "/v1" });
  await app.register(hrCreatePositionRoutes, { prefix: "/v1" });
  await app.register(hrCreatePersonRoutes, { prefix: "/v1" });
  await app.register(hrRecordPersonIdentityRoutes, { prefix: "/v1" });
  await app.register(hrListPersonIdentitiesRoutes, { prefix: "/v1" });
  await app.register(hrAddPersonAddressRoutes, { prefix: "/v1" });
  await app.register(hrListPersonAddressesRoutes, { prefix: "/v1" });
  await app.register(hrAddEmergencyContactRoutes, { prefix: "/v1" });
  await app.register(hrListEmergencyContactsRoutes, { prefix: "/v1" });
  await app.register(hrAddDependentRoutes, { prefix: "/v1" });
  await app.register(hrListDependentsRoutes, { prefix: "/v1" });
  await app.register(hrAddEmployeeDocumentRoutes, { prefix: "/v1" });
  await app.register(hrListEmployeeDocumentsRoutes, { prefix: "/v1" });
  await app.register(hrCreateRequisitionRoutes, { prefix: "/v1" });
  await app.register(hrFinalizeSeparationRoutes, { prefix: "/v1" });
  await app.register(hrGetCandidatePipelineRoutes, { prefix: "/v1" });
  await app.register(hrGetApplicationRoutes, { prefix: "/v1" });
  await app.register(hrGetEmployeeProfileRoutes, { prefix: "/v1" });
  await app.register(hrGetEmploymentTimelineRoutes, { prefix: "/v1" });
  await app.register(hrGetOnboardingChecklistRoutes, { prefix: "/v1" });
  await app.register(hrGetOrgTreeRoutes, { prefix: "/v1" });
  await app.register(hrGetPositionIncumbencyRoutes, { prefix: "/v1" });
  await app.register(hrGetRequisitionRoutes, { prefix: "/v1" });
  await app.register(hrGetSeparationCaseRoutes, { prefix: "/v1" });
  await app.register(hrHireEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrIssueOfferRoutes, { prefix: "/v1" });
  await app.register(hrListEmployeesRoutes, { prefix: "/v1" });
  await app.register(hrListPendingOnboardingRoutes, { prefix: "/v1" });
  await app.register(hrListPositionsRoutes, { prefix: "/v1" });
  await app.register(hrListRequisitionsRoutes, { prefix: "/v1" });
  await app.register(hrListAttendanceRecordsRoutes, { prefix: "/v1" });
  await app.register(hrListRosterAssignmentsRoutes, { prefix: "/v1" });
  await app.register(hrListLeaveBalancesRoutes, { prefix: "/v1" });
  await app.register(hrListLeaveRequestsRoutes, { prefix: "/v1" });
  await app.register(hrRecordProbationReviewRoutes, { prefix: "/v1" });
  await app.register(hrRehireEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrRecordAttendanceRoutes, { prefix: "/v1" });
  await app.register(hrCreateRosterAssignmentRoutes, { prefix: "/v1" });
  await app.register(hrScheduleInterviewRoutes, { prefix: "/v1" });
  await app.register(hrStartOnboardingRoutes, { prefix: "/v1" });
  await app.register(hrStartSeparationRoutes, { prefix: "/v1" });
  await app.register(hrCreateLeaveRequestRoutes, { prefix: "/v1" });
  await app.register(hrApproveLeaveRequestRoutes, { prefix: "/v1" });
  await app.register(hrRecalculateLeaveBalanceRoutes, { prefix: "/v1" });
  await app.register(hrCreateCompensationStructureRoutes, { prefix: "/v1" });
  await app.register(hrAssignCompensationPackageRoutes, { prefix: "/v1" });
  await app.register(hrProcessSalaryChangeRoutes, { prefix: "/v1" });
  await app.register(hrCreateBenefitPlanRoutes, { prefix: "/v1" });
  await app.register(hrEnrollBenefitRoutes, { prefix: "/v1" });
  await app.register(hrListCompensationStructuresRoutes, { prefix: "/v1" });
  await app.register(hrListCompensationPackagesRoutes, { prefix: "/v1" });
  await app.register(hrListSalaryHistoryRoutes, { prefix: "/v1" });
  await app.register(hrListBenefitEnrollmentsRoutes, { prefix: "/v1" });
  await app.register(hrOpenPayrollPeriodRoutes, { prefix: "/v1" });
  await app.register(hrLockPayrollPeriodRoutes, { prefix: "/v1" });
  await app.register(hrCreatePayrollRunRoutes, { prefix: "/v1" });
  await app.register(hrSubmitPayrollRunRoutes, { prefix: "/v1" });
  await app.register(hrApprovePayrollRunRoutes, { prefix: "/v1" });
  await app.register(hrListPayrollPeriodsRoutes, { prefix: "/v1" });
  await app.register(hrGetPayrollRunRoutes, { prefix: "/v1" });
  await app.register(hrListPayrollRunEmployeesRoutes, { prefix: "/v1" });
  await app.register(hrListPayrollInputsRoutes, { prefix: "/v1" });
  await app.register(hrPublishPayslipsRoutes, { prefix: "/v1" });
  await app.register(hrGeneratePaymentBatchRoutes, { prefix: "/v1" });
  await app.register(hrPostPayrollToGlRoutes, { prefix: "/v1" });
  await app.register(hrCreateReviewCycleRoutes, { prefix: "/v1" });
  await app.register(hrListReviewCyclesRoutes, { prefix: "/v1" });
  await app.register(hrCreatePerformanceReviewRoutes, { prefix: "/v1" });
  await app.register(hrSubmitSelfReviewRoutes, { prefix: "/v1" });
  await app.register(hrCompleteManagerReviewRoutes, { prefix: "/v1" });
  await app.register(hrCreateGoalRoutes, { prefix: "/v1" });
  await app.register(hrGetPerformanceReviewRoutes, { prefix: "/v1" });
  await app.register(hrListReviewsByEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrListManagerReviewQueueRoutes, { prefix: "/v1" });
  await app.register(hrCreateTalentProfileRoutes, { prefix: "/v1" });
  await app.register(hrCreateSuccessionPlanRoutes, { prefix: "/v1" });
  await app.register(hrNominateSuccessorRoutes, { prefix: "/v1" });
  await app.register(hrGetTalentProfileRoutes, { prefix: "/v1" });
  await app.register(hrListSuccessionPlansRoutes, { prefix: "/v1" });
  await app.register(hrListSuccessorsForPositionRoutes, { prefix: "/v1" });
  await app.register(hrCreateCourseRoutes, { prefix: "/v1" });
  await app.register(hrCreateCourseSessionRoutes, { prefix: "/v1" });
  await app.register(hrEnrollLearnerRoutes, { prefix: "/v1" });
  await app.register(hrRecordCompletionRoutes, { prefix: "/v1" });
  await app.register(hrRecordCertificationRoutes, { prefix: "/v1" });
  await app.register(hrListCoursesRoutes, { prefix: "/v1" });
  await app.register(hrListEnrollmentsRoutes, { prefix: "/v1" });
  await app.register(hrListCertificationsByEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrCreatePolicyDocumentRoutes, { prefix: "/v1" });
  await app.register(hrRecordPolicyAcknowledgementRoutes, { prefix: "/v1" });
  await app.register(hrCreateComplianceCheckRoutes, { prefix: "/v1" });
  await app.register(hrRecordWorkPermitRoutes, { prefix: "/v1" });
  await app.register(hrListPolicyAcknowledgementsRoutes, { prefix: "/v1" });
  await app.register(hrListComplianceChecksByEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrListOverdueComplianceChecksRoutes, { prefix: "/v1" });
  await app.register(hrCreateGrievanceCaseRoutes, { prefix: "/v1" });
  await app.register(hrCreateDisciplinaryActionRoutes, { prefix: "/v1" });
  await app.register(hrAttachEvidenceRoutes, { prefix: "/v1" });
  await app.register(hrCloseGrievanceCaseRoutes, { prefix: "/v1" });
  await app.register(hrCloseDisciplinaryActionRoutes, { prefix: "/v1" });
  await app.register(hrListCasesByEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrListOpenGrievanceCasesRoutes, { prefix: "/v1" });
  await app.register(hrListOpenDisciplinaryActionsRoutes, { prefix: "/v1" });
  await app.register(hrListCaseEvidenceRoutes, { prefix: "/v1" });
  await app.register(hrCreateWorkforcePlanRoutes, { prefix: "/v1" });
  await app.register(hrCreateScenarioRoutes, { prefix: "/v1" });
  await app.register(hrSetPositionBudgetRoutes, { prefix: "/v1" });
  await app.register(hrCreateHiringForecastRoutes, { prefix: "/v1" });
  await app.register(hrListWorkforcePlansRoutes, { prefix: "/v1" });
  await app.register(hrGetScenarioProjectionRoutes, { prefix: "/v1" });
  await app.register(hrListHeadcountByOrgRoutes, { prefix: "/v1" });
  await app.register(hrSubmitApplicationRoutes, { prefix: "/v1" });
  await app.register(hrSubmitInterviewFeedbackRoutes, { prefix: "/v1" });
  await app.register(hrTerminateEmploymentRoutes, { prefix: "/v1" });
  await app.register(hrSuspendEmploymentRoutes, { prefix: "/v1" });
  await app.register(hrResumeEmploymentRoutes, { prefix: "/v1" });
  await app.register(hrTransferEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrPromoteEmployeeRoutes, { prefix: "/v1" });
  await app.register(hrAddEmploymentContractRoutes, { prefix: "/v1" });
  await app.register(hrChangeEmploymentTermsRoutes, { prefix: "/v1" });
  // Supplier sub-entity routes (templates — uncomment when implemented)
  // await app.register(supplierSiteRoutes, { prefix: "/v1" });
  // await app.register(supplierBankAccountRoutes, { prefix: "/v1" });
  await app.register(commTaskRoutes, { prefix: "/v1" });
  await app.register(commProjectRoutes, { prefix: "/v1" });
  await app.register(commApprovalRoutes, { prefix: "/v1" });
  await app.register(commAnnouncementRoutes, { prefix: "/v1" });
  await app.register(commDocumentRoutes, { prefix: "/v1" });
  await app.register(commBoardMeetingRoutes, { prefix: "/v1" });
  await app.register(commSharedRoutes, { prefix: "/v1" });
  await app.register(commWorkflowRoutes, { prefix: "/v1" });

  return app;
}

// ─── Bootstrap (skip when imported as a module by tests) ──────────────────────
if (!process.env["VITEST"]) {
  const port = env.API_PORT;

  const app = await buildApp();
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info({ config: redactEnv(env) }, "API config (redacted)");
  app.log.info(`API listening on :${port}`);
  app.log.info(`  GET  /healthz`);
  app.log.info(`  GET  /readyz`);
  app.log.info(`  GET  /v1`);
  app.log.info(`  GET  /v1/me`);
  app.log.info(`  GET  /v1/me/contexts`);
  app.log.info(`  GET  /v1/documents`);
  app.log.info(`  POST /v1/evidence/presign`);
  app.log.info(`  POST /v1/documents`);
  app.log.info(`  POST /v1/commands/attach-evidence`);
  app.log.info(`  POST /v1/commands/submit-invoice`);
  app.log.info(`  POST /v1/commands/approve-invoice`);
  app.log.info(`  POST /v1/commands/reject-invoice`);
  app.log.info(`  POST /v1/commands/void-invoice`);
  app.log.info(`  POST /v1/invoices/bulk-approve`);
  app.log.info(`  POST /v1/invoices/bulk-reject`);
  app.log.info(`  POST /v1/invoices/bulk-void`);
  app.log.info(`  POST /v1/commands/mark-paid`);
  app.log.info(`  GET  /v1/invoices`);
  app.log.info(`  GET  /v1/invoices/:invoiceId`);
  app.log.info(`  GET  /v1/invoices/:invoiceId/history`);
  app.log.info(`  POST /v1/commands/post-to-gl`);
  app.log.info(`  POST /v1/commands/reverse-entry`);
  app.log.info(`  GET  /v1/gl/journal-entries`);
  app.log.info(`  GET  /v1/gl/journal-entries/:entryId`);
  app.log.info(`  GET  /v1/gl/accounts`);
  app.log.info(`  GET  /v1/gl/trial-balance`);
  app.log.info(`  GET  /v1/audit-logs`);
  app.log.info(`  GET  /v1/audit-logs/:entityType/:entityId`);
  app.log.info(`  GET  /v1/capabilities/:entityKey`);
  app.log.info(`  GET  /v1/docs              (API reference)`);
  app.log.info(`  GET  /v1/docs/openapi.json (OpenAPI spec)`);
  app.log.info(`  GET  /v1/settings`);
  app.log.info(`  PATCH /v1/settings`);
  app.log.info(`  GET  /v1/custom-fields`);
  app.log.info(`  POST /v1/custom-fields`);
  app.log.info(`  PATCH /v1/custom-fields/:id`);
  app.log.info(`  DELETE /v1/custom-fields/:id`);
  app.log.info(`  GET  /v1/custom-fields/entity-types`);
  app.log.info(`  PATCH /v1/suppliers/:id/custom-fields`);
  app.log.info(`  GET  /v1/organization`);
  app.log.info(`  PATCH /v1/organization`);
  app.log.info(`  GET  /v1/organization/members`);
  app.log.info(`  GET  /v1/settings/numbering`);
  app.log.info(`  PATCH /v1/settings/numbering`);
}
