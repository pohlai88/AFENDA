"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@afenda/ui";
import { cn } from "@afenda/ui";

interface AuthSubmitButtonProps {
  children: ReactNode;
  loadingText?: string;
  className?: string;
}

export function AuthSubmitButton({
  children,
  loadingText = "Please wait…",
  className,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={cn("w-full", className)}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}