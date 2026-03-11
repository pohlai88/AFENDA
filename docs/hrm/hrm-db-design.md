Yes. For AFENDA-style ERP, you should not think of HRM as “one employee table + payroll table.”

You should design it as an **enterprise HRM data platform** with:

* canonical workforce master
* effective-dated employment truth
* payroll calculation evidence
* talent history
* learning evidence
* audit-grade lifecycle records
* finance integration boundaries

Below is a **Drizzle schema plan / enterprise ERP HRM database architecture** you can adopt.

---

# AFENDA HRM Database Architecture

## 1. Domain schema map

I would split HRM into these schema files:

```text
packages/db/src/schema/hrm/
  hrm-employees.ts
  hrm-employment.ts
  hrm-organization.ts
  hrm-positions.ts
  hrm-recruitment.ts
  hrm-onboarding.ts
  hrm-attendance.ts
  hrm-leave.ts
  hrm-payroll.ts
  hrm-compensation.ts
  hrm-performance.ts
  hrm-talent.ts
  hrm-learning.ts
  hrm-workforce-planning.ts
  hrm-compliance.ts
  hrm-self-service.ts
  hrm-audit.ts
  index.ts
```

If you prefer stricter separation:

```text
packages/db/src/schema/hrm/core/
packages/db/src/schema/hrm/payroll/
packages/db/src/schema/hrm/talent/
packages/db/src/schema/hrm/learning/
packages/db/src/schema/hrm/governance/
```

But for most monorepos, the first structure is more practical.

---

# 2. Design principles

## A. Separate person from employment

One human may have:

* multiple employments over time
* rehire cycles
* contractor-to-employee conversion
* multiple assignments

So do **not** collapse everything into one `employees` row.

Use:

* `hrm_persons`
* `hrm_employees`
* `hrm_employment_records`

## B. Use effective dating

Many HR facts change over time:

* salary
* manager
* department
* position
* work location
* tax profile
* benefits

Use:

* `effective_from`
* `effective_to`
* `is_current`

## C. Keep lifecycle history append-oriented

Do not overwrite critical truth like:

* compensation changes
* payroll approval states
* talent decisions
* training completions

Prefer:

* history tables
* event tables
* version rows

## D. Payroll must preserve calculation evidence

Do not only store final net pay.

Store:

* run
* employee run
* inputs
* calculated lines
* rules applied
* approval trail
* GL posting result

## E. HRM integrates with core MDM

Do not duplicate enterprise master for:

* legal entity
* business unit
* cost center
* currency
* country
* location master

Reference MDM tables.

---

# 3. Shared base column pattern

For nearly all HRM transactional/master tables:

```text
id
tenant_id
company_id / legal_entity_id (when relevant)
created_at
created_by
updated_at
updated_by
deleted_at (optional soft delete only for non-ledger-style tables)
version_no
```

For effective-dated tables also add:

```text
effective_from
effective_to
is_current
change_reason
approved_by
approved_at
```

For governed workflow tables:

```text
status
submitted_at
submitted_by
reviewed_at
reviewed_by
approved_at
approved_by
rejected_at
rejected_by
rejection_reason
```

---

# 4. Core HR schema plan

## 4.1 `hrm_persons`

Canonical human identity.

**Purpose**
Represents a real human, independent of employment relationship.

**Columns**

* `id`
* `tenant_id`
* `person_code`
* `legal_name`
* `preferred_name`
* `first_name`
* `middle_name`
* `last_name`
* `display_name`
* `birth_date`
* `gender_code`
* `marital_status_code`
* `nationality_country_code`
* `personal_email`
* `mobile_phone`
* `photo_file_id`
* `status`
* `created_at`
* `updated_at`

## 4.2 `hrm_person_identities`

Government/statutory identity records.

**Columns**

* `id`
* `tenant_id`
* `person_id`
* `identity_type`
  `passport | national_id | tax_id | social_security | work_permit`
* `identity_number`
* `issuing_country_code`
* `issued_at`
* `expires_at`
* `is_primary`
* `verification_status`

