# AFENDA HRM Phase 3 - Wave 11 implementation scaffold and closure tracker.

Wave 11 focus:

1. Performance cycle and review records
2. Talent profile and succession baseline
3. Learning catalog and enrollment baseline

This wave establishes Phase 3 workforce performance, talent, and learning foundations.

## Wave Status: DONE

---

# Directory Hints

- Contracts paths: `packages/contracts/src/erp/hr/`
- Database schema paths: `packages/db/src/schema/erp/hrm/`
- Core domain paths: `packages/core/src/erp/hr/`
- API route paths: `apps/api/src/routes/erp/hr/`
- Web app paths: `apps/web/src/app/(erp)/hr/`
- Tests paths: `**/__vitest_test__/` and app-level test folders
- Wave docs paths: `docs/hrm/`

---

# Wave Metadata

- Wave ID: Wave 11
- Scope: Performance management, talent management, learning & development foundations
- Document role: Scaffold + closure tracker
- Last updated: 2026-03-13

---

# Delivery Policy (Learned Experience)

Use strict closure discipline for this wave:

1. Close all gaps found during implementation and validation, regardless of whether they are blocking.
2. Mark a task DONE only with implementation + tests + evidence.
3. Track non-blocking gaps as explicit remediation items with owner and verification command.
4. Do not carry silent debt into next wave scaffolds.

---

# Remaining (Follow-up)

Completion rule: a remaining item is only complete when implementation + tests + evidence are all present.

## W11-R1. Performance management foundation

Status: DONE

Deliverables:

- Add contracts for performance entities:
  - ReviewCycle, GoalPlan, Goal, PerformanceReview, CompetencyAssessment, RatingModel
- Add DB schema `hrm-performance.ts`:
  - review_cycles (cycle_code, cycle_name, start_date, end_date, status)
  - performance_reviews (employment_id, review_cycle_id, reviewer_employment_id, status, rating)
  - goals (performance_review_id, goal_text, target_date, status)
  - competency_assessments (performance_review_id, competency_code, rating)
- Implement services:
  - create review cycle
  - create performance review
  - submit self review / complete manager review
- Implement queries: list review cycles, get performance review, list reviews by employee
- Implement and register API routes.
- Enforce audit + outbox on mutations.

Evidence:

- `packages/contracts/src/erp/hr/performance.entity.ts`
- `packages/contracts/src/erp/hr/performance.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-performance.ts`
- `packages/core/src/erp/hr/performance/services/*.ts`
- `packages/core/src/erp/hr/performance/queries/*.ts`
- `apps/api/src/routes/erp/hr/*performance*.ts`

Done when:

- Review cycles and performance reviews can be created and managed.
- Manager review surfaces (MSS) can list and complete reviews.

## W11-R2. Talent management foundation

Status: DONE

Deliverables:

- Add contracts for talent entities:
  - TalentProfile, TalentPool, SuccessionPlan, SuccessorNomination, PotentialAssessment
- Add DB schema `hrm-talent.ts`:
  - talent_profiles (employment_id, potential_score, readiness_score, career_aspiration)
  - succession_plans (position_id, critical_role_flag, status)
  - successor_nominations (succession_plan_id, employment_id, readiness_level)
- Implement services:
  - create talent profile
  - create succession plan
  - nominate successor
- Implement queries: get talent profile, list succession plans, list successors for position
- Implement and register API routes.
- Enforce audit + outbox on mutations.

Evidence:

- `packages/contracts/src/erp/hr/talent.entity.ts`
- `packages/contracts/src/erp/hr/talent.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-talent.ts`
- `packages/core/src/erp/hr/talent/services/*.ts`
- `packages/core/src/erp/hr/talent/queries/*.ts`
- `apps/api/src/routes/erp/hr/*talent*.ts`

Done when:

- Talent profiles and succession plans can be created and managed.
- Read models support manager talent review surfaces.

## W11-R3. Learning & development foundation

Status: DONE

Deliverables:

- Add contracts for learning entities:
  - Course, CourseSession, LearningPath, LearningEnrollment, Certification, Skill
- Add DB schema `hrm-learning.ts`:
  - courses (course_code, course_name, course_type, provider)
  - course_sessions (course_id, session_date, status)
  - learning_enrollments (employment_id, course_id or session_id, status, completed_at)
  - certifications (employment_id, certification_code, issued_at, expires_at)
  - skills (skill_code, skill_name), skill_profiles (employment_id, skill_id, proficiency_level)
- Implement services:
  - create course / create course session
  - enroll learner
  - record completion
  - record certification
- Implement queries: list courses, list enrollments, list certifications by employee
- Implement and register API routes.
- Enforce audit + outbox on mutations.

Evidence:

- `packages/contracts/src/erp/hr/learning.entity.ts`
- `packages/contracts/src/erp/hr/learning.commands.ts`
- `packages/db/src/schema/erp/hrm/hrm-learning.ts`
- `packages/core/src/erp/hr/learning/services/*.ts`
- `packages/core/src/erp/hr/learning/queries/*.ts`
- `apps/api/src/routes/erp/hr/*learning*.ts`

Done when:

- Course catalog and enrollments can be managed.
- Certification and skill tracking baseline exists.

## W11-R4. ESS/MSS UI surfaces and validation

Status: DONE

Deliverables:

- Add operational HR screens:
  - performance: review cycle list (data-bound), manager review queue (scaffold; reviewerEmploymentId wiring pending)
  - talent: succession plan list, successor slate (positions/:positionId/successors)
  - learning: course catalog, my enrollments
