import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with intelligent conflict resolution.
 *
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 * Use this for all dynamic className composition in components.
 *
 * @example
 *   cn("px-4 py-2", isActive && "bg-primary text-primary-foreground")
 *   cn(buttonVariants({ variant }), className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
