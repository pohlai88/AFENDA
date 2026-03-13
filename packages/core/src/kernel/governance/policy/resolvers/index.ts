/**
 * Resolver barrel — re-exports all entity capability resolvers.
 *
 * Each resolver self-registers on import via `registerCapabilityResolver()`.
 */
import "./ap-invoice.resolver";
import "./supplier.resolver";
import "./gl-account.resolver";
import "./comm-workflow.resolver";
import "./comm-document.resolver";
