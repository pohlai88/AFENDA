/**
 * Barrel — kernel/governance/settings
 */
export { getEffectiveSettings, getSettingsRaw } from "./settings.queries.js";
export { upsertSettings, SettingsError } from "./settings.service.js";
export { SETTING_REGISTRY, type SettingDefinition, type SettingCategory } from "./settings.registry.js";
export { SETTING_VALUE_SCHEMAS } from "./settings.value-schemas.js";
