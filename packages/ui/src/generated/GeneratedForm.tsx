"use client";

/**
 * GeneratedForm — metadata-driven form component.
 *
 * Reads the entity's FormViewDef from the registry, resolves each field
 * to its FieldKit.FormWidget, and renders a tabbed form layout.
 *
 * RULES:
 *   1. Never makes permission decisions — capabilities come as props.
 *   2. Fields with `fieldCaps[key] === "hidden"` are omitted entirely.
 *   3. Fields with `fieldCaps[key] === "ro"` render as styled text (not disabled inputs).
 *   4. Validation uses the passed-in command schema — FieldDefs drive layout only.
 *   5. Uses DS tokens only — no hardcoded palette colors.
 */
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { CapabilityResult, FieldCap } from "@afenda/contracts";
import { getEntityRegistration } from "../meta/registry";
import { getFieldKit } from "../field-kit/registry";
import type { FormWidgetProps } from "../field-kit/types";
import { FieldKitErrorBoundary } from "./FieldKitErrorBoundary";
import { Button } from "../components/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/card";
import { Label } from "../components/label";
import { Progress } from "../components/progress";
import { Alert, AlertTitle, AlertDescription } from "../components/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedFormProps {
  /** Entity key from the registry */
  entityKey: string;
  /** View key — defaults to "detail" */
  viewKey?: string;
  /** Resolved capabilities for the current principal + entity */
  capabilities: CapabilityResult;
  /** Zod schema for client-side validation (from @afenda/contracts) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commandSchema?: z.ZodType<any>;
  /** Existing record values (null/undefined = create mode) */
  record?: Record<string, unknown> | null;
  /** Called when the form is submitted with validated values */
  onSubmit?: (values: Record<string, unknown>) => void;
  /** Called when the user cancels */
  onCancel?: () => void;
  /** External validation errors keyed by field name */
  errors?: Record<string, string>;
  /** Whether the form is currently submitting */
  submitting?: boolean;
  /** Custom side panel content renderers keyed by panelKey */
  sidePanelContent?: Record<string, ComponentType<SidePanelContentProps>>;
}

/** Props passed to custom side panel content renderers */
export interface SidePanelContentProps {
  entityKey: string;
  record: Record<string, unknown> | null | undefined;
  panelKey: string;
  panelType: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveFieldCap(capabilities: CapabilityResult, fieldKey: string): FieldCap {
  return capabilities.fieldCaps[fieldKey] ?? "hidden";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneratedForm({
  entityKey,
  viewKey = "detail",
  capabilities,
  commandSchema,
  record,
  onSubmit,
  onCancel,
  errors,
  submitting = false,
  sidePanelContent,
}: GeneratedFormProps) {
  // ── Render performance instrumentation ───────────────────────────
  const renderStart = useRef(performance.now());
  renderStart.current = performance.now();

  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    performance.mark(`GeneratedForm:${entityKey}:rendered`);
    performance.measure(
      `GeneratedForm:${entityKey}:render`,
      { start: renderStart.current, duration },
    );
  });

  // ── Resolve metadata ─────────────────────────────────────────────
  const registration = useMemo(
    () => getEntityRegistration(entityKey),
    [entityKey],
  );

  const view = useMemo(() => {
    const v = registration.views[viewKey];
    if (!v || v.viewType !== "form") {
      throw new Error(
        `[GeneratedForm] View "${viewKey}" on entity "${entityKey}" is not a form view`,
      );
    }
    return v;
  }, [registration, viewKey, entityKey]);

  const fieldDefMap = useMemo(() => {
    const map = new Map<string, (typeof registration.fieldDefs)[number]>();
    for (const fd of registration.fieldDefs) {
      map.set(fd.fieldKey, fd);
    }
    return map;
  }, [registration]);

  // ── react-hook-form ──────────────────────────────────────────────
  const defaultValues = useMemo(() => {
    const initial: Record<string, unknown> = {};
    for (const fd of registration.fieldDefs) {
      initial[fd.fieldKey] = record?.[fd.fieldKey] ?? null;
    }
    return initial;
  }, [registration, record]);

