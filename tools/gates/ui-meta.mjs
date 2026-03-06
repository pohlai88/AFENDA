#!/usr/bin/env node
/**
 * tools/gates/ui-meta.mjs
 *
 * CI gate: validates the UI metadata registry for referential integrity,
 * performance budgets, field-kit completeness, and overlay safety.
 *
 * ─── Rules ──────────────────────────────────────────────────────────────────
 *
 *  1. FIELD_KIT_MISSING      — every `fieldType` used in an entity has a
 *                               registered FieldKit handler.
 *  2. VIEW_FIELD_UNKNOWN     — every fieldKey in a view references a
 *                               valid field in the entity definition.
 *  3. LIST_COLUMN_LIMIT      — list views ≤ 12 columns.
 *  4. FORM_FIELD_LIMIT       — form views ≤ 40 fields per tab.
 *  5. META_NO_REACT          — packages/ui/src/meta/ must have zero React
 *                               imports (keep server-importable).
 *  6. FLOW_STATE_ORPHAN      — every flow transition `from`/`to` must
 *                               reference a declared state.
 *
 * Usage:
 *   node tools/gates/ui-meta.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const META_DIR = resolve(ROOT, "packages/ui/src/meta");
const FIELD_KIT_DIR = resolve(ROOT, "packages/ui/src/field-kit");
const MAX_LIST_COLUMNS = 12;
const MAX_FORM_FIELDS_PER_TAB = 40;

// ─── Rule Documentation ─────────────────────────────────────────────────────

const RULE_DOCS = {
  FIELD_KIT_MISSING: {
    why: "Every field type must have a renderer and widget — missing kits cause runtime crashes.",
    docs: "See docs/adr/ui-ux.md — Phase 3: Field Capability Matrix",
  },
  VIEW_FIELD_UNKNOWN: {
    why: "Views referencing non-existent fields break at render time.",
    docs: "See docs/adr/ui-ux.md — Phase 9: CI Gate",
  },
  LIST_COLUMN_LIMIT: {
    why: "Tables with > 12 columns degrade UX on standard viewports.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Performance budgets",
  },
  FORM_FIELD_LIMIT: {
    why: "Tabs with > 40 fields cause slow renders and poor UX.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Performance budgets",
  },
  META_NO_REACT: {
    why: "Meta directory must stay React-free so API can import without pulling UI deps.",
    docs: "See docs/adr/ui-ux.md — Phase 2: Entity Registry",
  },
  FLOW_STATE_ORPHAN: {
    why: "Flow transitions referencing undefined states cause runtime errors.",
    docs: "See docs/adr/ui-ux.md — Phase 9: CI Gate",
  },
  ACTION_CAP_MISSING: {
    why: "Every flow transition action must have a corresponding capability resolver mapping.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Policy coverage",
  },
  PERMISSION_UNKNOWN: {
    why: "Flow guard permissions must reference valid Permissions.* keys from contracts.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Referential integrity",
  },
  QUERY_PROFILE_UNKNOWN: {
    why: "List view queryProfile.apiEndpoint must reference a known API route.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Referential integrity",
  },
  OVERLAY_INVARIANT: {
    why: "Overlays must not delete base fields or change field types — hide only.",
    docs: "See docs/adr/ui-ux.md — Phase 8: Non-negotiable invariants",
  },
  HANDLER_INCOMPLETE: {
    why: "Every FieldKit must export all 4 handlers: CellRenderer, FormWidget, filterOps, exportAdapter.",
    docs: "See docs/adr/ui-ux.md — Phase 9: UX consistency",
  },
  COMMAND_SCHEMA_REF_UNKNOWN: {
    why: "Form view commandSchemaRef must reference an existing contracts command schema export.",
    docs: "See docs/adr/ui-ux.md — Phase 9: Referential integrity",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract registered field types from field-kit/registry.ts.
 * Looks for keys in the REGISTRY object.
 */
function extractRegisteredFieldKits() {
  const registryPath = resolve(FIELD_KIT_DIR, "registry.ts");
  let content;
  try {
    content = readFileSync(registryPath, "utf-8");
  } catch {
    return new Set();
  }

  // Match keys like:  string: stringKit,  money: moneyKit,
  const kits = new Set();
  const keyPattern = /^\s+(\w+)\s*:/gm;
  let m;
  while ((m = keyPattern.exec(content))) {
    kits.add(m[1]);
  }
  return kits;
}

