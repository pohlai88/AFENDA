import type { ReactNode } from "react";

import { authShellInfoTileStyle } from "@/app/auth/_components/surface-styles";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--surface-0)",
        backgroundImage:
          "radial-gradient(circle at top left, color-mix(in oklab, var(--primary), transparent 86%) 0%, transparent 35%), linear-gradient(180deg, var(--surface-0) 0%, var(--surface-100) 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
        <section className="max-w-xl space-y-6">
          <p className="text-sm font-medium tracking-[0.28em] text-primary uppercase">Neon Auth</p>
          <div className="space-y-4">
            <h1 className="font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
              Secure access for audit-first operations.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Sessions, protected routes, and server rendering now flow through Neon Auth so AFENDA
              can keep access control inside the same operational surface as the rest of the app.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="rounded-2xl border p-4" style={authShellInfoTileStyle}>
              Signed cookies cache session state for fast server reads.
            </div>
            <div className="rounded-2xl border p-4" style={authShellInfoTileStyle}>
              Protected route groups now redirect through a dedicated auth entry point.
            </div>
          </div>
        </section>

        <section className="w-full max-w-md">{children}</section>
      </div>
    </div>
  );
}
