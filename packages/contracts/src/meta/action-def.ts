/**
 * ActionDef — metadata describing a launchable action in the UI.
 *
 * RULES:
 *   1. Transport shape only — no React, no Tailwind, no icon imports.
 *   2. `route` is the Next.js route path (relative to app/).
 *   3. `viewKey` links to a registered ViewDef for the action's target.
 *   4. `menuPath` is a hierarchical string for nav placement:
 *      e.g. `"finance/ap"`.
 */
import { z } from "zod";

export const ActionDefSchema = z.object({
  /** Unique action identifier: `"invoice.submit"`, `"invoice.approve"` */
  actionKey: z.string().min(1).max(128),

  /** Human label: `"Submit Invoice"` */
  label: z.string().min(1).max(128),

  /** Next.js route path (relative to app/): `"/finance/ap/invoices/new"` */
  route: z.string().min(1).max(256).optional(),

  /** Target view key — the view this action opens/operates on */
  viewKey: z.string().min(1).max(128).optional(),

  /** Default context passed to the action as JSON */
  defaultContextJson: z.record(z.string(), z.unknown()).optional(),

  /** Hierarchical menu placement: `"finance/ap"` */
  menuPath: z.string().max(256).optional(),

  /** Action type: navigation vs. modal vs. inline */
  actionType: z.enum(["navigate", "modal", "inline"]).default("navigate"),
});

export type ActionDef = z.infer<typeof ActionDefSchema>;
