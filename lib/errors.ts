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
 * The same note with the machine code taken off the front, for a screen.
 *
 * `upstream-error: ...` is exactly what an API consumer wants and exactly what a
 * person reading a working page should not be shown: the code turns a sentence
 * explaining that some figures came from fixtures into something that reads like
 * a crash. The code stays on the wire, in GET /api/health and in the API routes,
 * and this is what the console renders.
 *
 * A note with no code prefix passes through untouched, so this is safe to apply
 * to any note whatever built it.
 */
export function noteHint(note: string): string {
  return CODED_NOTE.exec(note)?.[1] ?? note;
}

/**
 * Whether a note came from failureNote() rather than being a plain informational
 * sentence. The code prefix is the discriminator, which is why failureNote() is
 * the only thing that writes one.
 *
 * lib/dreamdex.ts uses this to decide which ledger notes are worth carrying up to
 * the console: "a span was refused" belongs next to the badge, "no window has
 * settled yet" is already what the empty ledger card says in full.
 */
export function isFailureNote(note: string): boolean {
  return CODED_NOTE.test(note);
}

const CODED_NOTE = /^[a-z-]+: (.*)$/s;

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
