"use client";

import { useEffect } from "react";

/**
 * Triggers window.print() when mounted.
 * Used by print-optimized routes to open print dialog automatically.
 */
export function PrintOnMount() {
  useEffect(() => {
    window.print();
  }, []);
  return null;
}
