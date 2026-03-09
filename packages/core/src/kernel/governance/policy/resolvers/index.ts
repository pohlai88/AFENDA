/**
 * Resolver barrel — re-exports all entity capability resolvers.
 *
 * Each resolver self-registers on import via `registerCapabilityResolver()`.
 */
import "./ap-invoice.resolver.js";
import "./supplier.resolver.js";
import "./gl-account.resolver.js";
