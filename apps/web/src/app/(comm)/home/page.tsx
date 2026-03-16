/**
 * COMM hub — dashboard landing page.
 *
 * Shows:
 * - Quick stats (my tasks, pending approvals, unread inbox)
 * - Recent activity feed
 * - Quick actions (new task, new project, new approval)
 */

import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communication Hub",
};

async function QuickStats() {
  // TODO: fetch stats from /v1/* API endpoints
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium text-muted-foreground">My Tasks</div>
        <div className="text-3xl font-bold">0</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium text-muted-foreground">Pending Approvals</div>
        <div className="text-3xl font-bold">0</div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium text-muted-foreground">Unread Messages</div>
        <div className="text-3xl font-bold">0</div>
      </div>
    </div>
  );
}

export default function CommHomePage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Communication Hub</h1>
        <p className="mt-2 text-muted-foreground">
          Manage tasks, projects, approvals, and team collaboration
        </p>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <QuickStats />
      </Suspense>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/tasks/new"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            New Task
          </a>
          <a
            href="/projects/new"
            className="inline-block rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            New Project
          </a>
          <a
            href="/approvals"
            className="inline-block rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            View Approvals
          </a>
          <a
            href="/workflows"
            className="inline-block rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Manage Workflows
          </a>
        </div>
      </div>
    </div>
  );
}
