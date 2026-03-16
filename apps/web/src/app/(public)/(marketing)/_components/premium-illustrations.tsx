/**
 * Premium SVG Illustrations for AFENDA Marketing
 * Custom-designed icons with gradients, depth, and luxury aesthetics
 * 
 * Core Capabilities Icons (used on Home page):
 * - PremiumShield: Governance & Security
 * - PremiumGitBranch: Version Control & Audit Trail
 * - PremiumFileCheck: Verification & Validation
 * - PremiumSparkles: Innovation & Excellence
 * 
 * Platform Architecture Icons:
 * - PremiumArchitecture: System Structure
 * - PremiumDatabase: Data Storage
 * - PremiumDataFlow: Information Pipeline
 * - PremiumAuditTrail: Transaction Flow & Verification
 * 
 * All icons feature:
 * - Gradient fills with teal (#14b8a6, #0d9488) brand colors
 * - Layered designs for depth and premium feel
 * - Glow/shine effects for luxury aesthetics
 * - Responsive sizing via size prop (default 24px)
 */

import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Premium Shield Icon - Governance & Security
 * Features gradient fill and layered design
 */
export function PremiumShield({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="shield-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Main shield shape */}
      <path
        d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
        fill="url(#shield-gradient)"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner shield layer for depth */}
      <path
        d="M12 4.5L6 7.5v5c0 4.2 2.9 8.1 6 9 3.1-.9 6-4.8 6-9v-5l-6-3z"
        fill="rgba(11, 13, 18, 0.3)"
      />
      {/* Checkmark */}
      <path
        d="M9 12l2 2 4-4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shine effect */}
      <path
        d="M8 5L8 14C8 16 9 18 12 19"
        stroke="url(#shield-shine)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Premium Git Branch Icon - Version Control & Audit Trail
 * Features flowing lines and gradient nodes
 */
export function PremiumGitBranch({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="branch-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <radialGradient id="node-glow">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Branch paths */}
      <path
        d="M6 3v12"
        stroke="url(#branch-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6z"
        stroke="url(#branch-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 9c0 3-3 3-3 6v3"
        stroke="url(#branch-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Node glows */}
      <circle cx="6" cy="3" r="8" fill="url(#node-glow)" opacity="0.3" />
      <circle cx="18" cy="6" r="8" fill="url(#node-glow)" opacity="0.3" />
      <circle cx="6" cy="18" r="8" fill="url(#node-glow)" opacity="0.3" />
      {/* Nodes */}
      <circle cx="6" cy="3" r="3" fill="#14b8a6" />
      <circle cx="18" cy="6" r="3" fill="#0d9488" />
      <circle cx="6" cy="18" r="3" fill="#14b8a6" />
      {/* Center dots */}
      <circle cx="6" cy="3" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="18" cy="6" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="6" cy="18" r="1.5" fill="#fff" opacity="0.6" />
    </svg>
  );
}

/**
 * Premium File Check Icon - Verification & Validation
 * Features layered document with gradient checkmark
 */
export function PremiumFileCheck({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="check-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Document shadow */}
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        fill="rgba(11, 13, 18, 0.2)"
        transform="translate(1, 1)"
      />
      {/* Document */}
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        fill="rgba(30, 34, 42, 0.6)"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Document corner fold */}
      <path
        d="M14 2v6h6"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark circle background */}
      <circle cx="12" cy="14" r="5" fill="url(#check-gradient)" opacity="0.2" />
      <circle cx="12" cy="14" r="4" fill="url(#check-gradient)" />
      {/* Checkmark */}
      <path
        d="M10 14l1.5 1.5 3-3"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
    </svg>
  );
}

/**
 * Premium Sparkles Icon - Innovation & Excellence
 * Features animated star bursts with gradient
 */