## 4.3 `hrm_person_addresses`

* `id`
* `tenant_id`
* `person_id`
* `address_type`
* `line_1`
* `line_2`
* `city`
* `state_region`
* `postal_code`
* `country_code`
* `is_primary`

## 4.4 `hrm_person_contacts`

Emergency / related contacts.

* `id`
* `tenant_id`
* `person_id`
* `contact_name`
* `relationship_type`
* `phone`
* `email`
* `is_emergency_contact`

## 4.5 `hrm_employee_profiles`

ERP workforce identity layer.

**Purpose**
Employee-facing profile and employee code.

* `id`
* `tenant_id`
* `person_id`
* `employee_code`
* `worker_type`
  `employee | contractor | intern | director`
* `hire_source`
* `current_status`
* `avatar_file_id`
* `primary_legal_entity_id`
* `primary_employment_id`
* `joined_group_at`
* `left_group_at`

---

# 5. Employment schema plan

## 5.1 `hrm_employment_records`

Core employment truth.

* `id`
* `tenant_id`
* `employee_id`
* `legal_entity_id`
* `employment_number`
* `employment_type`
  `permanent | contract | temporary | internship | outsourced`
* `worker_category`
* `hire_date`
* `start_date`
* `probation_end_date`
* `confirmation_date`
* `termination_date`
* `termination_reason_code`
* `employment_status`
* `payroll_status`
* `notice_period_days`
* `is_primary`
* `created_at`
* `updated_at`

## 5.2 `hrm_employment_contracts`

* `id`
* `tenant_id`
* `employment_id`
* `contract_number`
* `contract_type`
* `contract_start_date`
* `contract_end_date`
* `renewal_terms_json`
* `signed_at`
* `document_file_id`
* `status`

## 5.3 `hrm_work_assignments`

Effective-dated assignment of org/work attributes.

* `id`
* `tenant_id`
* `employment_id`
* `legal_entity_id`
* `business_unit_id`
* `department_id`
* `cost_center_id`
* `location_id`
* `position_id`
* `job_id`
* `grade_id`
* `manager_employee_id`
* `work_schedule_id`
* `employment_class`
* `fte_ratio`
* `effective_from`
* `effective_to`
* `is_current`
* `change_reason`

This table is extremely important.

## 5.4 `hrm_employment_status_history`

Append-only lifecycle changes.

* `id`
* `tenant_id`
* `employment_id`
* `old_status`
* `new_status`
* `changed_at`
* `changed_by`
* `reason_code`
* `comment`

---

# 6. Organization and position schema

## 6.1 `hrm_org_units`

Reference organizational units.

* `id`
* `tenant_id`
* `legal_entity_id`
* `org_unit_code`
* `org_unit_name`
* `org_unit_type`
  `division | department | team | branch`
* `parent_org_unit_id`
* `status`

## 6.2 `hrm_jobs`

Job architecture.

* `id`
* `tenant_id`
* `job_code`
* `job_title`
* `job_family`
* `job_function`
* `job_level`
* `description`
* `status`

## 6.3 `hrm_job_grades`

* `id`
* `tenant_id`
* `grade_code`
* `grade_name`
* `grade_rank`
* `min_salary_amount`
* `mid_salary_amount`
* `max_salary_amount`
* `currency_code`

## 6.4 `hrm_positions`

Position control.

* `id`
* `tenant_id`
* `position_code`
* `position_title`
* `legal_entity_id`
* `org_unit_id`
* `job_id`
* `grade_id`
* `cost_center_id`
* `reports_to_position_id`
* `position_status`
* `is_budgeted`
* `headcount_limit`
* `effective_from`
* `effective_to`

## 6.5 `hrm_position_assignments`

* `id`
* `tenant_id`
* `position_id`
* `employment_id`
* `assignment_type`
* `effective_from`
* `effective_to`
* `is_primary`

---

# 7. Recruitment schema

## 7.1 `hrm_job_requisitions`