/**
 * Parse entity registration files to extract field types, view definitions,
 * and flow definitions. Uses simple regex parsing on the TS source.
 */
function parseEntityFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const relPath = relative(ROOT, filePath).replaceAll("\\", "/");
  const result = {
    relPath,
    fieldTypes: new Set(),
    fieldKeys: new Set(),
    views: [],
    flowStates: new Set(),
    flowTransitions: [],
    /** Guard permissions referenced in flow transitions */
    guardPermissions: new Set(),
    /** queryProfile.apiEndpoint values from list views */
    queryEndpoints: [],
    /** commandSchemaRef values from form views */
    commandSchemaRefs: [],
    /** actionKey values from flow transitions */
    flowActionKeys: new Set(),
    /** Rules suppressed via `@ui-gate-suppress RULE_CODE` comments */
    suppressedRules: new Set(),
  };

  // Extract fieldType values: fieldType: "money", fieldType: "string", etc.
  const ftPattern = /fieldType:\s*"(\w+)"/g;
  let m;

  // Extract @ui-gate-suppress directives
  const suppressPattern = /@ui-gate-suppress\s+(\w+)/g;
  while ((m = suppressPattern.exec(content))) {
    result.suppressedRules.add(m[1]);
  }

  while ((m = ftPattern.exec(content))) {
    result.fieldTypes.add(m[1]);
  }

  // Extract fieldKey values from field definitions: fieldKey: "invoiceNumber"
  const fkPattern = /fieldKey:\s*"([^"]+)"/g;
  while ((m = fkPattern.exec(content))) {
    result.fieldKeys.add(m[1]);
  }

  // Extract column fieldKey references in views
  // Detect list views by looking for viewType: "list" blocks
  const viewBlocks = content.split(/viewType:\s*"/);
  for (let i = 1; i < viewBlocks.length; i++) {
    const block = viewBlocks[i];
    const typeEnd = block.indexOf('"');
    const viewType = block.slice(0, typeEnd);

    if (viewType === "list") {
      // Count columns — look for fieldKey references in columns array
      const columnsMatch = block.match(/columns:\s*\[([\s\S]*?)\]/);
      if (columnsMatch) {
        const colFieldKeys = [];
        const colPattern = /fieldKey:\s*"([^"]+)"/g;
        let cm;
        while ((cm = colPattern.exec(columnsMatch[1]))) {
          colFieldKeys.push(cm[1]);
        }
        result.views.push({ viewType: "list", fieldKeys: colFieldKeys });
      }
    } else if (viewType === "form") {
      // Count fields per tab — look for tabs array
      const tabPattern = /tabKey:\s*"([^"]+)"[\s\S]*?sections:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
      let tm;
      while ((tm = tabPattern.exec(block))) {
        const tabKey = tm[1];
        const sectionsBlock = tm[2];
        const fieldRefs = [];
        const frPattern = /fieldKey:\s*"([^"]+)"/g;
        let fm;
        while ((fm = frPattern.exec(sectionsBlock))) {
          fieldRefs.push(fm[1]);
        }
        result.views.push({
          viewType: "form",
          tabKey,
          fieldKeys: fieldRefs,
        });
      }
    }
  }

  // Extract flow states and transitions
  const statePattern = /stateKey:\s*"([^"]+)"/g;
  while ((m = statePattern.exec(content))) {
    result.flowStates.add(m[1]);
  }

  const transPattern = /from:\s*"([^"]+)"[\s\S]*?to:\s*"([^"]+)"/g;
  while ((m = transPattern.exec(content))) {
    result.flowTransitions.push({ from: m[1], to: m[2] });
  }

  // Extract actionKey from flow transitions only (not from ActionDef array).
  // Scope to the transitions block by finding from/to pairs and their adjacent actionKey.
  const transActionPattern = /from:\s*"[^"]+"[\s\S]*?to:\s*"[^"]+"[\s\S]*?actionKey:\s*"([^"]+)"/g;
  while ((m = transActionPattern.exec(content))) {
    result.flowActionKeys.add(m[1]);
  }

  // Extract guard permissions: permission: "ap.invoice.approve"
  const permPattern = /permission:\s*"([^"]+)"/g;
  while ((m = permPattern.exec(content))) {
    result.guardPermissions.add(m[1]);
  }

  // Extract queryProfile apiEndpoint values: apiEndpoint: "/v1/invoices"
  const epPattern = /apiEndpoint:\s*"([^"]+)"/g;
  while ((m = epPattern.exec(content))) {
    result.queryEndpoints.push(m[1]);
  }

  // Extract commandSchemaRef values: commandSchemaRef: "SubmitInvoiceCommand"
  const csrPattern = /commandSchemaRef:\s*"([^"]+)"/g;
  while ((m = csrPattern.exec(content))) {
    result.commandSchemaRefs.push(m[1]);
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Extract known Permission values from contracts/src/iam/role.entity.ts.
 * Looks for string literals in the Permissions object.
 */
function extractKnownPermissions() {
  const perms = new Set();
  const filePath = resolve(ROOT, "packages/contracts/src/iam/role.entity.ts");
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return perms;
  }

  // Match permission string values: "ap.invoice.approve", "gl.journal.post", etc.
  const block = content.match(/Permissions\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (block) {
    const valPattern = /:\s*"([^"]+)"/g;
    let m;
    while ((m = valPattern.exec(block[1]))) {
      perms.add(m[1]);
    }
  }
  return perms;
}

