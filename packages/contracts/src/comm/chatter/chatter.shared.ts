import { z } from "zod";

/** Reusable message body text primitive for chatter entities and commands. */
export const CommChatterMessageBodyTextSchema = z.string().trim().min(1).max(20_000);

export type CommChatterMessageBodyText = z.infer<typeof CommChatterMessageBodyTextSchema>;