* `id`
* `tenant_id`
* `requisition_code`
* `position_id`
* `requested_by`
* `headcount_type`
* `vacancy_reason`
* `employment_type`
* `target_start_date`
* `status`
* `approved_at`
* `approved_by`

## 7.2 `hrm_candidates`

* `id`
* `tenant_id`
* `candidate_code`
* `full_name`
* `email`
* `phone`
* `source_channel`
* `current_status`
* `resume_file_id`

## 7.3 `hrm_candidate_applications`

* `id`
* `tenant_id`
* `candidate_id`
* `requisition_id`
* `application_date`
* `stage_code`
* `application_status`
* `score`
* `owner_user_id`

## 7.4 `hrm_interviews`

* `id`
* `tenant_id`
* `application_id`
* `interview_type`
* `scheduled_at`
* `location_or_link`
* `status`

## 7.5 `hrm_interview_feedback`

* `id`
* `tenant_id`
* `interview_id`
* `reviewer_employee_id`
* `rating`
* `recommendation`
* `feedback_text`

## 7.6 `hrm_offers`

* `id`
* `tenant_id`
* `application_id`
* `offer_number`
* `offered_position_id`
* `proposed_start_date`
* `base_salary_amount`
* `currency_code`
* `offer_status`
* `accepted_at`

---

# 8. Onboarding / offboarding schema

## 8.1 `hrm_onboarding_plans`

* `id`
* `tenant_id`
* `employment_id`
* `template_id`
* `start_date`
* `status`

## 8.2 `hrm_onboarding_tasks`

* `id`
* `tenant_id`
* `onboarding_plan_id`
* `task_code`
* `task_name`
* `task_owner_type`
* `assigned_to`
* `due_date`
* `completed_at`
* `status`

## 8.3 `hrm_probation_reviews`

* `id`
* `tenant_id`
* `employment_id`
* `review_due_date`
* `review_status`
* `decision_code`
* `confirmed_at`

## 8.4 `hrm_separation_cases`

* `id`
* `tenant_id`
* `employment_id`
* `case_number`
* `separation_type`
* `last_working_date`
* `notice_given_at`
* `reason_code`
* `status`

## 8.5 `hrm_exit_clearance_items`

* `id`
* `tenant_id`
* `separation_case_id`
* `clearance_type`
* `owner_department`
* `status`
* `cleared_at`

---

# 9. Attendance and leave schema

## 9.1 `hrm_work_calendars`

* `id`
* `tenant_id`
* `calendar_code`
* `calendar_name`
* `country_code`
* `is_default`

## 9.2 `hrm_holidays`

* `id`
* `tenant_id`
* `work_calendar_id`
* `holiday_date`
* `holiday_name`
* `holiday_type`

## 9.3 `hrm_shift_patterns`

* `id`
* `tenant_id`
* `shift_code`
* `shift_name`
* `start_time`
* `end_time`
* `break_minutes`

## 9.4 `hrm_roster_assignments`

* `id`
* `tenant_id`
* `employment_id`
* `shift_pattern_id`
* `work_date`
* `status`

## 9.5 `hrm_attendance_records`

* `id`
* `tenant_id`
* `employment_id`
* `attendance_date`
* `clock_in_at`
* `clock_out_at`
* `worked_minutes`
* `late_minutes`
* `early_out_minutes`
* `attendance_status`
* `source_type`
* `source_reference`

## 9.6 `hrm_timesheet_entries`

* `id`
* `tenant_id`
* `employment_id`
* `work_date`
* `project_id`
* `task_id`
* `cost_center_id`
* `hours_worked`
* `overtime_hours`
* `approval_status`

## 9.7 `hrm_leave_types`

* `id`
* `tenant_id`
* `leave_code`
* `leave_name`
* `leave_category`
* `is_paid`
* `accrual_method`
* `carry_forward_rule_json`

## 9.8 `hrm_leave_balances`

* `id`
* `tenant_id`
* `employment_id`
* `leave_type_id`
* `balance_period`
* `opening_balance`
* `earned_amount`
* `used_amount`
* `adjusted_amount`
* `closing_balance`

