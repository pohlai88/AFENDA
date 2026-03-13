import { Suspense } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { fetchAnnouncements } from "@/lib/api-client";

export const metadata = {
  title: "Announcements – AFENDA",
  description: "View and manage announcements",
};

async function AnnouncementsList() {
  const response = await fetchAnnouncements({ limit: 20 });
  const announcements = response.data;

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">No announcements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Link key={announcement.id} href={`/comm/announcements/${announcement.id}`}>
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{announcement.announcementNumber}</p>
                </div>
                <span className="rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                  {announcement.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">{announcement.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Created {new Date(announcement.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function AnnouncementsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <Link href="/comm/announcements/new">
          <Button>New Announcement</Button>
        </Link>
      </div>

      <Suspense fallback={<AnnouncementsListSkeleton />}>
        <AnnouncementsList />
      </Suspense>
    </div>
  );
}
