"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@afenda/ui";
import { castBoardVote, type BoardResolutionRow } from "@/lib/api-client";

function formatStatus(value: string): string {
  return value.replace(/_/g, " ");
}

const VOTING_OPEN = ["proposed", "discussed"];

interface ResolutionCardProps {
  resolution: BoardResolutionRow;
  meetingId: string;
}

export function ResolutionCard({ resolution }: ResolutionCardProps) {
  const router = useRouter();
  const [casting, setCasting] = useState(false);

  const votingOpen = VOTING_OPEN.includes(resolution.status);

  async function handleVote(vote: "for" | "against" | "abstain") {
    setCasting(true);
    try {
      await castBoardVote({ resolutionId: resolution.id, vote });
      router.refresh();
    } finally {
      setCasting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{resolution.title}</span>
        <Badge variant="secondary">{formatStatus(resolution.status)}</Badge>
      </div>
      {resolution.description ? (
        <p className="mt-1 text-muted-foreground">{resolution.description}</p>
      ) : null}
      {votingOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Vote:</span>
          <Button size="sm" variant="outline" disabled={casting} onClick={() => handleVote("for")}>
            For
          </Button>
          <Button size="sm" variant="outline" disabled={casting} onClick={() => handleVote("against")}>
            Against
          </Button>
          <Button size="sm" variant="outline" disabled={casting} onClick={() => handleVote("abstain")}>
            Abstain
          </Button>
        </div>
      )}
    </div>
  );
}