## 9.9 `hrm_leave_requests`

* `id`
* `tenant_id`
* `employment_id`
* `leave_type_id`
* `request_number`
* `start_date`
* `end_date`
* `day_count`
* `reason_text`
* `approval_status`

---

# 10. Compensation schema

## 10.1 `hrm_compensation_packages`

Current pay package header.

* `id`
* `tenant_id`
* `employment_id`
* `salary_basis`
* `base_salary_amount`
* `currency_code`
* `pay_frequency`
* `pay_group_id`
* `effective_from`
* `effective_to`
* `is_current`

## 10.2 `hrm_compensation_components`

* `id`
* `tenant_id`
* `compensation_package_id`
* `component_type`
  `earning | deduction | allowance | employer_contribution`
* `component_code`
* `amount_type`
* `amount`
* `currency_code`
* `calculation_basis`
* `is_recurring`

## 10.3 `hrm_benefit_plans`

* `id`
* `tenant_id`
* `benefit_code`
* `benefit_name`
* `benefit_type`
* `provider_name`
* `status`

## 10.4 `hrm_benefit_enrollments`

* `id`
* `tenant_id`
* `employment_id`
* `benefit_plan_id`
* `enrollment_date`
* `coverage_start_date`
* `coverage_end_date`
* `employee_contribution_amount`
* `employer_contribution_amount`
* `status`

## 10.5 `hrm_salary_change_history`

Append-only salary decisions.

* `id`
* `tenant_id`
* `employment_id`
* `old_base_salary_amount`
* `new_base_salary_amount`
* `currency_code`
* `effective_from`
* `change_reason`
* `approved_by`
* `approved_at`

---

# 11. Payroll schema plan

This is the most important section.

## 11.1 `hrm_pay_groups`

* `id`
* `tenant_id`
* `group_code`
* `group_name`
* `pay_frequency`
* `currency_code`
* `country_code`
* `legal_entity_id`
* `status`

## 11.2 `hrm_payroll_calendars`

* `id`
* `tenant_id`
* `pay_group_id`
* `calendar_year`
* `status`

## 11.3 `hrm_payroll_periods`

* `id`
* `tenant_id`
* `pay_group_id`
* `period_code`
* `period_start_date`
* `period_end_date`
* `payment_date`
* `period_status`
* `locked_at`

## 11.4 `hrm_payroll_runs`

Header run.

* `id`
* `tenant_id`
* `payroll_period_id`
* `run_type`
  `regular | offcycle | bonus | final_settlement | retro`
* `run_number`
* `status`
* `submitted_at`
* `approved_at`
* `approved_by`
* `finalized_at`

## 11.5 `hrm_payroll_run_employees`

Per employee result header.

* `id`
* `tenant_id`
* `payroll_run_id`
* `employment_id`
* `currency_code`
* `gross_amount`
* `deduction_amount`
* `employer_cost_amount`
* `net_amount`
* `variance_flag`
* `exception_flag`
* `status`

## 11.6 `hrm_payroll_inputs`

Raw inputs.

* `id`
* `tenant_id`
* `payroll_run_id`
* `employment_id`
* `input_type`
* `input_code`
* `source_module`
  `attendance | leave | claims | manual | compensation | recruitment`
* `source_reference_id`
* `quantity`
* `rate`
* `amount`
* `currency_code`
* `effective_date`
* `status`

## 11.7 `hrm_payroll_elements`

Master payroll element definitions.

* `id`
* `tenant_id`
* `element_code`
* `element_name`
* `element_category`
  `earning | deduction | tax | employer_contribution | accrual | reimbursement`
* `taxability`
* `gl_mapping_code`
* `sequence_no`
* `country_code`
* `status`

## 11.8 `hrm_payroll_result_lines`

Detailed gross-to-net evidence.

* `id`
* `tenant_id`
* `payroll_run_employee_id`
* `payroll_element_id`
* `line_type`
* `quantity`
* `rate`
* `base_amount`
* `calculated_amount`
* `currency_code`
* `taxable_amount`
* `sequence_no`
* `rule_reference`