/**
 * Extract known API route paths from apps/api/src/routes/.
 * Looks for route registration patterns in Fastify route files.
 */
function extractKnownApiRoutes() {
  const routes = new Set();
  const routesDir = resolve(ROOT, "apps/api/src/routes");
  let routeFiles;
  try {
    routeFiles = walkTs(routesDir);
  } catch {
    return routes;
  }

  for (const file of routeFiles) {
    const content = readFileSync(file, "utf-8");
    // Match typed.get("/path", ...) and typed.post("/path", ...) patterns
    // Routes are registered with prefix "/v1" at app level
    const routePattern = /typed\.(?:get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;
    let m;
    while ((m = routePattern.exec(content))) {
      const path = `/v1${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
      routes.add(path);
    }

    // Also match app.get("/path", ...) and app.post("/path", ...) patterns
    const appPattern = /app\.(?:get|post|put|delete|patch)\(\s*["']([^"']+)["']/g;
    while ((m = appPattern.exec(content))) {
      const path = m[1].startsWith("/v1") ? m[1] : `/v1${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
      routes.add(path);
    }
  }
  return routes;
}

/**
 * Extract exported command schema names from contracts index barrel.
 * Looks for Schema export names matching *CommandSchema or *Command.
 */
function extractCommandSchemaExports() {
  const schemas = new Set();
  const contractsDir = resolve(ROOT, "packages/contracts/src");

  // Walk all TS files in contracts and find exported schemas
  let files;
  try {
    files = walkTs(contractsDir);
  } catch {
    return schemas;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    // Match export const XxxCommandSchema or export type XxxCommand
    const exportPattern = /export\s+(?:const|type|interface)\s+(\w*Command\w*)/g;
    let m;
    while ((m = exportPattern.exec(content))) {
      schemas.add(m[1]);
    }
  }
  return schemas;
}

/**
 * Check that every field-kit module exports all 4 required handlers.
 * Scans each kit file for CellRenderer, FormWidget, filterOps, exportAdapter.
 */
function checkFieldKitHandlerCompleteness() {
  const kitViolations = [];
  const kitsDir = resolve(FIELD_KIT_DIR, "kits");
  let kitFiles;
  try {
    kitFiles = walkTs(kitsDir);
  } catch {
    return kitViolations;
  }

  const requiredHandlers = ["CellRenderer", "FormWidget", "filterOps", "exportAdapter"];

  for (const file of kitFiles) {
    const content = readFileSync(file, "utf-8");
    const relPath = relative(ROOT, file).replaceAll("\\", "/");

    for (const handler of requiredHandlers) {
      // Check if the handler name appears as a property in the exported kit object
      if (!content.includes(handler)) {
        kitViolations.push({
          ruleCode: "HANDLER_INCOMPLETE",
          file: relPath,
          line: null,
          message: `FieldKit missing "${handler}" handler.`,
          fix: `Add a "${handler}" property to the exported FieldKit object.`,
        });
      }
    }
  }
  return kitViolations;
}

/**
 * Extract action keys from capability resolver files.
 * Looks for caps["action.key"] patterns in resolver TS files.
 */
function extractCapResolverActionKeys() {
  const actionKeys = new Set();
  const resolversDir = resolve(ROOT, "packages/core/src/policy/resolvers");
  let resolverFiles;
  try {
    resolverFiles = walkTs(resolversDir);
  } catch {
    return actionKeys;
  }

  for (const file of resolverFiles) {
    const content = readFileSync(file, "utf-8");
    // Match caps["invoice.submit"] = ... patterns
    const capPattern = /caps\["([^"]+)"\]/g;
    let m;
    while ((m = capPattern.exec(content))) {
      actionKeys.add(m[1]);
    }
  }
  return actionKeys;
}

const start = performance.now();
const violations = [];

// 1. Check Meta directory for React imports
const metaFiles = walkTs(META_DIR);
let metaFileCount = 0;

for (const file of metaFiles) {
  metaFileCount++;
  const content = readFileSync(file, "utf-8");
  const relPath = relative(ROOT, file).replaceAll("\\", "/");

  // Check for React imports
  const reactPattern = /(?:from\s+["']react["']|import\s+.*["']react["']|require\s*\(\s*["']react["']\s*\))/g;
  let m;
  let lineNum = 0;
  for (const line of content.split("\n")) {
    lineNum++;
    if (reactPattern.test(line)) {
      violations.push({
        ruleCode: "META_NO_REACT",
        file: relPath,
        line: lineNum,
        message: "React import found in meta/ directory — must be pure TS",
        fix: "Move React-dependent code to field-kit/ or generated/ directory.",
        statement: line.trim(),
      });
    }
    // Reset regex state
    reactPattern.lastIndex = 0;
  }
}