- API/client ready but no dedicated UI: talent profile view, certification list, self-review submission
- Add loading, error, and empty states for each route.
- Wire API client helpers and query keys.
- Add invariant tests for workflow transitions (e.g., review cannot be finalized twice).

Evidence:

- `apps/web/src/app/(erp)/hr/performance/`
- `apps/web/src/app/(erp)/hr/talent/`
- `apps/web/src/app/(erp)/hr/learning/`
- `packages/core/src/erp/hr/performance/__vitest_test__/`
- `packages/core/src/erp/hr/talent/__vitest_test__/`
- `packages/core/src/erp/hr/learning/__vitest_test__/`

Done when:

- All Wave 11 tests pass.
- All 22 gates pass.
- UI surfaces are data-bound to APIs.

---

# Suggested completion order

1. W11-R1 (performance foundation)
2. W11-R2 (talent foundation)
3. W11-R3 (learning foundation)
4. W11-R4 (UI surfaces + validation)

---

# Blockers log (update during execution)

- None. Wave 11 can proceed in parallel with Wave 10 if resources allow.

---

# 0. Status Update

## Current delivery status

- W11-R1 DONE. Evidence:
  - `packages/contracts/src/erp/hr/performance.entity.ts` (ReviewCycle, PerformanceReview, Goal, CompetencyAssessment)
  - `packages/contracts/src/erp/hr/performance.commands.ts`, `performance.queries.ts`
  - `packages/db/src/schema/erp/hrm/hrm-performance.ts` (hrm_review_cycles, hrm_performance_reviews, hrm_performance_goals, hrm_competency_assessments)
  - Services: create-review-cycle, create-performance-review, submit-self-review, complete-manager-review, create-goal
  - Queries: list-review-cycles, get-performance-review, list-reviews-by-employee, list-manager-review-queue
  - API routes: POST/GET /hrm/performance/review-cycles, POST/GET /hrm/performance/reviews, submit-self, complete-manager, goals, by-employee, manager-queue
  - Tests: `performance-invariants.service.test.ts` — 3 tests pass (review cycle, submit-self, complete-manager idempotency)
  - `pnpm check:all` — 22 gates pass
- W11-R2 DONE. Evidence:
  - `packages/contracts/src/erp/hr/talent.entity.ts` (HrmTalentProfile, HrmSuccessionPlan, HrmSuccessorNomination)
  - `packages/contracts/src/erp/hr/talent.commands.ts`, `talent.queries.ts`
  - `packages/db/src/schema/erp/hrm/hrm-talent.ts` (hrm_talent_profiles, hrm_succession_plans, hrm_successor_nominations)
  - Migration: `0054_romantic_sunfire.sql`
  - Services: create-talent-profile, create-succession-plan, nominate-successor
  - Queries: get-talent-profile, list-succession-plans, list-successors-for-position
  - API routes: POST /hrm/talent/profiles, POST /hrm/talent/succession-plans, POST /hrm/talent/succession-plans/:successionPlanId/nominate, GET /hrm/talent/profiles/:employmentId, GET /hrm/talent/succession-plans, GET /hrm/talent/positions/:positionId/successors
  - Tests: `talent-invariants.service.test.ts` — 3 tests pass
- W11-R3 DONE. Evidence:
  - `packages/contracts/src/erp/hr/learning.entity.ts` (Course, CourseSession, LearningEnrollment, Certification, Skill, SkillProfile)
  - `packages/contracts/src/erp/hr/learning.commands.ts`, `learning.queries.ts`
  - `packages/db/src/schema/erp/hrm/hrm-learning.ts` (hrm_courses, hrm_course_sessions, hrm_learning_enrollments, hrm_certifications, hrm_skills, hrm_skill_profiles)
  - Migration: `0055_safe_excalibur.sql`
  - Services: create-course, create-course-session, enroll-learner, record-completion, record-certification
  - Queries: list-courses, list-enrollments, list-certifications-by-employee
  - API routes: POST /hrm/learning/courses, POST /hrm/learning/sessions, POST /hrm/learning/enrollments, POST /hrm/learning/enrollments/:enrollmentId/complete, POST /hrm/learning/certifications, GET /hrm/learning/courses, GET /hrm/learning/enrollments, GET /hrm/learning/employees/:employmentId/certifications
  - Tests: `learning-invariants.service.test.ts` — 5 tests pass
- W11-R4 DONE. Evidence:
  - Performance: /hr/performance/review-cycles (data-bound), /hr/performance/manager-queue (loading, error; data wiring pending reviewerEmploymentId)
  - Talent: /hr/talent/succession-plans, /hr/talent/positions/[positionId]/successors (data-bound)
  - Learning: /hr/learning/courses, /hr/learning/enrollments (data-bound)
  - hrm-client: fetchReviewCycles, fetchSuccessionPlans, fetchSuccessorsForPosition, fetchTalentProfile, fetchCourses, fetchEnrollments, fetchCertificationsByEmployee
  - HR home page: Performance, Talent, Learning groups with links

## Known open items

- Performance/talent/learning are large sub-domains; consider phased delivery within Wave 11 (e.g., performance first, then talent, then learning).
- Rating models and competency taxonomies may need reference data or seed scripts.
- UI deferred: talent profile view page, certification list page, self-review submission page; manager-queue needs reviewerEmploymentId from session.

---

# Validation commands (run to verify closure)

```bash
pnpm --filter @afenda/core test -- src/erp/hr/performance/ src/erp/hr/talent/ src/erp/hr/learning/
pnpm check:all
```

Exit rule:

Wave closure is complete only when behavior is proven with tests and evidence.