## 11.9 `hrm_payroll_taxes`

* `id`
* `tenant_id`
* `payroll_run_employee_id`
* `tax_code`
* `taxable_income_amount`
* `tax_amount`
* `jurisdiction_code`

## 11.10 `hrm_payroll_statutory_contributions`

* `id`
* `tenant_id`
* `payroll_run_employee_id`
* `contribution_code`
* `employee_amount`
* `employer_amount`
* `statutory_body_code`

## 11.11 `hrm_payslips`

* `id`
* `tenant_id`
* `payroll_run_employee_id`
* `payslip_number`
* `published_at`
* `file_id`
* `access_status`

## 11.12 `hrm_payroll_payment_batches`

* `id`
* `tenant_id`
* `payroll_run_id`
* `batch_number`
* `bank_account_id`
* `currency_code`
* `total_amount`
* `payment_file_id`
* `status`

## 11.13 `hrm_payroll_payment_lines`

* `id`
* `tenant_id`
* `payment_batch_id`
* `payroll_run_employee_id`
* `beneficiary_name`
* `bank_account_masked`
* `payment_amount`
* `payment_status`

## 11.14 `hrm_payroll_gl_postings`

Staging/result table for Finance integration.

* `id`
* `tenant_id`
* `payroll_run_id`
* `journal_batch_id`
* `posting_status`
* `posted_at`
* `posted_by`
* `source_snapshot_id`

## 11.15 `hrm_payroll_gl_posting_lines`

* `id`
* `tenant_id`
* `payroll_gl_posting_id`
* `ledger_account_id`
* `cost_center_id`
* `department_id`
* `project_id`
* `currency_code`
* `debit_amount`
* `credit_amount`
* `line_description`

## 11.16 `hrm_payroll_exceptions`

* `id`
* `tenant_id`
* `payroll_run_employee_id`
* `exception_code`
* `severity`
* `message`
* `resolved_at`
* `resolved_by`

---

# 12. Performance schema

## 12.1 `hrm_goal_cycles`

* `id`
* `tenant_id`
* `cycle_code`
* `cycle_name`
* `start_date`
* `end_date`
* `status`

## 12.2 `hrm_goals`

* `id`
* `tenant_id`
* `employment_id`
* `goal_cycle_id`
* `goal_title`
* `goal_description`
* `weight`
* `status`

## 12.3 `hrm_performance_reviews`

* `id`
* `tenant_id`
* `employment_id`
* `goal_cycle_id`
* `review_type`
* `overall_rating`
* `review_status`
* `completed_at`

## 12.4 `hrm_performance_review_lines`

* `id`
* `tenant_id`
* `performance_review_id`
* `goal_id`
* `self_rating`
* `manager_rating`
* `final_rating`
* `comments`

## 12.5 `hrm_competency_models`

* `id`
* `tenant_id`
* `model_code`
* `model_name`
* `status`

## 12.6 `hrm_competency_assessments`

* `id`
* `tenant_id`
* `employment_id`
* `competency_model_id`
* `competency_code`
* `proficiency_level`
* `assessed_at`

---

# 13. Talent schema

## 13.1 `hrm_talent_profiles`

* `id`
* `tenant_id`
* `employment_id`
* `career_aspiration_code`
* `mobility_preference`
* `retention_risk_level`
* `potential_rating`
* `readiness_rating`
* `last_reviewed_at`

## 13.2 `hrm_succession_plans`

* `id`
* `tenant_id`
* `position_id`
* `criticality_level`
* `plan_status`
* `review_cycle`

## 13.3 `hrm_successor_candidates`

* `id`
* `tenant_id`
* `succession_plan_id`
* `employment_id`
* `readiness_level`
* `risk_of_loss`
* `rank_order`
* `notes`

## 13.4 `hrm_talent_review_sessions`

* `id`
* `tenant_id`
* `session_code`
* `session_name`
* `review_date`
* `status`

## 13.5 `hrm_talent_review_entries`

