# OWNERS — `contracts/comm/boardroom`

> **Purpose:** <Meeting> domain contracts for the comm/boardroom module.

## Import Rules

| May import                              | Must NOT import         |
| --------------------------------------- | ----------------------- |
| `@afenda/contracts` (shared primitives) | `@afenda/ui`            |
| `zod`                                   | `@afenda/db`            |
|                                         | `@afenda/core`          |
|                                         | Other monorepo packages |

## Files

| File                      | Exports                                                                                                                                                                                                | Description                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `index.ts`                | Re-exports from meeting, agenda-item, and attendee modules                                                                                                                                             | Barrel export                                            |
| `meeting.shared.ts`       | `MeetingTitleSchema`, `MeetingDescriptionSchema`, `MeetingCommandCreateFieldsSchema`, `MeetingCommandUpdateFieldsSchema`, `addChairSecretaryIssue`, `addMeetingUpdateIssue`                            | Shared meeting field schemas and invariants              |
| `meeting.entity.ts`       | `<Meeting>Schema`, `<Meeting>StatusValues`, `<Meeting>Status`, `<Meeting>`                                                                                                                             | Meeting type definitions                                 |
| `meeting.commands.ts`     | `Create<Meeting>CommandSchema`, `Update<Meeting>CommandSchema`                                                                                                                                         | Command schemas                                          |
| `meeting.events.ts`       | `COMM_MEETING_*`, `COMM_AGENDA_ITEM_ADDED`, `COMM_ATTENDEE_*`, `COMM_MINUTES_RECORDED`, `COMM_ACTION_ITEM_*`                                                                                           | Outbox event types                                       |
| `minutes.shared.ts`       | `RecordMinutesCommandFieldsSchema`, `CreateActionItemCommandFieldsSchema`, `UpdateActionItemCommandFieldsSchema`, `addDueDateFutureIssue`, `addActionItemUpdateIssue`                                  | Shared minutes/action-item field schemas and refinements |
| `minutes.entity.ts`       | `BoardMinuteSchema`, `BoardActionItemSchema`, `ActionItemStatusValues`                                                                                                                                 | Minutes and action item type definitions                 |
| `minutes.commands.ts`     | `RecordMinutesCommandSchema`, `CreateActionItemCommandSchema`, `UpdateActionItemCommandSchema`                                                                                                         | Minutes and action item command schemas                  |
| `agenda-item.shared.ts`   | `AgendaItemEntityFieldsSchema`, `AgendaItemCommandAddFieldsSchema`, `AgendaItemCommandUpdateFieldsSchema`, `addPresenterDurationIssue`                                                                 | Shared agenda item field schemas and invariants          |
| `agenda-item.entity.ts`   | `BoardAgendaItemSchema`, `BoardAgendaItemIdSchema`, `BoardAgendaItem`                                                                                                                                  | Agenda item type definitions                             |
| `agenda-item.commands.ts` | `AddAgendaItemCommandSchema`, `AddAgendaItemCommand`                                                                                                                                                   | Add agenda item command                                  |
| `attendee.shared.ts`      | `AttendeeRoleSchema`, `AttendeeRoleOptionalSchema`, `AttendeeNullableRoleSchema`, `AttendeeNullableRoleOptionalSchema`, `AttendeeUpdateData`, `addAttendeeUpdateIssue`, `withAttendeeUpdateRefinement` | Shared attendee role schema variants and update helpers  |
| `attendee.entity.ts`      | `BoardMeetingAttendeeSchema`, `AttendeeStatuses`, `AttendeeStatusValues`, `AttendeeStatus`                                                                                                             | Attendee type definitions                                |
| `attendee.commands.ts`    | `AddAttendeeCommandSchema`, `UpdateAttendeeStatusCommandSchema`                                                                                                                                        | Attendee command schemas                                 |
| `resolution.shared.ts`    | `ProposeResolutionCommandFieldsSchema`, `UpdateResolutionCommandFieldsSchema`, `addResolutionUpdateIssue`, `withResolutionUpdateRefinement`, `getResolutionCommandGuardViolation`                      | Shared resolution field schemas and refinements          |
| `resolution.entity.ts`    | `BoardResolutionSchema`, `BoardResolutionVoteSchema`, status/vote enums                                                                                                                                | Resolution type definitions                              |
| `resolution.commands.ts`  | `ProposeResolutionCommandSchema`, `CastVoteCommandSchema`, `ResolutionCommandSchemas`                                                                                                                  | Resolution command schemas                               |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Error codes added to `contracts/shared/errors.ts` if new failures introduced
- [ ] Audit actions added to `contracts/kernel/governance/audit/actions.ts` if new auditable events
- [ ] Outbox events added to `contracts/kernel/execution/outbox/envelope.ts` if new async events
