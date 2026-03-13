import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawCommentService from "./comment.service";
import * as rawCommentQueries from "./comment.queries";
import * as rawLabelService from "./label.service";
import * as rawLabelQueries from "./label.queries";
import * as rawSavedViewService from "./saved-view.service";
import * as rawSavedViewQueries from "./saved-view.queries";
import * as rawSubscriptionService from "./subscription.service";
import * as rawSubscriptionQueries from "./subscription.queries";
import * as rawInboxService from "./inbox.service";
import * as rawInboxQueries from "./inbox.queries";

export type {
  CommCommentPolicyContext,
  CommCommentServiceError,
  CommCommentServiceResult,
} from "./comment.service";
export type { CommCommentRow, ListCommentsParams } from "./comment.queries";
export type {
  CommLabelPolicyContext,
  CommLabelServiceError,
  CommLabelServiceResult,
} from "./label.service";
export type { CommLabelRow, CommLabelAssignmentRow } from "./label.queries";
export type {
  CommSavedViewPolicyContext,
  CommSavedViewServiceError,
  CommSavedViewServiceResult,
} from "./saved-view.service";
export type { CommSavedViewRow } from "./saved-view.queries";
export type {
  CommSubscriptionPolicyContext,
  CommSubscriptionServiceError,
  CommSubscriptionServiceResult,
} from "./subscription.service";
export type { CommSubscriptionRow } from "./subscription.queries";
export type {
  CommInboxPolicyContext,
  CommInboxServiceError,
  CommInboxServiceResult,
} from "./inbox.service";
export type { CommInboxItemRow, CommNotificationPreferenceRow } from "./inbox.queries";

const instrumented = instrumentService("comm.shared", {
  ...rawCommentService,
  ...rawCommentQueries,
  ...rawLabelService,
  ...rawLabelQueries,
  ...rawSavedViewService,
  ...rawSavedViewQueries,
  ...rawSubscriptionService,
  ...rawSubscriptionQueries,
  ...rawInboxService,
  ...rawInboxQueries,
});

export const {
  addComment,
  editComment,
  deleteComment,
  listComments,
  getCommentById,
  createLabel,
  updateLabel,
  deleteLabel,
  assignLabel,
  unassignLabel,
  listLabels,
  getLabelById,
  listEntityLabelAssignments,
  listEntityLabels,
  saveView,
  updateSavedView,
  deleteSavedView,
  listSavedViews,
  getSavedViewById,
  subscribeEntity,
  unsubscribeEntity,
  listSubscriptionsForEntity,
  getSubscriptionByUnique,
  markInboxItemRead,
  markAllInboxRead,
  upsertNotificationPreference,
  listInboxItems,
  getInboxItemById,
  countUnreadInboxItems,
  listNotificationPreferences,
} = instrumented;
