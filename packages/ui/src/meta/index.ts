/**
 * Barrel — re-exports the meta registry and types.
 *
 * RULES:
 *   1. ZERO React imports — pure TS barrel.
 *   2. Entity registrations are not re-exported individually —
 *      consumers use the registry API.
 */
export { type EntityRegistration } from "./types";
export {
  getEntityRegistration,
  getEntity,
  getView,
  getFlow,
  getActions,
  listEntityKeys,
  registerEntity,
} from "./registry";
export {
  applyOverlays,
  OverlayConflictError,
  OverlayVersionMismatchError,
  type OverlayContext,
} from "./overlay";
