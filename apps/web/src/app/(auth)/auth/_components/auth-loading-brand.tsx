import { memo } from "react";
import { AfendaLogo } from "../../../(public)/(marketing)/AfendaLogo";

/**
 * Branded loading indicator for auth pages.
 *
 * Renders the unified AfendaLogo (icon + name + tagline) as two
 * center-aligned lines with a pulse animation.
 *
 * @example
 * ```tsx
 * // In any auth loading.tsx:
 * import { AuthLoadingBrand } from "../_components/auth-loading-brand";
 *
 * export default function Loading() {
 *   return <AuthLoadingBrand />;
 * }
 * ```
 */
export const AuthLoadingBrand = memo(function AuthLoadingBrand() {
  return (
    <div className="flex items-center justify-center py-16 animate-pulse">
      <AfendaLogo size="md" variant="static" />
    </div>
  );
});
