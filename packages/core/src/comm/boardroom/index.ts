import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawMeetingService from "./meeting.service";
import * as rawMeetingQueries from "./meeting.queries";
import * as rawAgendaItemService from "./agenda-item.service";
import * as rawAgendaItemQueries from "./agenda-item.queries";
import * as rawAttendeeService from "./attendee.service";
import * as rawAttendeeQueries from "./attendee.queries";
import * as rawResolutionService from "./resolution.service";
import * as rawResolutionQueries from "./resolution.queries";
import * as rawMinutesService from "./minutes.service";
import * as rawMinutesQueries from "./minutes.queries";

export type {
  BoardMeetingPolicyContext,
  BoardMeetingServiceError,
  BoardMeetingServiceResult,
} from "./meeting.service";
export type { BoardMeetingRow, BoardMeetingListParams } from "./meeting.queries";
export type { AgendaItemServiceResult } from "./agenda-item.service";
export type { BoardAgendaItemRow } from "./agenda-item.queries";
export type { AttendeeServiceResult } from "./attendee.service";
export type { BoardMeetingAttendeeRow } from "./attendee.queries";
export type { ResolutionServiceResult } from "./resolution.service";
export type { BoardResolutionRow, BoardResolutionVoteRow } from "./resolution.queries";
export type { MinutesServiceResult } from "./minutes.service";
export type { BoardMinuteRow, BoardActionItemRow } from "./minutes.queries";

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
