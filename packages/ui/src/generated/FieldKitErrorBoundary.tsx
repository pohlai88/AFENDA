/**
 * FieldKitErrorBoundary — catches rendering errors in FieldKit components.
 *
 * Wraps CellRenderer / FormWidget invocations. If a kit throws, renders
 * a safe fallback (raw text for cells, disabled input for forms) and logs
 * structured context for production debugging.
 *
 * RULES:
 *   1. Never swallows errors silently — always logs with structured context.
 *   2. Fallback renders a neutral representation of the value.
 *   3. Uses DS tokens only.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FieldKitErrorBoundaryProps {
  /** Context for structured error logging */
  entityKey: string;
  fieldKey: string;
  fieldType: string;
  /** "cell" → raw text fallback; "form" → disabled input fallback */
  mode: "cell" | "form";
  /** Raw value for fallback rendering */
  value?: unknown;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// ── Component ─────────────────────────────────────────────────────────────────

export class FieldKitErrorBoundary extends Component<FieldKitErrorBoundaryProps, State> {
  constructor(props: FieldKitErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Structured log — consumable by Datadog / ELK in production
    const ctx = {
      component: "FieldKitErrorBoundary",
      entityKey: this.props.entityKey,
      fieldKey: this.props.fieldKey,
      fieldType: this.props.fieldType,
      mode: this.props.mode,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: info.componentStack,
    };

    // eslint-disable-next-line no-console
    console.error("[field-kit] Render error:", ctx);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const displayValue =
      this.props.value === null || this.props.value === undefined
        ? "—"
        : String(this.props.value);

    if (this.props.mode === "cell") {
      return (
        <span className="text-destructive/60 text-xs italic" title={this.state.error?.message}>
          {displayValue}
        </span>
      );
    }

    // Form mode — render a disabled input with the raw value
    return (
      <div className="space-y-1">
        <span className="text-xs text-destructive">
          Render error: {this.state.error?.message}
        </span>
        <input
          type="text"
          value={displayValue}
          disabled
          className="w-full rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground"
        />
      </div>
    );
  }
}
