"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Spinner,
  toast,
} from "@afenda/ui";
import { Github, Link2, Unlink, UserRound } from "lucide-react";

import { GoogleIcon } from "@/components/GoogleIcon";
import { linkSocial, listAccounts, unlinkAccount } from "@/lib/auth/client";

type SocialProvider = "google" | "github";

type LinkedAccount = {
  id: string;
  providerId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  accountId: string;
  userId: string;
  scopes: string[];
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function formatDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toSupportedProvider(value: string): SocialProvider | null {
  if (value === "google" || value === "github") {
    return value;
  }

  return null;
}

export function SocialAccountsClient() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isMutating, startMutating] = useTransition();

  async function loadAccounts(options?: { preserveFeedback?: boolean }) {
    if (!options?.preserveFeedback) {
      setFeedback(null);
    }

    setError(null);
    const response = await listAccounts();

    if (response.error) {
      setAccounts([]);
      setError(getErrorMessage(response.error, "Unable to load linked accounts."));
      return;
    }

    setAccounts((response.data ?? []) as LinkedAccount[]);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await listAccounts();
        if (cancelled) {
          return;
        }

        if (response.error) {
          setAccounts([]);
          setError(getErrorMessage(response.error, "Unable to load linked accounts."));
          return;
        }

        setAccounts((response.data ?? []) as LinkedAccount[]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const linkedProviders = useMemo(() => {
    return new Set(accounts.map((account) => account.providerId));
  }, [accounts]);

  function handleLink(provider: SocialProvider) {
    setPendingAction(`link:${provider}`);
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const callbackURL = `${window.location.origin}/governance/settings/security`;
      const response = await linkSocial({
        provider,
        callbackURL,
        disableRedirect: true,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, `Unable to link ${provider}.`));
        setPendingAction(null);
        return;
      }

      const url = response.data?.url;
      if (!url) {
        setError(`Unable to continue linking ${provider}.`);
        setPendingAction(null);
        return;
      }

      window.location.assign(url);
    });
  }

  function handleUnlink(providerId: string, accountId?: string) {
    setPendingAction(`unlink:${providerId}:${accountId ?? "none"}`);
    setError(null);
    setFeedback(null);

    startMutating(async () => {
      const response = await unlinkAccount({
        providerId,
        accountId,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to unlink account."));
        setPendingAction(null);
        return;
      }

      setFeedback("Linked account removed.");
      toast.success("Account unlinked.");
      await loadAccounts({ preserveFeedback: true });
      setPendingAction(null);
    });
  }

  const providerRows: Array<{ provider: SocialProvider; label: string; icon: typeof Github | typeof GoogleIcon }> = [
    { provider: "google", label: "Google", icon: GoogleIcon },
    { provider: "github", label: "GitHub", icon: Github },
  ];

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">Linked social accounts</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Link Google or GitHub to sign in faster and manage external identity providers.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            Social providers
          </CardTitle>
          <CardDescription className="text-xs">
            Linking an account enables OAuth sign in. You can unlink providers at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedback ? (
            <Alert>
              <Link2 className="size-4" />
              <AlertTitle>Account updated</AlertTitle>
              <AlertDescription>{feedback}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <Unlink className="size-4" />
              <AlertTitle>Unable to update linked accounts</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-2">
              {providerRows.map(({ provider, label, icon: Icon }) => {
                const isLinked = linkedProviders.has(provider);
                const pendingKey = `link:${provider}`;

                return (
                  <div key={provider} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <Badge variant={isLinked ? "secondary" : "outline"}>
                        {isLinked ? "Linked" : "Not linked"}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleLink(provider)}
                      disabled={isLinked || isMutating}
                    >
                      {pendingAction === pendingKey ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="size-4" />
                          Linking...
                        </span>
                      ) : (
                        "Link"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {isLoading ? null : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No social accounts are linked yet.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => {
                const provider = toSupportedProvider(account.providerId);
                const pendingKey = `unlink:${account.providerId}:${account.accountId}`;
                const ProviderIcon = provider === "github" ? Github : provider === "google" ? GoogleIcon : UserRound;

                return (
                  <div key={`${account.providerId}:${account.accountId}`} className="rounded-xl border border-border/70 bg-background/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ProviderIcon className="size-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">
                            {provider === "github" ? "GitHub" : provider === "google" ? "Google" : account.providerId}
                          </p>
                          <Badge variant="secondary">Linked</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Account ID: {account.accountId}</p>
                        <p className="text-xs text-muted-foreground">Linked at: {formatDateTime(account.createdAt)}</p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnlink(account.providerId, account.accountId)}
                        disabled={isMutating}
                      >
                        {pendingAction === pendingKey ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-4" />
                            Unlinking...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Unlink className="size-4" />
                            Unlink
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
