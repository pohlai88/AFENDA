"use client";

import { useEffect } from "react";

export interface AuthRenderMetricDetail {
  component: string;
  count: number;
  path: string;
  renderedAt: number;
  meta?: Record<string, unknown>;
}

declare global {
  interface Window {
    __AFENDA_AUTH_RENDER_METRICS__?: Record<string, AuthRenderMetricDetail>;
  }
}

function toSafeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const entries = Object.entries(meta).slice(0, 16);
  return Object.fromEntries(entries);
}

export function recordAuthRender(
  component: string,
  meta?: Record<string, unknown>,
): AuthRenderMetricDetail | null {
  if (typeof window === "undefined") return null;

  const store = (window.__AFENDA_AUTH_RENDER_METRICS__ ??= {});
  const previousCount = store[component]?.count ?? 0;
  const detail: AuthRenderMetricDetail = {
    component,
    count: previousCount + 1,
    path: window.location.pathname,
    renderedAt: Date.now(),
    meta: toSafeMeta(meta),
  };

  store[component] = detail;

  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    performance.mark(`afenda:auth:render:${component}:${detail.count}`);
  }

  window.dispatchEvent(new CustomEvent<AuthRenderMetricDetail>("afenda:auth:render", { detail }));
  return detail;
}

export function useAuthRenderMetric(component: string, meta?: Record<string, unknown>): void {
  useEffect(() => {
    recordAuthRender(component, meta);
  });
}
