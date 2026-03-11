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
        scrolled
          ? "mk-nav-scrolled"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mk-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center group">
            <AfendaLogo size="sm" showTagline={false} className="group-hover:opacity-80 transition-opacity" />
          </a>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-slate-500 hover:text-slate-200 transition-colors tracking-wide"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA — TODO: Replace when new auth is scaffolded */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" className="hidden sm:inline-flex text-sm px-4">
                Sign In
              </Button>
            </Link>
            <Link href="/">
              <Button variant="default" className="text-sm px-4 py-2 gap-1.5">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
