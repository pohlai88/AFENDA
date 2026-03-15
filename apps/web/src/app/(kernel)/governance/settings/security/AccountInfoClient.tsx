"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { CircleUserRound } from "lucide-react";

type AccountInfoClientProps = {
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  accountId: string | null;
  providers: string[];
};

/**
 * Account snapshot panel backed by server-owned account lifecycle action.
 */
export function AccountInfoClient(props: AccountInfoClientProps) {
  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Account info</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Current account identity, verification status, and linked provider summary.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CircleUserRound className="h-4 w-4" />
            Account snapshot
          </CardTitle>
          <CardDescription className="text-xs">Server-owned account metadata for this session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Email:</span>{" "}
            {props.email ?? "Unavailable"}
          </p>
          <p>
            <span className="font-medium">Email verified:</span>{" "}
            {props.emailVerified ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-medium">Display name:</span>{" "}
            {props.name ?? "Not set"}
          </p>
          <p>
            <span className="font-medium">Avatar URL:</span>{" "}
            {props.image ?? "Not set"}
          </p>
          <p>
            <span className="font-medium">Account ID:</span>{" "}
            {props.accountId ?? "Unavailable"}
          </p>
          <p>
            <span className="font-medium">Linked providers:</span>{" "}
            {props.providers.length > 0 ? props.providers.join(", ") : "None"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