* `id`
* `tenant_id`
* `talent_review_session_id`
* `employment_id`
* `performance_band`
* `potential_band`
* `box_position`
* `decision_notes`

## 13.6 `hrm_career_paths`

* `id`
* `tenant_id`
* `job_family`
* `from_job_id`
* `to_job_id`
* `transition_type`
* `requirements_json`

---

# 14. Learning and development schema

## 14.1 `hrm_courses`

* `id`
* `tenant_id`
* `course_code`
* `course_name`
* `course_type`
* `delivery_mode`
* `duration_hours`
* `provider_id`
* `status`

## 14.2 `hrm_learning_paths`

* `id`
* `tenant_id`
* `path_code`
* `path_name`
* `status`

## 14.3 `hrm_learning_path_courses`

* `id`
* `tenant_id`
* `learning_path_id`
* `course_id`
* `sequence_no`
* `is_required`

## 14.4 `hrm_course_sessions`

* `id`
* `tenant_id`
* `course_id`
* `session_code`
* `session_start_at`
* `session_end_at`
* `capacity`
* `location_or_link`
* `status`

## 14.5 `hrm_learning_enrollments`

* `id`
* `tenant_id`
* `employment_id`
* `course_id`
* `course_session_id`
* `enrollment_source`
* `assigned_at`
* `due_date`
* `completion_status`
* `completed_at`
* `score`

## 14.6 `hrm_certifications`

* `id`
* `tenant_id`
* `certification_code`
* `certification_name`
* `issuing_body`
* `validity_months`
* `status`

## 14.7 `hrm_employee_certifications`

* `id`
* `tenant_id`
* `employment_id`
* `certification_id`
* `certificate_number`
* `issued_at`
* `expires_at`
* `verification_status`
* `evidence_file_id`

## 14.8 `hrm_skills`

* `id`
* `tenant_id`
* `skill_code`
* `skill_name`
* `skill_category`
* `status`

## 14.9 `hrm_employee_skills`

* `id`
* `tenant_id`
* `employment_id`
* `skill_id`
* `proficiency_level`
* `assessed_at`
* `assessment_source`

## 14.10 `hrm_development_plans`

* `id`
* `tenant_id`
* `employment_id`
* `plan_title`
* `plan_status`
* `start_date`
* `target_date`

## 14.11 `hrm_development_plan_actions`

* `id`
* `tenant_id`
* `development_plan_id`
* `action_type`
* `reference_id`
* `description`
* `due_date`
* `completed_at`

---

# 15. Compliance and employee relations schema

## 15.1 `hrm_policy_documents`

* `id`
* `tenant_id`
* `policy_code`
* `policy_name`
* `policy_version`
* `effective_from`
* `effective_to`
* `file_id`
* `status`

## 15.2 `hrm_policy_acknowledgements`

* `id`
* `tenant_id`
* `employment_id`
* `policy_document_id`
* `acknowledged_at`
* `acknowledgement_method`

## 15.3 `hrm_grievance_cases`

* `id`
* `tenant_id`
* `case_number`
* `employment_id`
* `case_type`
* `reported_at`
* `status`
* `severity`
* `summary`

## 15.4 `hrm_disciplinary_actions`

* `id`
* `tenant_id`
* `employment_id`
* `action_type`
* `action_date`
* `reason_code`
* `outcome`
* `status`

## 15.5 `hrm_work_permits`

* `id`
* `tenant_id`
* `employment_id`
* `permit_type`
* `permit_number`
* `issued_at`
* `expires_at`
* `status`

## 15.6 `hrm_compliance_checks`

* `id`
* `tenant_id`
* `employment_id`
* `check_type`
* `due_date`
* `completed_at`
* `status`
* `result_code`

---

# 16. Workforce planning schema

## 16.1 `hrm_headcount_plans`

* `id`
* `tenant_id`
* `plan_code`
* `plan_name`
* `plan_year`
* `legal_entity_id`
* `status`

## 16.2 `hrm_headcount_plan_lines`

