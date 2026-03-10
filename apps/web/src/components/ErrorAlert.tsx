import { memo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@afenda/ui";
import { AlertCircle, XCircle } from "lucide-react";

interface ErrorAlertProps {
  /** Error message to display */
  error: string | null | undefined;
  /** Optional title (defaults to "Error") */
  title?: string;
  /** Optional icon (defaults to AlertCircle) */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ErrorAlert — Consistent error display component
 * 
 * Memoized for performance. Use across auth, settings, and operational pages.
 * 
 * @example
 * <ErrorAlert error={error} />
 * <ErrorAlert error={error} title="Sign In Failed" />
 * <ErrorAlert error={error} icon={<XCircle />} />
 */
export const ErrorAlert = memo(function ErrorAlert({
  error,
  title = "Error",
  icon,
  className = "",
}: ErrorAlertProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className={className}>
      {icon !== undefined ? icon : <AlertCircle className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
});
