import type { ReactNode } from "react";
import Link from "next/link";

import { AfendaMark } from "@/app/(public)/(marketing)/AfendaMark";
import "./auth.css";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main data-auth>
      <div className="auth-page auth-layout-split">
        {/* Hero / left column */}
        <div className="auth-hero-lead">
          <Link href="/" className="auth-brand" aria-label="Return to AFENDA homepage">
            <AfendaMark size={28} variant="static" />
            <span className="auth-brand-name">AFENDA</span>
          </Link>

          <div className="auth-header">
            <h1 className="auth-title">Secure access for audit-first operations.</h1>
            <p className="auth-description">
              Sessions, protected routes, and server rendering now flow through Neon Auth so AFENDA
              can keep access control inside the same operational surface as the rest of the app.
            </p>
          </div>

          <div className="auth-grid auth-grid--2">
            <div className="auth-info-tile">
              Signed cookies cache session state for fast server reads.
            </div>
            <div className="auth-info-tile">
              Protected route groups now redirect through a dedicated auth entry point.
            </div>
          </div>
        </div>

        {/* Panel / right column */}
        <div className="auth-panel-col">{children}</div>
      </div>
    </main>
  );
}
