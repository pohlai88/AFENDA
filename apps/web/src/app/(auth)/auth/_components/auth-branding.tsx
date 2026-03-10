/**
 * token-compliance-exempt: AFENDA brand mark uses #14b8a6 (teal-500) as official brand color
 * AuthBranding — Static brand lock-up for authentication pages.
 * Zero-JS alternative to AfendaLogo/AfendaMark for auth flows.
 * No Framer Motion dependency = ~30KB smaller bundle + faster paint.
 * Auth pages prioritize conversion speed over delight.
 */

interface AuthBrandingProps {
  /** Proportional size preset */
  size?: "sm" | "md";
  className?: string;
}

export function AuthBranding({ size = "md", className = "" }: AuthBrandingProps) {
  const iconSize = size === "sm" ? 18 : 24;
  const textClass = size === "sm" ? "text-lg" : "text-2xl";
  const gap = size === "sm" ? "gap-1.5" : "gap-2.5";

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* AFENDA Mark — Static SVG (no animation) */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AFENDA"
        className="flex-shrink-0"
      >
        {/* Dot 1 */}
        <circle cx="5" cy="12" r="2" fill="#14b8a6" />
        {/* Dot 2 */}
        <circle cx="12" cy="12" r="2" fill="#14b8a6" />
        {/* Audit Ring (hollow) */}
        <circle cx="19" cy="12" r="2.5" stroke="#14b8a6" strokeWidth="1.5" fill="none" />
      </svg>

      {/* Brand Name */}
      <span className={`${textClass} font-bold tracking-[-0.03em] leading-none text-foreground`}>
        AFENDA
      </span>
    </div>
  );
}
