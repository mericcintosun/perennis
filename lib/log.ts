// Structured logging for the core read path.
//
// Deliberately narrow. `detail` only accepts strings and numbers, so a caller
// cannot hand it a private key object, a full RPC payload or an Error with a
// URL in its message. What belongs here: step names, ids, hashes, counts and
// durations. Nothing else.

export const CORE = "[core]";

export function logCore(
  step: string,
  detail?: Record<string, string | number>
): void {
  console.log(line(step, detail));
}

/**
 * The degraded path: a read that did not answer, a span the endpoint refused, a
 * value served from the short lived cache instead of fresh.
 *
 * Warn and never error, on purpose. Every one of these conditions is caught,
 * named on screen in a sentence written by us, and leaves the app usable. A
 * console.error here would say the opposite, and would be the loudest thing in
 * the browser for anyone who opens devtools on a working page.
 */
export function logCoreWarn(
  step: string,
  detail?: Record<string, string | number>
): void {
  console.warn(line(step, detail));
}

function line(step: string, detail?: Record<string, string | number>): string {
  if (!detail) return `${CORE} ${step}`;

  const pairs = Object.entries(detail)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  return `${CORE} ${step} ${pairs}`;
}