export function PremiumSparkles({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <radialGradient id="sparkle-glow">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Large sparkle */}
      <circle cx="12" cy="8" r="6" fill="url(#sparkle-glow)" />
      <path
        d="M12 2v12M6 8h12M8.5 4.5l7 7M15.5 4.5l-7 7"
        stroke="url(#sparkle-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="8" r="2" fill="url(#sparkle-gradient)" />
      {/* Small sparkle top right */}
      <circle cx="19" cy="5" r="4" fill="url(#sparkle-glow)" />
      <path
        d="M19 3v4M17 5h4"
        stroke="url(#sparkle-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="19" cy="5" r="1" fill="#14b8a6" />
      {/* Small sparkle bottom left */}
      <circle cx="7" cy="17" r="4" fill="url(#sparkle-glow)" />
      <path
        d="M7 15v4M5 17h4"
        stroke="url(#sparkle-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="17" r="1" fill="#14b8a6" />
      {/* Tiny sparkle bottom right */}
      <path
        d="M18 18v2M17 19h2"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/**
 * Premium Audit Trail Icon - Transaction Flow & Verification
 * Features flowing path with verification nodes
 */
export function PremiumAuditTrail({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="trail-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      {/* Flowing audit trail path */}
      <path
        d="M3 6h2a2 2 0 012 2v12a2 2 0 01-2 2H3"
        stroke="url(#trail-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M21 6h-2a2 2 0 00-2 2v12a2 2 0 002 2h2"
        stroke="url(#trail-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Verification nodes */}
      <circle cx="12" cy="6" r="3" stroke="url(#trail-gradient)" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="url(#trail-gradient)" strokeWidth="2" fill="none" />
      <circle cx="12" cy="18" r="3" stroke="url(#trail-gradient)" strokeWidth="2" fill="none" />
      {/* Checkmarks in nodes */}
      <path d="M10.5 6l1 1 1.5-1.5" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 12l1 1 1.5-1.5" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 18l1 1 1.5-1.5" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Connecting lines */}
      <line x1="12" y1="9" x2="12" y2="9.5" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="15.5"
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Premium Data Flow Icon - Information Pipeline
 * Features flowing data streams with gradient
 */
export function PremiumDataFlow({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Data streams */}
      <path
        d="M4 6h16"
        stroke="url(#flow-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <path
        d="M4 12h16"
        stroke="url(#flow-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M4 18h16"
        stroke="url(#flow-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      {/* Arrow heads */}
      <path
        d="M18 4l2 2-2 2"
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 10l2 2-2 2"
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 16l2 2-2 2"
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Processing nodes */}
      <circle cx="8" cy="12" r="2" fill="#14b8a6" opacity="0.6" />
      <circle cx="12" cy="12" r="2.5" fill="#14b8a6" />
      <circle cx="16" cy="12" r="2" fill="#14b8a6" opacity="0.6" />
    </svg>
  );
}

/**
 * Premium Architecture Icon - System Structure
 * Features layered system diagram with connections
 */
export function PremiumArchitecture({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="arch-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      {/* Base layer */}
      <rect
        x="2"
        y="15"
        width="20"
        height="5"
        rx="1"
        fill="url(#arch-gradient)"
        opacity="0.3"
      />
      {/* Middle layer */}
      <rect x="4" y="9" width="16" height="4" rx="1" fill="url(#arch-gradient)" opacity="0.6" />
      {/* Top layer */}
      <rect x="6" y="3" width="12" height="4" rx="1" fill="url(#arch-gradient)" />
      {/* Connection lines */}
      <line x1="12" y1="7" x2="12" y2="9" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
      <line x1="12" y1="13" x2="12" y2="15" stroke="#14b8a6" strokeWidth="1.5" opacity="0.6" />
      <line x1="8" y1="7" x2="8" y2="9" stroke="#14b8a6" strokeWidth="1.5" opacity="0.4" />
      <line x1="16" y1="7" x2="16" y2="9" stroke="#14b8a6" strokeWidth="1.5" opacity="0.4" />
      <line x1="8" y1="13" x2="8" y2="15" stroke="#14b8a6" strokeWidth="1.5" opacity="0.4" />
      <line x1="16" y1="13" x2="16" y2="15" stroke="#14b8a6" strokeWidth="1.5" opacity="0.4" />
      {/* Connection nodes */}
      <circle cx="12" cy="5" r="1.5" fill="#fff" />
      <circle cx="12" cy="11" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="12" cy="17" r="1.5" fill="#fff" opacity="0.6" />
    </svg>
  );
}

/**
 * Premium Database Icon - Data Storage with Gradient
 * Features stacked database with shimmer effect
 */
export function PremiumDatabase({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="db-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      {/* Database cylinder top */}
      <ellipse cx="12" cy="5" rx="8" ry="3" fill="url(#db-gradient)" opacity="0.8" />
      <ellipse
        cx="12"
        cy="5"
        rx="8"
        ry="3"
        stroke="#14b8a6"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Database body */}
      <path
        d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"
        stroke="#14b8a6"
        strokeWidth="1.5"
        fill="rgba(20, 184, 166, 0.1)"
      />
      {/* Middle sections */}
      <ellipse cx="12" cy="12" rx="8" ry="3" stroke="#14b8a6" strokeWidth="1.5" fill="none" />
      <ellipse
        cx="12"
        cy="19"
        rx="8"
        ry="3"
        stroke="#14b8a6"
        strokeWidth="1.5"
        fill="url(#db-gradient)"
        opacity="0.6"
      />
      {/* Shine effect */}
      <path d="M6 6v12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