  const form = useForm<Record<string, unknown>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: commandSchema ? zodResolver(commandSchema as any) : undefined,
    defaultValues,
  });

  // Merge server-side errors into form state
  useMemo(() => {
    if (errors) {
      for (const [key, message] of Object.entries(errors)) {
        form.setError(key, { type: "server", message });
      }
    }
  }, [errors, form]);

  const handleFormSubmit = form.handleSubmit((values) => {
    onSubmit?.(values);
  });

  const isCreateMode = !record;

  // ── Side panels ──────────────────────────────────────────────────
  const sidePanels = useMemo(() => {
    if (view.viewType !== "form") return [];
    const panels = (view as { sidePanels?: readonly { panelKey: string; label: string; panelType: string }[] }).sidePanels ?? [];
    return panels;
  }, [view]);

  const [activePanel, setActivePanel] = useState<string | null>(null);

  // ── Render field ─────────────────────────────────────────────────
  const renderField = useCallback(
    (fieldKey: string, colSpan: number) => {
      const cap = resolveFieldCap(capabilities, fieldKey);
      if (cap === "hidden") return null;

      const fieldDef = fieldDefMap.get(fieldKey);
      if (!fieldDef) return null;

      const fieldType = fieldDef.fieldType;
      const kit = getFieldKit(fieldType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Widget: ComponentType<FormWidgetProps<any>> = kit.FormWidget;
      const value = form.watch(fieldKey);
      const fieldError = form.formState.errors[fieldKey]?.message as string | undefined;
      const isReadOnly = cap === "ro" || fieldDef.readonly === true;

      return (
        <div
          key={fieldKey}
          className="space-y-1"
          style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
        >
          {isReadOnly ? (
            <div>
              <Label className="text-xs font-medium text-muted-foreground">
                {fieldDef.label}
              </Label>
              <div className="mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                {renderReadOnlyValue(fieldType, value)}
              </div>
            </div>
          ) : (
            <FieldKitErrorBoundary
              entityKey={entityKey}
              fieldKey={fieldKey}
              fieldType={fieldType}
              mode="form"
              value={value}
            >
              <Widget
                value={value}
                onChange={(v) => form.setValue(fieldKey, v, { shouldValidate: true })}
                fieldKey={fieldKey}
                label={fieldDef.label}
                required={fieldDef.required ?? false}
                readonly={false}
                error={fieldError}
                description={fieldDef.description}
                validation={fieldDef.validationJson as Record<string, unknown> | undefined}
              />
            </FieldKitErrorBoundary>
          )}
        </div>
      );
    },
    [capabilities, fieldDefMap, form, entityKey],
  );

  // ── Tab content renderer ─────────────────────────────────────────
  const renderTabContent = useCallback(
    (tab: { tabKey: string; sections: readonly { sectionKey: string; label: string; description?: string; columns?: number; fields: readonly { fieldKey: string; colSpan?: number }[] }[] }) => (
      <div className="space-y-6">
        {tab.sections.map((section) => {
          const gridCols = section.columns ?? 2;
          const visibleFields = section.fields.filter(
            (f) => resolveFieldCap(capabilities, f.fieldKey) !== "hidden",
          );
          if (visibleFields.length === 0) return null;

          return (
            <Card key={section.sectionKey}>
              <CardHeader>
                <CardTitle className="text-sm">{section.label}</CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  }}
                >
                  {section.fields.map((fieldRef) =>
                    renderField(fieldRef.fieldKey, fieldRef.colSpan ?? 1),
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    ),
    [capabilities, renderField],
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Tabs */}
      {view.tabs.length > 1 ? (
        <Tabs defaultValue={view.tabs[0]?.tabKey}>
          <TabsList>
            {view.tabs.map((tab) => (
              <TabsTrigger key={tab.tabKey} value={tab.tabKey}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {view.tabs.map((tab) => (
            <TabsContent key={tab.tabKey} value={tab.tabKey}>
              {renderTabContent(tab)}
            </TabsContent>
          ))}
        </Tabs>
      ) : view.tabs[0] ? (
        renderTabContent(view.tabs[0])
      ) : null}

      {/* Form actions */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {/* Side panel triggers */}
        {sidePanels.length > 0 && (
          <div className="flex items-center gap-2">
            {sidePanels.map((panel) => (
              <Button
                key={panel.panelKey}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setActivePanel(
                    activePanel === panel.panelKey ? null : panel.panelKey,
                  )
                }
                className={
                  activePanel === panel.panelKey
                    ? "border-primary text-primary"
                    : undefined
                }
              >
                {panel.panelType === "evidence" && "📎 "}
                {panel.panelType === "audit" && "📋 "}
                {panel.panelType === "timeline" && "🕐 "}
                {panel.label}
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isCreateMode ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </form>

    {/* Side panel via Sheet */}
    {sidePanels.map((panel) => (
      <Sheet
        key={panel.panelKey}
        open={activePanel === panel.panelKey}
        onOpenChange={(open) => {
          if (!open) setActivePanel(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{panel.label}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              const CustomContent = sidePanelContent?.[panel.panelKey];
              if (CustomContent) {
                return (
                  <CustomContent
                    entityKey={entityKey}
                    record={record ?? null}
                    panelKey={panel.panelKey}
                    panelType={panel.panelType}
                  />
                );
              }

              return (
                <div className="space-y-4 text-sm text-muted-foreground">
                  {panel.panelType === "evidence" && (
                    <p>
                      No evidence attachments yet. Upload supporting documents
                      using the file upload controls.
                    </p>
                  )}
                  {panel.panelType === "audit" && (
                    <p>
                      Audit trail for this record will appear here once the
                      record is saved.
                    </p>
                  )}
                  {panel.panelType === "timeline" && (
                    <p>
                      Timeline of status changes and key events will appear here.
                    </p>
                  )}
                  {panel.panelType === "custom" && (
                    <p>
                      Custom panel content not configured. Pass a renderer via
                      the <code>sidePanelContent</code> prop.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </SheetContent>
      </Sheet>
    ))}
    </>
  );
}

// ── Read-only value renderer ─────────────────────────────────────────────────

function renderReadOnlyValue(fieldType: string, value: unknown): string {
  if (value === null || value === undefined) return "—";

  switch (fieldType) {
    case "bool":
      return value ? "Yes" : "No";
    case "json":
      return JSON.stringify(value, null, 2);
    case "money":
      return String(value);
    default:
      return String(value);
  }
}
