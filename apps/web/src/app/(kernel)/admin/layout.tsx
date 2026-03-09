import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — AFENDA",
  description: "Internal admin and observability tools",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
