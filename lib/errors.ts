// One error vocabulary for the core path.
//
// Chain reads, API handlers and edge validation all fail into the same five
// codes, so a caller never has to parse a provider string to know what happened.
//
// The rule about `hint`: it is one sentence written by us, aimed at whoever is
// looking at the screen. A provider message is never passed through verbatim.
// Those strings carry RPC URLs, node vendor names and sometimes request bodies,
// none of which belong on a page or in a JSON response.

export type CoreErrorCode =
  | "invalid-input"
  | "upstream-timeout"
  | "upstream-error"
  | "parse-failure"
  | "not-configured";

export interface CoreFailure {
  error: CoreErrorCode;
  /** One human sentence. Never a provider message. */
  hint: string;
}

export function coreFailure(code: CoreErrorCode, hint: string): CoreFailure {
  return { error: code, hint };
}

/**
 * The `note` field on an ApiResponse, built from a failure. The console renders
 * this next to the seed badge, so it reads as a reason and not as a stack trace.
 */
export function failureNote(failure: CoreFailure): string {
  return `${failure.error}: ${failure.hint}`;
}

/**
 * Classify an unknown throw without repeating any of its text. Only the shape of
 * the error is inspected, never its message content.
 */
export function classify(error: unknown): CoreErrorCode {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "upstream-timeout";
  }
  return "upstream-error";
}
