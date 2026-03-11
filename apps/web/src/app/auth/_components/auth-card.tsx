import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <Card className="w-full rounded-2xl border border-border-interactive bg-surface-225 dark:bg-surface-225 shadow-md">
      <CardHeader className="space-y-2 px-6 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </CardTitle>

        {description ? (
          <CardDescription className="max-w-[36ch] text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
        {children}
      </CardContent>
    </Card>
  );
}