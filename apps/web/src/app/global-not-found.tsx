import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={geist.className}>
      <body className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <main className="w-full max-w-xl rounded-xl border border-border bg-card p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AFENDA</p>
          <h1 className="mt-3 text-3xl font-semibold">404 - Route not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This URL does not map to any route in the current application.
          </p>
          <div className="mt-6 flex gap-4 text-sm">
            <Link className="underline underline-offset-4" href="/">
              Go to dashboard
            </Link>
            <Link className="underline underline-offset-4" href="/governance/settings">
              Open settings
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