// 2. Extract registered field kits
const registeredKits = extractRegisteredFieldKits();

// 2b. Extract known Permissions values from contracts
const knownPermissions = extractKnownPermissions();

// 2c. Extract known API route paths
const knownApiRoutes = extractKnownApiRoutes();

// 2d. Extract known command schema exports from contracts
const knownCommandSchemas = extractCommandSchemaExports();

// 2e. Extract capability resolver action keys
const capResolverActionKeys = extractCapResolverActionKeys();

// 2f. Check field-kit handler completeness
const handlerViolations = checkFieldKitHandlerCompleteness();
violations.push(...handlerViolations);

// 3. Parse entity files and validate
const entitiesDir = resolve(META_DIR, "entities");
let entityFiles;
try {
  entityFiles = walkTs(entitiesDir);
} catch {
  entityFiles = [];
}

let entityCount = 0;

for (const entityFile of entityFiles) {
  entityCount++;
  const entity = parseEntityFile(entityFile);

  /** Push a violation only if the rule is not suppressed in this entity. */
  function pushViolation(v) {
    if (!entity.suppressedRules.has(v.ruleCode)) {
      violations.push(v);
    }
  }

  // Rule: FIELD_KIT_MISSING — every fieldType must have a registered kit
  for (const ft of entity.fieldTypes) {
    if (!registeredKits.has(ft)) {
      pushViolation({
        ruleCode: "FIELD_KIT_MISSING",
        file: entity.relPath,
        line: null,
        message: `Field type "${ft}" has no registered FieldKit handler.`,
        fix: `Add a "${ft}" module in packages/ui/src/field-kit/kits/ and register it in registry.ts.`,
      });
    }
  }

  // Rule: VIEW_FIELD_UNKNOWN — view field references must exist in entity
  for (const view of entity.views) {
    for (const fk of view.fieldKeys) {
      if (!entity.fieldKeys.has(fk)) {
        pushViolation({
          ruleCode: "VIEW_FIELD_UNKNOWN",
          file: entity.relPath,
          line: null,
          message: `View references field "${fk}" which is not defined in the entity.`,
          fix: `Add a FieldDef with fieldKey "${fk}" to the entity's fieldDefs array, or remove it from the view.`,
          field: fk,
        });
      }
    }
  }

  // Rule: LIST_COLUMN_LIMIT — list views ≤ 12 columns
  for (const view of entity.views) {
    if (view.viewType === "list" && view.fieldKeys.length > MAX_LIST_COLUMNS) {
      pushViolation({
        ruleCode: "LIST_COLUMN_LIMIT",
        file: entity.relPath,
        line: null,
        message: `List view has ${view.fieldKeys.length} columns — max is ${MAX_LIST_COLUMNS}.`,
        fix: `Remove or hide columns to stay under ${MAX_LIST_COLUMNS}. Consider using overlays for role-specific columns.`,
      });
    }
  }

  // Rule: FORM_FIELD_LIMIT — form views ≤ 40 fields per tab
  for (const view of entity.views) {
    if (
      view.viewType === "form" &&
      view.fieldKeys.length > MAX_FORM_FIELDS_PER_TAB
    ) {
      pushViolation({
        ruleCode: "FORM_FIELD_LIMIT",
        file: entity.relPath,
        line: null,
        message: `Form tab "${view.tabKey}" has ${view.fieldKeys.length} fields — max is ${MAX_FORM_FIELDS_PER_TAB}.`,
        fix: `Split fields across multiple tabs or sections to stay under ${MAX_FORM_FIELDS_PER_TAB} per tab.`,
      });
    }
  }

  // Rule: FLOW_STATE_ORPHAN — transition from/to must reference declared states
  for (const trans of entity.flowTransitions) {
    if (entity.flowStates.size > 0 && !entity.flowStates.has(trans.from)) {
      pushViolation({
        ruleCode: "FLOW_STATE_ORPHAN",
        file: entity.relPath,
        line: null,
        message: `Flow transition from "${trans.from}" references an undeclared state.`,
        fix: `Add a FlowState with stateKey "${trans.from}" to the flow definition.`,
      });
    }
    if (entity.flowStates.size > 0 && !entity.flowStates.has(trans.to)) {
      pushViolation({
        ruleCode: "FLOW_STATE_ORPHAN",
        file: entity.relPath,
        line: null,
        message: `Flow transition to "${trans.to}" references an undeclared state.`,
        fix: `Add a FlowState with stateKey "${trans.to}" to the flow definition.`,
      });
    }
  }

  // Rule: PERMISSION_UNKNOWN — guard permissions must exist in Permissions.*
  for (const perm of entity.guardPermissions) {
    if (!knownPermissions.has(perm)) {
      pushViolation({
        ruleCode: "PERMISSION_UNKNOWN",
        file: entity.relPath,
        line: null,
        message: `Guard permission "${perm}" not found in Permissions constants.`,
        fix: `Add the permission to Permissions in packages/contracts/src/iam/role.entity.ts, or correct the typo.`,
      });
    }
  }

  // Rule: QUERY_PROFILE_UNKNOWN — queryProfile endpoints must be known routes
  for (const ep of entity.queryEndpoints) {
    if (!knownApiRoutes.has(ep)) {
      pushViolation({
        ruleCode: "QUERY_PROFILE_UNKNOWN",
        file: entity.relPath,
        line: null,
        message: `queryProfile.apiEndpoint "${ep}" does not match any known API route.`,
        fix: `Verify the endpoint exists in apps/api/src/routes/ or update the queryProfile.`,
      });
    }
  }

  // Rule: COMMAND_SCHEMA_REF_UNKNOWN — commandSchemaRef must be a known schema
  for (const ref of entity.commandSchemaRefs) {
    if (knownCommandSchemas.size > 0 && !knownCommandSchemas.has(ref)) {
      pushViolation({
        ruleCode: "COMMAND_SCHEMA_REF_UNKNOWN",
        file: entity.relPath,
        line: null,
        message: `commandSchemaRef "${ref}" not found in contracts command schema exports.`,
        fix: `Verify the schema name matches an export in packages/contracts/src/ (e.g. "SubmitInvoiceCommandSchema").`,
      });
    }
  }

  // Rule: ACTION_CAP_MISSING — flow transition actionKeys must have resolver coverage
  // (We check this per-entity by verifying that each flow actionKey maps to a
  //  known action key in the capability resolver. For now we extract resolver
  //  action keys from the resolver files.)
  if (entity.flowActionKeys.size > 0 && capResolverActionKeys.size > 0) {
    for (const ak of entity.flowActionKeys) {
      if (!capResolverActionKeys.has(ak)) {
        pushViolation({
          ruleCode: "ACTION_CAP_MISSING",
          file: entity.relPath,
          line: null,
          message: `Flow action "${ak}" has no capability resolver mapping.`,
          fix: `Add an action cap for "${ak}" in the entity's capability resolver (packages/core/src/policy/resolvers/).`,
        });
      }
    }
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const elapsed = ((performance.now() - start) / 1000).toFixed(2);

const stats = {
  "Meta files:": metaFileCount,
  "Entity files:": entityCount,
  "Field kits:": registeredKits.size,
  "Time:": `${elapsed}s`,
};

if (violations.length > 0) {
  reportViolations({
    gateName: "UI META CHECK",
    violations,
    ruleDocs: RULE_DOCS,
    stats,
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: "ui-meta check",
    detail: `${metaFileCount} meta files, ${entityCount} entities, ${registeredKits.size} field kits in ${elapsed}s`,
  });
}
