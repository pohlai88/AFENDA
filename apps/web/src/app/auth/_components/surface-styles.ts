import type { CSSProperties } from "react";

export const authCardSurfaceStyle: CSSProperties = {
  background: "var(--surface-300)",
  borderColor: "var(--border)",
  boxShadow: "var(--elev-2-shadow)",
};

export const authCardFooterStyle: CSSProperties = {
  borderTopColor: "var(--border-subtle)",
};

export const authShellInfoTileStyle: CSSProperties = {
  background: "var(--surface-200)",
  borderColor: "var(--border-subtle)",
};

export const authFeedbackInfoStyle: CSSProperties = {
  background: "var(--overlay-interactive)",
  borderColor: "var(--border-interactive)",
  color: "var(--foreground)",
};

export const authFeedbackSuccessStyle: CSSProperties = {
  background: "var(--success-soft)",
  borderColor: "var(--border-success)",
  color: "var(--success)",
};

export const authFeedbackErrorStyle: CSSProperties = {
  background: "var(--destructive-soft)",
  borderColor: "var(--border-danger)",
  color: "var(--destructive)",
};
