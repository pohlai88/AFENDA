import { memo } from "react";
import { CardHeader, CardTitle, CardDescription } from "@afenda/ui";

interface AuthHeaderProps {
  title?: string;
  description?: string;
  /** @deprecated The split-panel shell now handles branding. This prop is ignored. */
  showBranding?: boolean;
}

export const AuthHeader = memo(function AuthHeader({ title, description }: AuthHeaderProps) {
  if (!title && !description) return null;

  return (
    <CardHeader className="pb-4">
      <div className="space-y-1">
        {title && <CardTitle className="text-2xl font-bold">{title}</CardTitle>}
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </div>
    </CardHeader>
  );
});
