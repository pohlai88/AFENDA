"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "./_landing-ui";
import { AfendaLogo } from "./AfendaLogo";

const navLinks = [
  { label: "Platform", href: "#features" },
  { label: "Architecture", href: "#architecture" },
  { label: "Compliance", href: "#compliance" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Ecosystem", href: "#ecosystem" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={`mk-nav ${
        scrolled ? "mk-nav-scrolled" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mk-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="#" className="group flex items-center">
            <AfendaLogo
              size="sm"
              showTagline={false}
              className="transition-opacity group-hover:opacity-80"
            />
          </a>

          {/* Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" className="hidden px-4 text-sm sm:inline-flex">
                Workspace
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="default" className="gap-1.5 px-4 py-2 text-sm">
                Open App
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
