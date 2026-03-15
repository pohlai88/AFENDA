import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawMeetingService from "./meeting.service.js";
import * as rawMeetingQueries from "./meeting.queries.js";
import * as rawAgendaItemService from "./agenda-item.service.js";
import * as rawAgendaItemQueries from "./agenda-item.queries.js";
import * as rawAttendeeService from "./attendee.service.js";
import * as rawAttendeeQueries from "./attendee.queries.js";
import * as rawResolutionService from "./resolution.service.js";
import * as rawResolutionQueries from "./resolution.queries.js";
import * as rawMinutesService from "./minutes.service.js";
import * as rawMinutesQueries from "./minutes.queries.js";

export type {
  BoardMeetingPolicyContext,
  BoardMeetingServiceError,
  BoardMeetingServiceResult,
} from "./meeting.service.js";
export type { BoardMeetingRow, BoardMeetingListParams } from "./meeting.queries.js";
export type { AgendaItemServiceResult } from "./agenda-item.service.js";
export type { BoardAgendaItemRow } from "./agenda-item.queries.js";
export type { AttendeeServiceResult } from "./attendee.service.js";
export type { BoardMeetingAttendeeRow } from "./attendee.queries.js";
export type { ResolutionServiceResult } from "./resolution.service.js";
export type { BoardResolutionRow, BoardResolutionVoteRow } from "./resolution.queries.js";
export type { MinutesServiceResult } from "./minutes.service.js";
export type { BoardMinuteRow, BoardActionItemRow } from "./minutes.queries.js";

const instrumented = instrumentService("comm.boardroom", {
  ...rawMeetingService,
  ...rawMeetingQueries,
  ...rawAgendaItemService,
  ...rawAgendaItemQueries,
  ...rawAttendeeService,
  ...rawAttendeeQueries,
  ...rawResolutionService,
  ...rawResolutionQueries,
  ...rawMinutesService,
  ...rawMinutesQueries,
});

export const {
  createMeeting,
  updateMeeting,
  listBoardMeetings,
  getMeetingById,
  addAgendaItem,
  listAgendaItemsByMeeting,
  addAttendee,
  updateAttendeeStatus,
  listAttendeesByMeeting,
  proposeResolution,
  updateResolution,
  withdrawResolution,
  castVote,
  listResolutionsByMeeting,
  listVotesByResolution,
  recordMinutes,
  listMinutesByMeeting,
  createActionItem,
  updateActionItem,
  listActionItemsByMinute,
} = instrumented;