* `id`
* `tenant_id`
* `headcount_plan_id`
* `org_unit_id`
* `position_id`
* `planned_headcount`
* `planned_cost_amount`
* `currency_code`

## 16.3 `hrm_labor_cost_forecasts`

* `id`
* `tenant_id`
* `forecast_code`
* `period_code`
* `employment_id`
* `forecast_amount`
* `currency_code`
* `assumption_json`

---

# 17. Self-service and request schema

## 17.1 `hrm_employee_requests`

Generic controlled request table.

* `id`
* `tenant_id`
* `employment_id`
* `request_type`
* `request_number`
* `submitted_at`
* `approval_status`
* `payload_json`

Could cover:

* profile update
* letter request
* document request
* bank detail change
* tax declaration
* reimbursement request

## 17.2 `hrm_approval_workflows`

* `id`
* `tenant_id`
* `workflow_type`
* `reference_table`
* `reference_id`
* `current_stage`
* `status`

## 17.3 `hrm_approval_actions`

* `id`
* `tenant_id`
* `workflow_id`
* `actor_employee_id`
* `action_type`
* `action_at`
* `comments`

---

# 18. Audit and evidence schema

For AFENDA-grade governance, add explicit audit tables.

## 18.1 `hrm_change_events`

* `id`
* `tenant_id`
* `aggregate_type`
* `aggregate_id`
* `event_type`
* `event_payload_json`
* `occurred_at`
* `occurred_by`

## 18.2 `hrm_evidence_links`

* `id`
* `tenant_id`
* `reference_table`
* `reference_id`
* `file_id`
* `evidence_type`
* `attached_at`
* `attached_by`

## 18.3 `hrm_review_attestations`

* `id`
* `tenant_id`
* `review_type`
* `reference_table`
* `reference_id`
* `attested_by`
* `attested_at`
* `attestation_text`

---

# 19. Finance integration boundaries

Your HRM database should integrate with Finance through controlled staging, not direct contamination.

## HRM → Finance tables

Use:

* `hrm_payroll_gl_postings`
* `hrm_payroll_gl_posting_lines`

Optional:

* `hrm_leave_liability_snapshots`
* `hrm_bonus_accrual_snapshots`

## Important principle

Payroll run result is HRM truth.
Journal entry is Finance truth.

Do not use one table for both.

---

# 20. Recommended enum/reference strategy

Use either shared code tables or typed text enums.

Recommended shared references:

* gender code
* marital status
* employment type
* worker category
* leave type category
* payroll run type
* payroll element category
* performance rating band
* potential rating
* readiness level
* course delivery mode
* compliance check type
* approval status

For ERP scale, I would prefer:

* stable code tables for business extensibility
* TypeScript enums only for system-internal workflow constants

---

# 21. Drizzle implementation pattern

For Postgres + Drizzle, I would recommend:

* `pgTable`
* `uuid` primary keys
* `numeric(20, 6)` or BigInt strategy depending on your money architecture
* JSONB for payloads and configurable rules
* composite unique constraints for effective-dated current rows
* explicit index definitions
* relations in each file or nearby relation file

---

# 22. Example file-by-file implementation order

Best practical order:

## Phase 1

```text
hrm-employees.ts
hrm-employment.ts
hrm-organization.ts
hrm-positions.ts
```

## Phase 2

```text
hrm-attendance.ts
hrm-leave.ts
hrm-compensation.ts
hrm-payroll.ts
```

## Phase 3

```text
hrm-performance.ts
hrm-talent.ts
hrm-learning.ts
```

## Phase 4

```text
hrm-recruitment.ts
hrm-onboarding.ts
hrm-compliance.ts
hrm-workforce-planning.ts
hrm-self-service.ts
hrm-audit.ts
```

---

# 23. Suggested top-priority indexes

Examples:

## Employees

* unique `(tenant_id, employee_code)`
* index `(tenant_id, person_id)`

## Work assignments

* index `(tenant_id, employment_id, is_current)`
* index `(tenant_id, manager_employee_id, is_current)`
* index `(tenant_id, department_id, is_current)`

