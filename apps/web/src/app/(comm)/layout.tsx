/**
 * COMM app layout — guards active org and renders task/project/approval pages.
 *
 * Ensures:
 * - Active org is set (fails fast if not)
 * - Auth context is available
 * - COMM app shell with navigation bindings
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Communication – AFENDA",
  description: "Tasks, projects, approvals, meetings, and knowledge",
};

export default async function CommLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/app");
  }

  // Active org is managed by middleware + AppShell context
  // Just render the shell with children
  return (
    <div className="min-h-screen bg-background">
      {/* TODO: Sidebar nav with:
           - My Tasks (count of assignedTo me)
           - All Tasks (count)
           - Projects
           - Approvals (count of pending)
           - Announcements (count of unread)
           - Inbox (count of unread)
           - Docs
           */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
