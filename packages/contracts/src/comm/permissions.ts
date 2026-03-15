/**
 * @afenda/contracts — COMM (Communication) permissions.
 *
 * CHANGELOG:
 *   - 2026-03-13: Normalized boardroom entity tokens to kebab-case (`agenda-item`, `action-item`).
 *
 * RULES:
 *   1. Format: `comm.entity.action` (lowercase dot-separated with kebab-case).
 *   2. Every permission used in comm routes/services MUST be listed here.
 *   3. Adding a permission is safe. Removing/renaming is BREAKING.
 */

import { z } from "zod";

// ── COMM Permission Keys ──────────────────────────────────────────────────────

export const CommPermissionValues = [
  // COMM — shared
  "comm.comment.create",
  "comm.comment.read",
  "comm.comment.delete",
  "comm.label.create",
  "comm.label.delete",
  "comm.saved-view.create",
  "comm.saved-view.delete",
  "comm.subscription.create",
  "comm.subscription.delete",

  // COMM — chatter (threaded messages)
  "comm.message.create",
  "comm.message.read",
  "comm.message.update",
  "comm.message.delete",

  // COMM — projects
  "comm.project.create",
  "comm.project.read",
  "comm.project.update",
  "comm.project.archive",
  "comm.project.delete",
  "comm.project.member.add",
  "comm.project.member.remove",
  "comm.project.milestone.create",
  "comm.project.milestone.complete",

  // COMM — tasks
  "comm.task.create",
  "comm.task.read",
  "comm.task.update",
  "comm.task.assign",
  "comm.task.complete",
  "comm.task.archive",
  "comm.task.delete",
  "comm.task.bulk-assign",
  "comm.task.bulk-transition",

  // COMM — approvals
  "comm.approval.create",
  "comm.approval.read",
  "comm.approval.approve",
  "comm.approval.reject",
  "comm.approval.delegate",
  "comm.approval.escalate",
  "comm.approval.withdraw",
  "comm.approval-policy.read",
  "comm.approval-policy.write",
  "comm.approval-delegation.write",

  // COMM — announcements
  "comm.announcement.create",
  "comm.announcement.publish",
  "comm.announcement.schedule",
  "comm.announcement.archive",
  "comm.announcement.acknowledge",
  "comm.announcement.read",

  // COMM — documents
  "comm.document.read",
  "comm.document.write",
  "comm.document.manage",

  // COMM — workflows
  "comm.workflow.read",
  "comm.workflow.create",
  "comm.workflow.update",
  "comm.workflow.delete",
  "comm.workflow.execute",

  // Boardroom
  "comm.meeting.create",
  "comm.meeting.read",
  "comm.meeting.update",
  "comm.agenda-item.create",
  "comm.agenda-item.read",
  "comm.attendee.create",
  "comm.attendee.read",
  "comm.attendee.update",
  "comm.resolution.create",
  "comm.resolution.read",
  "comm.resolution.vote",
  "comm.minute.record",
  "comm.minute.read",
  "comm.action-item.create",
  "comm.action-item.read",
  "comm.action-item.update",
] as const;

export const CommPermissionSchema = z.enum(CommPermissionValues);

export type CommPermission = z.infer<typeof CommPermissionSchema>;
