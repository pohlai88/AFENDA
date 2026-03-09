"use client";

import React from "react";
import { motion } from "motion/react";
import { Badge } from "./_landing-ui";
import { FileSpreadsheet, Flag, ShieldCheck, CheckCircle2 } from "lucide-react";

export function ComplianceEngine() {
  const features = [
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-teal-400" />,
      title: "Full IFRS & Localization Data",
      description:
        "Natively handles multi-GAAP, full IFRS requirements, and localized statutory reporting. Generate universally compliant financial reports automatically.",
    },
    {
      icon: <Flag className="w-6 h-6 text-indigo-400" />,
      title: "XBRL Flag Compliances",
      description:
        "Automated XBRL tagging embedded directly inside the ledger. Validation rules flag discrepancies in real-time, eliminating end-of-quarter mapping.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: "Big4 Auditor Engine",
      description:
        "Pre-configured audit trails and verification logic co-developed with top-tier audit firms. Grant auditors read-only access to a cryptographic ledger.",
    },
  ];

  return (
    <section
      className="py-32 mk-section-card border-t border-slate-900 relative z-10 overflow-hidden"
      id="compliance"
    >
      <div className="mk-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Side: Content */}
          <div className="order-2 lg:order-1 relative z-10">
            <Badge
              variant="outline"
              className="mb-6 border-slate-700 text-teal-400 font-mono tracking-widest uppercase"
            >
              Global Regulatory Engine
            </Badge>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6 leading-tight">
              Absolute Compliance.<br />
              <span className="text-slate-500">Zero Friction.</span>
            </h2>
            <p className="text-lg text-slate-400 font-light mb-12 max-w-lg">
              Built for the most demanding regulatory environments. AFENDA&apos;s engine
              continuously validates your global financial data against changing international
              standards.
            </p>

            <div className="space-y-10">
              {features.map((feat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="mt-1 w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-teal-500/50 group-hover:bg-slate-800 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    {feat.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-slate-200 mb-2 tracking-tight group-hover:text-white transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed font-light text-sm md:text-base">
                      {feat.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Side: 3D Illustration */}
          <div
            className="order-1 lg:order-2 relative h-[500px] lg:h-[700px] w-full flex items-center justify-center"
            style={{ perspective: "2000px" }}
          >
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />

            <motion.div
              initial={{ rotateX: 60, rotateZ: -45, y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative w-64 h-64 md:w-80 md:h-80"
            >
              {/* Vertical Beam connecting layers */}
              <motion.div
                className="absolute left-1/2 top-1/2 w-[2px] h-[300px] bg-gradient-to-t from-emerald-500/0 via-teal-400 to-teal-500/0 blur-[1px]"
                style={{ x: "-50%", y: "-50%", rotateX: 90, z: 80 }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Top Layer: Auditor Engine */}
              <motion.div
                animate={{ z: [140, 160, 140] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-slate-900/80 border-2 border-emerald-500/50 rounded-xl flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.3)] backdrop-blur-md"
              >
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
                <ShieldCheck className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <div className="absolute -bottom-6 bg-slate-900 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded font-mono text-[10px] md:text-xs font-bold tracking-widest shadow-lg whitespace-nowrap">
                  BIG4_AUDITOR_ENGINE
                </div>
              </motion.div>

              {/* Middle Layer: XBRL */}
              <motion.div
                animate={{ z: [70, 85, 70] }}
                transition={{ duration: 4, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-6 bg-[#0B0D12]/80 border border-indigo-500/50 rounded-xl flex flex-col items-center justify-center backdrop-blur-md shadow-[0_10px_30px_rgba(99,102,241,0.2)]"
              >
                <div className="w-full h-full p-6 grid grid-cols-4 gap-3 opacity-60">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded border ${
                        i % 3 === 0
                          ? "border-indigo-400 bg-indigo-500/20"
                          : "border-slate-700 bg-slate-800"
                      } flex items-center justify-center`}
                    >
                      {i % 3 === 0 && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-6 bg-[#0B0D12] text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded font-mono text-[10px] md:text-xs font-bold tracking-widest shadow-lg whitespace-nowrap">
                  XBRL_COMPLIANCE_FLAGS
                </div>
              </motion.div>

              {/* Bottom Layer: IFRS */}
              <motion.div
                animate={{ z: [0, 10, 0] }}
                transition={{ duration: 4, delay: 1, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-12 bg-slate-950/90 border border-teal-500/30 rounded-xl flex items-center justify-center overflow-hidden shadow-2xl"
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#14b8a6_1px,transparent_1px),linear-gradient(to_bottom,#14b8a6_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-10" />

                {/* Scanning line */}
                <motion.div
                  animate={{ y: ["-100%", "300%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent to-teal-500/20 border-b border-teal-500/50"
                />

                <div className="relative z-10 grid grid-cols-2 gap-8 opacity-40">
                  <div className="space-y-3">
                    <div className="h-2 w-16 bg-slate-600 rounded" />
                    <div className="h-2 w-24 bg-slate-600 rounded" />
                    <div className="h-2 w-20 bg-teal-500 rounded" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-20 bg-slate-600 rounded" />
                    <div className="h-2 w-16 bg-teal-500 rounded" />
                    <div className="h-2 w-24 bg-slate-600 rounded" />
                  </div>
                </div>

                <div className="absolute -bottom-6 bg-slate-950 text-teal-400 border border-teal-500/30 px-3 py-1 rounded font-mono text-[10px] md:text-xs font-bold tracking-widest shadow-lg whitespace-nowrap">
                  IFRS_LOCALIZATION_DATA
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
