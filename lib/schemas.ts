// Edge validation.
//
// Every API handler parses its query string with one of these before it touches
// an adapter, so a malformed request is a 400 with a written hint and never an
// RPC call with a bad address in it. Exported so a test can import them without
// booting Next.
//
// The rule is narrow on purpose: anything that reaches the chain layer is either
// a well formed address or absent. There is no third case.

import { z } from "zod";
import { MAX_LEDGER_ROWS } from "./config";

/** A checksummed or lowercase 20 byte EVM address. */
export const evmAddressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Expected a 20 byte 0x address.");

/** Query string of GET /api/rolls. */
export const rollsQuerySchema = z.object({
  address: evmAddressSchema.optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LEDGER_ROWS).optional(),
});

/** Query string of GET /api/vaults. */
export const vaultsQuerySchema = z.object({
  address: evmAddressSchema.optional(),
});

export type RollsQuery = z.infer<typeof rollsQuerySchema>;
export type VaultsQuery = z.infer<typeof vaultsQuerySchema>;

/**
 * Turn a zod issue list into the one sentence hint the error shape carries.
 * Field names only, never the submitted value: a query string is user input and
 * echoing it back is how a reflected payload gets onto a page.
 */
export function firstIssueHint(
  issues: readonly { path: PropertyKey[]; message: string }[]
): string {
  const issue = issues[0];
  if (!issue) return "The query string was not accepted.";
  const field = issue.path.map(String).join(".") || "query";
  return `The ${field} parameter was not accepted. ${issue.message}`;
}
