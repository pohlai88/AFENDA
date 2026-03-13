/**
 * Shared Clock abstraction
 *
 * - Use Clock.now() wrappers instead of direct Date construction in contracts helpers.
 * - SystemClock delegates to real system time.
 * - FixedClock returns a stable instant for deterministic tests.
 * - withClock() allows temporary synchronous binding for short test blocks.
 */

export interface Clock {
  /** Return a Date representing the current instant in UTC. */
  now(): Date;

  /** Return an ISO 8601 string in UTC (Z suffix). */
  nowIso(): string;

  /** Return epoch milliseconds for the current instant. */
  nowMs(): number;
}

/* ----------------------------- System Clock -------------------------------- */

export const SystemClock: Clock = {
  now(): Date {
    return new Date();
  },
  nowIso(): string {
    return new Date().toISOString();
  },
  nowMs(): number {
    return Date.now();
  },
};

/* ------------------------------ Fixed Clock -------------------------------- */

/**
 * FixedClock returns a deterministic instant.
 * - Useful for unit tests, snapshots, and migration simulations.
 * - Accepts an ISO string, epoch milliseconds, or Date.
 */
export class FixedClock implements Clock {
  private readonly instant: Date;

  constructor(isoOrMs: string | number | Date) {
    if (isoOrMs instanceof Date) {
      this.instant = new Date(isoOrMs.toISOString());
    } else if (typeof isoOrMs === "number") {
      this.instant = new Date(isoOrMs);
    } else {
      this.instant = new Date(isoOrMs);
    }

    if (Number.isNaN(this.instant.getTime())) {
      throw new Error("FixedClock: invalid date input");
    }
  }

  now(): Date {
    // Return a fresh instance to prevent external mutation leaks.
    return new Date(this.instant.toISOString());
  }

  nowIso(): string {
    return this.instant.toISOString();
  }

  nowMs(): number {
    return this.instant.getTime();
  }
}

/* --------------------------- Module-level binding --------------------------- */

/**
 * Module-level clock binding.
 *
 * Keep usage synchronous (withClock) to avoid async state leaks.
 * For async flows, pass Clock explicitly through function parameters.
 */
let moduleClock: Clock = SystemClock;

/** Get the currently bound clock (module-level). */
export function getClock(): Clock {
  return moduleClock;
}

/** Replace the module-level clock and return previous clock. */
export function setClock(clock: Clock): Clock {
  const previous = moduleClock;
  moduleClock = clock;
  return previous;
}

/**
 * Execute a synchronous callback with a temporary clock binding.
 * Restores previous binding even if the callback throws.
 */
export function withClock<T>(clock: Clock, fn: () => T): T {
  const previous = setClock(clock);
  try {
    return fn();
  } finally {
    setClock(previous);
  }
}

/* --------------------------- Convenience helpers ---------------------------- */

/** Return current instant as Date using the module clock. */
export function now(): Date {
  return getClock().now();
}

/** Return current instant as ISO string using the module clock. */
export function nowUtc(): string {
  return getClock().nowIso();
}

/** Return epoch milliseconds using the module clock. */
export function nowMs(): number {
  return getClock().nowMs();
}

/** Create a FixedClock and execute a synchronous callback bound to it. */
export function withFixedClock<T>(isoOrMs: string | number | Date, fn: () => T): T {
  return withClock(new FixedClock(isoOrMs), fn);
}

export const SharedClock = {
  SystemClock,
  FixedClock,
  getClock,
  setClock,
  withClock,
  now,
  nowUtc,
  nowMs,
  withFixedClock,
};

export default SharedClock;
