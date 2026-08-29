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
import { coreFailure, type CoreFailure } from "./errors";

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
 * The plan builder, parsed before anything is encoded.
 *
 * Same rules the console already showed inline, moved here so there is one
 * definition of what a valid plan is and the write path cannot be reached with
 * an input the screen never checked. The cross field rules are the ones that
 * matter: a floor at or above the deposit halts the plan on its first
 * settlement, and a take profit at or below it halts it immediately, both of
 * which look like a broken demo rather than a working stop rule.
 *
 * These mirror the BadPlan() checks in contracts/src/PerennisVault.sol
 * startPlan. Nothing here is stricter than the contract except the 24 window
 * ceiling, which is a demo limit and not a contract one.
 */
export const planFormSchema = z
  .object({
    deposit: z.number().positive("The deposit has to be greater than zero."),
    stakePerWindow: z
      .number()
      .positive("The stake per window has to be greater than zero."),
    windows: z
      .number()
      .int()
      .min(1, "Pick between 1 and 24 windows.")
      .max(24, "Pick between 1 and 24 windows."),
    maxConsecutiveLosses: z
      .number()
      .int()
      .min(1, "The consecutive loss limit has to be at least 1."),
    floorBalance: z.number().min(0, "The floor cannot be negative."),
    takeProfit: z.number().positive("Take profit has to be greater than zero."),
    direction: z.enum(["UP", "DOWN"]),
    asset: z.enum(["BTC", "ETH"]),
  })
  // One superRefine rather than three chained refines: chained ones nest, so
  // the second never runs once the first has failed and the console would show
  // the stop rule problems one at a time instead of all of them.
  .superRefine((plan, ctx) => {
    if (plan.stakePerWindow > plan.deposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stakePerWindow"],
        message: "The stake per window cannot exceed the deposit.",
      });
    }
    if (plan.floorBalance >= plan.deposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["floorBalance"],
        message:
          "The floor has to sit below the deposit or the plan halts immediately.",
      });
    }
    if (plan.takeProfit <= plan.deposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["takeProfit"],
        message: "Take profit has to sit above the deposit.",
      });
    }
  });

export type PlanForm = z.infer<typeof planFormSchema>;

/**
 * Parse a plan builder form and answer with either the parsed plan or the error
 * list the console renders. Failures land on the same taxonomy the rest of the
 * app uses: an unparsable plan is `invalid-input`, never an exception.
 */
export function parsePlanForm(
  input: unknown
): { ok: true; plan: PlanForm } | { ok: false; failure: CoreFailure; issues: string[] } {
  const parsed = planFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, plan: parsed.data };

  const issues = parsed.error.issues.map((issue) => issue.message);
  return {
    ok: false,
    failure: coreFailure(
      "invalid-input",
      issues[0] ?? "The plan was not accepted."
    ),
    issues,
  };
}

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
