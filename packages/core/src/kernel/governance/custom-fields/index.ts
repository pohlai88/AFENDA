/**
 * kernel/governance/custom-fields — public API surface.
 *
 * Exports two distinct concerns:
 *
 *   Definition management (kernel/admin):
 *     createCustomFieldDef, updateCustomFieldDef, deleteCustomFieldDef
 *     getCustomFieldDefs
 *
 *   Value operations (entity-domain):
 *     upsertCustomFieldValues
 *     getCustomFieldValues
 *
 * CustomFieldError is the domain error class for this module.
 */
export {
  CustomFieldError,
  createCustomFieldDef,
  updateCustomFieldDef,
  deleteCustomFieldDef,
  getCustomFieldDefs,
  upsertCustomFieldValues,
  getCustomFieldValues,
} from "./custom-fields.service";


export { getCustomFieldDefById, getCustomFieldDefsByApiKeys } from "./custom-fields.queries";
