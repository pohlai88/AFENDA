"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import {
  fetchAnnouncement,
  fetchAnnouncementAckSummary,
  fetchAnnouncementMyRead,
  acknowledgeAnnouncement,
  type AnnouncementAckSummary,
  type AnnouncementRow,
} from "@/lib/api-client";
import { useEffect } from "react";

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementRow | null>(null);
  const [ackSummary, setAckSummary] = useState<AnnouncementAckSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then((p) => {
      setAnnouncementId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!announcementId) return;
    const id = announcementId;

    async function load() {
      try {
        const [announcementResponse, ackSummaryResponse, myReadResponse] = await Promise.all([
          fetchAnnouncement(id),
          fetchAnnouncementAckSummary(id),
          fetchAnnouncementMyRead(id),
        ]);
        setAnnouncement(announcementResponse.data);
        setAckSummary(ackSummaryResponse.data);
        setHasAcknowledged(myReadResponse.data.acknowledged);
        setAckError(null);
      } catch {
        setAnnouncement(null);
        setAckSummary(null);
        setHasAcknowledged(false);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [announcementId]);

  const handleAcknowledge = async () => {
    if (!announcementId || hasAcknowledged) return;
    const id = announcementId;
    setAckError(null);
    setHasAcknowledged(true);
    setIsAcknowledging(true);
    try {
      await acknowledgeAnnouncement({ announcementId: id });
      const [announcementResponse, ackSummaryResponse] = await Promise.all([
        fetchAnnouncement(id),
        fetchAnnouncementAckSummary(id),
      ]);
      setAnnouncement(announcementResponse.data);
      setAckSummary(ackSummaryResponse.data);
    } catch {
      setHasAcknowledged(false);
      setAckError("Acknowledgement failed. Please retry.");
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted p-6" />;
  }

  if (!announcement) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Announcement not found</h1>
        <Button onClick={() => router.push("/comm/announcements")}>Back to announcements</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{announcement.title}</h1>
        <span className="rounded bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground">
          {announcement.status}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acknowledgements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>Targeted: {ackSummary?.targetedCount ?? 0}</span>
              <span>Acknowledged: {ackSummary?.acknowledgedCount ?? 0}</span>
              <span>Pending: {ackSummary?.pendingCount ?? 0}</span>
              <span>Progress: {ackSummary?.progressPercent ?? 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${ackSummary?.progressPercent ?? 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{announcement.announcementNumber}</span>
              <span>{new Date(announcement.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-base whitespace-pre-wrap text-foreground">{announcement.body}</p>
          </div>

          {announcement.status === "published" && (
            <div className="mt-6 border-t pt-6">
              <div className="space-y-3">
                <Button
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging || hasAcknowledged}
                  variant={hasAcknowledged ? "secondary" : "default"}
                >
                  {isAcknowledging
                    ? "Acknowledging..."
                    : hasAcknowledged
                      ? "Acknowledged"
                      : "Acknowledge"}
                </Button>
                {hasAcknowledged ? (
                  <p className="text-sm text-muted-foreground">Your acknowledgement is recorded.</p>
                ) : null}
                {ackError ? <p className="text-sm text-destructive">{ackError}</p> : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => router.push("/comm/announcements")}>
        Back to announcements
      </Button>
    </div>
  );
}
