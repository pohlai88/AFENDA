import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawChatterService from "./chatter.service";
import * as rawChatterQueries from "./chatter.queries";

export type { CommChatterServiceResult, PostChatterMessageResult } from "./chatter.service";
export type { CommChatterMessageRow, ListChatterMessagesParams } from "./chatter.queries";

const instrumented = instrumentService("comm.chatter", {
  ...rawChatterService,
  ...rawChatterQueries,
});

export const { postChatterMessage, listChatterMessages } = instrumented;
