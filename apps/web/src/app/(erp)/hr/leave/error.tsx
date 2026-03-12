"use client";

import { HrmSectionError } from "../shared/components/HrmSectionError";

export default function LeaveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <HrmSectionError error={error} reset={reset} homeHref="/hr" />;
}
