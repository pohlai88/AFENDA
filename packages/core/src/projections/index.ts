/**
 * Portal Projection Layer
 * 
 * This package provides the projection/interaction layer between canonical
 * domain truth and portal-specific UI experiences.
 * 
 * ## Architecture
 * 
 * ```
 * Canonical Domain Layer (AP, AR, IR, etc.)
 *          ↓
 * Projection/Interaction Layer (this package)
 *          ↓
 * Portal Experience Layer (web/api routes)
 * ```
 * 
 * ## Key Principles
 * 
 * 1. **Domains own truth** — Canonical entities live in domain modules
 * 2. **Projections shape truth** — Transform domain data for portal consumption
 * 3. **Portals present truth** — UI consumes projections, never raw domain queries
 * 
 * ## Projection Types
 * 
 * - **Class A (Read-only):** Simple domain queries with field filtering
 * - **Class B (Composite):** Multi-domain aggregations and calculations
 * - **Class C (Interaction):** User actions that route to domain commands
 * 
 * ## Usage
 * 
 * ```typescript
 * import { supplierProjections } from "./index";
 * 
 * // In API route or server component
 * const statement = await supplierProjections.getSupplierStatement(
 *   db,
 *   ctx,
 *   supplierId
 * );
 * 
 * // statement is wrapped in ProjectionEnvelope for traceability
 * console.log(statement.projectionType); // "supplier-statement"
 * console.log(statement.dominantDomain); // "ap"
 * console.log(statement.data); // { supplierId, totalOutstanding, ... }
 * ```
 */

// Shared types
export * from "./shared/projection-envelope.js";
export * from "./shared/projection-types.js";

// Portal projection modules
export * as supplierProjections from "./supplier/index.js";
export * as customerProjections from "./customer/index.js";
export * as investorProjections from "./investor/index.js";
export * as contractorProjections from "./contractor/index.js";
export * as franchiseeProjections from "./franchisee/index.js";
export * as cidProjections from "./cid/index.js";
