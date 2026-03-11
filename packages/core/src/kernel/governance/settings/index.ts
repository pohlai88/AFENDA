/**
 * Barrel — kernel/governance/settings
 */
export { getEffectiveSettings, getSettingsRaw } from "./settings.queries";
export { upsertSettings, SettingsError } from "./settings.service";
export { SETTING_REGISTRY, type SettingDefinition, type SettingCategory } from "./settings.registry";
export { SETTING_VALUE_SCHEMAS } from "./settings.value-schemas";
