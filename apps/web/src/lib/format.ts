/**
 * Format utilities for displaying currency, dates, and numbers.
 */

import { formatMoney } from "@afenda/ui";
import type { Money } from "@afenda/contracts";

/**
 * Format a bigint amount (in minor units) as currency.
 * @param amountMinor - Amount in minor units (cents)
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amountMinor: bigint, currencyCode: string): string {
  return formatMoney({ amountMinor, currencyCode });
}

/**
 * Format a date string or Date object.
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Format a datetime string or Date object.
 * @param datetime - Datetime to format
 * @returns Formatted datetime string
 */
export function formatDateTime(datetime: string | Date): string {
  const d = typeof datetime === "string" ? new Date(datetime) : datetime;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format a number with thousand separators.
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}
