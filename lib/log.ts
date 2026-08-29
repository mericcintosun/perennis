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
  if (!detail) {
    console.log(`${CORE} ${step}`);
    return;
  }

  const pairs = Object.entries(detail)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.log(`${CORE} ${step} ${pairs}`);
}
