"use client";

import { HrmSectionError } from "../shared/components/HrmSectionError";

export default function LearningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <HrmSectionError error={error} reset={reset} homeHref="/hr" />;
}
