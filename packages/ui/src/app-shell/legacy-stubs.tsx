/**
 * Temporary stubs for old shell components until they are rebuilt.
 * These allow the app to compile while we develop the new app-shell.
 */

import type { ReactNode } from "react";

type WorkspaceTab = {
  key: string;
  label: string;
  content: ReactNode;
};

type AnalyticsWorkspaceCompatProps = {
  children?: ReactNode;
  tabs?: WorkspaceTab[];
};

type SplitWorkspaceCompatProps = {
  children?: ReactNode;
  listLabel?: string;
  detailLabel?: string;
  defaultListSize?: number;
  listSlot?: ReactNode;
  detailSlot?: ReactNode;
  hasDetail?: boolean;
};

type OperationalListWorkspaceCompatProps = {
  children?: ReactNode;
  entityKey?: string;
  capabilities?: Record<string, unknown>;
  selection?: Array<Record<string, unknown>>;
  onExport?: (format: "csv" | "xlsx" | "pdf") => void | Promise<void>;
  onPrint?: () => void;
  onBulkAction?: (actionKey: string, records: Record<string, unknown>[]) => void | Promise<void>;
  toolbarContent?: ReactNode;
};

type ColumnOption = {
  fieldKey: string;
  label: string;
};

type ColumnManagerCompatProps = {
  entityKey?: string;
  columns?: ColumnOption[];
  visibleColumnKeys?: string[];
  onVisibleColumnKeysChange?: (keys: string[]) => void;
  persistKey?: string;
};

type QuickFilter = {
  key: string;
  label: string;
  filters?: Array<{ fieldKey: string; op: string; value: string }>;
};

type QuickFiltersCompatProps = {
  filters?: QuickFilter[];
  activeKey?: string | null;
  onSelect?: (key: string | null) => void;
};

type SectionCard = {
  title: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  description?: string;
  footer?: string;
};

type SectionCardsCompatProps = {
  cards?: SectionCard[];
};

type ChartAreaInteractiveCompatProps = {
  title?: string;
  description?: string;
  data?: Array<Record<string, unknown>>;
  dataKeys?: string[];
  chartConfig?: Record<string, unknown>;
  defaultRange?: string;
};

type ShellStoreState = {
  selectedRecordIds: string[];
  setSelectedRecordIds: (ids: string[]) => void;
};

type ShellBreadcrumbApi = {
  setBreadcrumb: (label: string) => void;
  setBreadcrumbs: (items: Array<{ label: string; href?: string }>) => void;
};

const SHELL_STORE_STATE: ShellStoreState = {
  selectedRecordIds: [],
  setSelectedRecordIds: () => {},
};

export function AnalyticsWorkspace({ children, tabs }: AnalyticsWorkspaceCompatProps) {
  const firstTabContent = tabs?.[0]?.content;

  return (
    <div className="p-6">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">AnalyticsWorkspace — under reconstruction</p>
        {firstTabContent}
        {children}
      </div>
    </div>
  );
}

export function RecordWorkspace({ children }: { children?: ReactNode }) {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">RecordWorkspace — under reconstruction</p>
        {children}
      </div>
    </div>
  );
}

export function OperationalListWorkspace({ children, toolbarContent }: OperationalListWorkspaceCompatProps) {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">OperationalListWorkspace — under reconstruction</p>
        {toolbarContent}
        {children}
      </div>
    </div>
  );
}

export function SplitWorkspace({ children, listSlot, detailSlot }: SplitWorkspaceCompatProps) {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">SplitWorkspace — under reconstruction</p>
        {listSlot}
        {detailSlot}
        {children}
      </div>
    </div>
  );
}

export function ColumnManager(_props: ColumnManagerCompatProps) {
  return null;
}

export function QuickFilters(_props: QuickFiltersCompatProps) {
  return null;
}

export function SectionCards({ cards }: SectionCardsCompatProps) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-md border p-3 text-left">
          <p className="text-xs text-muted-foreground">{card.title}</p>
          <p className="mt-1 text-base font-semibold">{card.value}</p>
          {card.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ChartAreaInteractive({ title, description }: ChartAreaInteractiveCompatProps) {
  return (
    <div className="rounded-md border p-3 text-left">
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">ChartAreaInteractive — under reconstruction</p>
    </div>
  );
}

export function useShellStore(): ShellStoreState;
export function useShellStore<T>(selector: (state: ShellStoreState) => T): T;
export function useShellStore<T>(selector?: (state: ShellStoreState) => T): T | ShellStoreState {
  return selector ? selector(SHELL_STORE_STATE) : SHELL_STORE_STATE;
}

export function useShellBreadcrumb() {
  const api: ShellBreadcrumbApi = {
    setBreadcrumb: () => {},
    setBreadcrumbs: () => {},
  };

  return api;
}

export function useSidecarContent() {
  return { setSidecarContent: () => {}, clearSidecarContent: () => {} };
}