## Attendance

* unique `(tenant_id, employment_id, attendance_date)`
* index `(tenant_id, attendance_date)`

## Leave requests

* index `(tenant_id, employment_id, approval_status)`
* index `(tenant_id, start_date, end_date)`

## Payroll

* unique `(tenant_id, payroll_period_id, run_number)`
* index `(tenant_id, payroll_run_id, employment_id)`
* index `(tenant_id, status)`
* index `(tenant_id, payment_date)`

## Learning

* index `(tenant_id, employment_id, completion_status)`
* index `(tenant_id, expires_at)`

## Talent

* index `(tenant_id, position_id)`
* index `(tenant_id, employment_id, last_reviewed_at)`

---

# 24. Recommended schema naming conventions

Use plural table names or singular consistently. For AFENDA, I would recommend plural:

```text
hrm_persons
hrm_employee_profiles
hrm_employment_records
hrm_work_assignments
hrm_payroll_runs
hrm_payroll_result_lines
```

Reasons:

* easier registry scanning
* less ambiguity
* consistent with ERP grouped datasets

---

# 25. Strong recommendation for minimum viable enterprise HRM schema

If you want the smallest serious ERP foundation, start with these tables first:

```text
hrm_persons
hrm_person_identities
hrm_employee_profiles
hrm_employment_records
hrm_work_assignments
hrm_org_units
hrm_jobs
hrm_job_grades
hrm_positions
hrm_leave_types
hrm_leave_balances
hrm_leave_requests
hrm_attendance_records
hrm_compensation_packages
hrm_compensation_components
hrm_pay_groups
hrm_payroll_periods
hrm_payroll_runs
hrm_payroll_run_employees
hrm_payroll_inputs
hrm_payroll_elements
hrm_payroll_result_lines
hrm_payslips
hrm_payroll_gl_postings
hrm_payroll_gl_posting_lines
hrm_talent_profiles
hrm_succession_plans
hrm_courses
hrm_learning_enrollments
hrm_employee_certifications
hrm_change_events
hrm_evidence_links
```

That gives you a real enterprise spine.

---

# 26. My architectural advice for AFENDA

For AFENDA specifically, I would shape HRM around these 5 truths:

## Workforce Truth

* `hrm_persons`
* `hrm_employee_profiles`
* `hrm_employment_records`
* `hrm_work_assignments`

## Labor Cost Truth

* `hrm_compensation_packages`
* `hrm_payroll_runs`
* `hrm_payroll_result_lines`
* `hrm_payroll_gl_posting_lines`

## Capability Truth

* `hrm_talent_profiles`
* `hrm_employee_skills`
* `hrm_learning_enrollments`
* `hrm_employee_certifications`

## Compliance Truth

* `hrm_policy_acknowledgements`
* `hrm_compliance_checks`
* `hrm_work_permits`

## Evidence Truth

* `hrm_change_events`
* `hrm_evidence_links`
* `hrm_review_attestations`

That is how it stops being “just HR software” and becomes ERP-grade.

---

# 27. Final answer

Yes — you should absolutely build **an enterprise ERP HRM database schema**, not just a few HR tables.

The most important sub-schema groups are:

* Core HR
* Employment and assignment
* Organization and position
* Attendance and leave
* Compensation
* Payroll
* Performance
* Talent
* Learning
* Compliance
* Workforce planning
* Audit/evidence

The **most critical tables** are:

* `hrm_persons`
* `hrm_employee_profiles`
* `hrm_employment_records`
* `hrm_work_assignments`
* `hrm_compensation_packages`
* `hrm_payroll_runs`
* `hrm_payroll_run_employees`
* `hrm_payroll_result_lines`
* `hrm_talent_profiles`
* `hrm_learning_enrollments`
* `hrm_change_events`

Next, I can turn this into a **real AFENDA Drizzle scaffold** with:

* exact `pgTable(...)` definitions
* enums
* indexes
* foreign keys
* file-by-file code skeleton for `packages/db/src/schema/hrm/*.ts`
