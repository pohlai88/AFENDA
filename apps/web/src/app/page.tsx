/* shadcn-exempt: Landing page root — intentional dark terminal palette */
"use client";

import React, { useState, useCallback } from "react";
import "./(public)/(marketing)/marketing.css";
import { Hero } from "./(public)/(marketing)/Hero";
import { Features } from "./(public)/(marketing)/Features";
import { PillarArchitecture } from "./(public)/(marketing)/PillarArchitecture";
import { LedgerArchitecture } from "./(public)/(marketing)/LedgerArchitecture";
import { ComplianceEngine } from "./(public)/(marketing)/ComplianceEngine";
import { DashboardPreview } from "./(public)/(marketing)/DashboardPreview";
import { EcosystemConstellation } from "./(public)/(marketing)/EcosystemConstellation";
import { LandingNav } from "./(public)/(marketing)/LandingNav";
import {
  TrustBar,
  EnterpriseCapabilities,
  LiveDemoPreview,
  CTA,
  Footer,
} from "./(public)/(marketing)/Sections";

export default function Page() {
  const [heroRevealed, setHeroRevealed] = useState(false);
  const onRevealComplete = useCallback(() => setHeroRevealed(true), []);

  return (
    <div
      data-marketing
      className="min-h-screen bg-[var(--mk-bg)] text-slate-50 font-sans antialiased"
    >
      {heroRevealed && <LandingNav />}
      <main className="flex flex-col">
        <Hero onRevealComplete={onRevealComplete} />
        <Features />
        <PillarArchitecture />
        <LedgerArchitecture />
        <ComplianceEngine />
        <DashboardPreview />
        <EnterpriseCapabilities />
        <TrustBar />
        <EcosystemConstellation />
        <LiveDemoPreview />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}