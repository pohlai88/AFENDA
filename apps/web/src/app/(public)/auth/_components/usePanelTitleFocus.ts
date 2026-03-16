"use client";

import { useEffect, type RefObject } from "react";

export function usePanelTitleFocus<T extends HTMLElement>(titleRef: RefObject<T | null>) {
  useEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) {
      return;
    }

    titleElement.setAttribute("tabindex", "-1");
    titleElement.focus();
  }, [titleRef]);
}
