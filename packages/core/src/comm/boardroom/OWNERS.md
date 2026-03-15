# OWNERS — `core/comm/boardroom`

> **Purpose:** <Meeting> domain services for the comm/boardroom module.

## Import Rules

| May import                              | Must NOT import                      |
| --------------------------------------- | ------------------------------------ |
| `@afenda/contracts` (shared primitives) | `@afenda/ui`                         |
| `@afenda/db`                            | `@afenda/api`                        |
| `drizzle-orm`, `zod`                    | Direct DB queries (use `db.query.*`) |

## Files

| File                     | Exports                                                                   | Description                              |
| ------------------------ | ------------------------------------------------------------------------- | ---------------------------------------- |
| `index.ts`               | Re-exports from meeting, agenda-item, and attendee modules                | Barrel export                            |
| `meeting.service.ts`     | `createMeeting`, `updateMeeting`, meeting errors                          | Meeting command handlers                 |
| `meeting.queries.ts`     | `getMeetingById`, `listBoardMeetings`                                     | Meeting read queries                     |
| `agenda-item.service.ts` | `addAgendaItem`                                                           | Agenda item command handler              |
| `agenda-item.queries.ts` | `listAgendaItemsByMeeting`                                                | Agenda item read queries                 |
| `attendee.service.ts`    | `addAttendee`, `updateAttendeeStatus`                                     | Attendee command handlers                |
| `attendee.queries.ts`    | `listAttendeesByMeeting`                                                  | Attendee read queries                    |
| `resolution.guards.ts`   | `getResolutionStateGuardError`                                            | Reusable resolution state guard adapter  |
| `resolution.service.ts`  | `proposeResolution`, `updateResolution`, `withdrawResolution`, `castVote` | Resolution command handlers              |
| `resolution.queries.ts`  | `listResolutionsByMeeting`, `listVotesByResolution`                       | Resolution read queries                  |
| `minutes.service.ts`     | `recordMinutes`, `createActionItem`, `updateActionItem`                   | Minutes and action item command handlers |
| `minutes.queries.ts`     | `listMinutesByMeeting`, `listActionItemsByMinute`                         | Minutes and action item read queries     |

## PR Checklist

- [ ] New `.ts` files appear in the Files table above
- [ ] Import rules respected (run `pnpm check:boundaries`)
- [ ] Tests added in `__vitest_test__/`
- [ ] All commands write audit logs (use `writeAuditLog` from kernel/governance)
- [ ] All async operations emit outbox events (use `emitOutboxEvent` from kernel/execution)
