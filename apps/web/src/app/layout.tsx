import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import { TooltipProvider, ToastNotification } from "@afenda/ui";
import Script from "next/script";
import { SessionProvider } from "@/components/SessionProvider";
import { ShellLayoutWrapper } from "@/components/ShellLayoutWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css"
import { cn } from "@/lib/utils";

/**
 * Font loading — matches design system --font-sans / --font-mono tokens.
 * next/font/google auto-generates @font-face with display:swap and
 * self-hosts the files (no external network requests).
 */
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"),
  title: {
    default: "AFENDA — Where numbers become canon",
    template: "%s | AFENDA",
  },
  description: "Forensic-grade ERP. Every transaction is permanently traceable, AI-ready, and audit-first.",
  applicationName: "AFENDA",
  keywords: ["finance", "audit", "governance", "erp", "accounts payable"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "AFENDA — Where numbers become canon",
    description: "Forensic-grade ERP. Every transaction is permanently traceable, AI-ready, and audit-first.",
    siteName: "AFENDA",
    images: ["/twitter-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AFENDA — Where numbers become canon",
    description: "Forensic-grade ERP. Every transaction is permanently traceable, AI-ready, and audit-first.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/apple-icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(jetbrainsMono.variable, "font-sans", geist.variable)}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <SessionProvider>
            <TooltipProvider>
              <ShellLayoutWrapper>{children}</ShellLayoutWrapper>
              <ToastNotification />
            </TooltipProvider>
          </SessionProvider>
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw').catch(function () {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
