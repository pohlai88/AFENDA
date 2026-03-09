/**
 * View Transitions API (draft)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API
 */
interface ViewTransition {
  readonly ready: Promise<void>;
  readonly finished: Promise<void>;
  readonly updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

declare global {
  interface Document {
    startViewTransition?(callback: () => void | Promise<void>): ViewTransition;
  }
}

export {};
