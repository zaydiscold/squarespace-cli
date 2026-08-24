import { Command } from "commander";
import { run, formatOutcome } from "../lib.js";

/**
 * The account surface is the logged-in dashboard API, not the public Commerce
 * API. Base differs (account.squarespace.com) and these endpoints were captured
 * from the authenticated app, so they're cookie/session-authenticated in the
 * browser. The CLI uses SQUARESPACE_COOKIE for this read-only surface; it never
 * sends the Commerce bearer key to account.squarespace.com.
 */
const ACCOUNT_BASE = "https://account.squarespace.com";

export function accountCommand(): Command {
  const cmd = new Command("account").description("Account dashboard surface (context, summaries, manifests)");

  cmd
    .command("context")
    .description("Project-picker context for the account (GET /api/account/1/context/project-picker)")
    .option("--account-id <id>", "account id", "1")
    .option("--json", "compact JSON output")
    .action(async (opts) => {
      const outcome = await run({
        method: "GET",
        auth: "account",
        base: ACCOUNT_BASE,
        path: "/api/account/{accountId}/context/project-picker",
        pathParams: { accountId: opts.accountId }
      });
      process.stdout.write(formatOutcome(outcome, Boolean(opts.json)));
    });

  cmd
    .command("website-briefs")
    .description("Website briefs for the account (GET /api/account/1/website-briefs)")
    .option("--account-id <id>", "account id", "1")
    .option("--json", "compact JSON output")
    .action(async (opts) => {
      const outcome = await run({
        method: "GET",
        auth: "account",
        base: ACCOUNT_BASE,
        path: "/api/account/{accountId}/website-briefs",
        pathParams: { accountId: opts.accountId }
      });
      process.stdout.write(formatOutcome(outcome, Boolean(opts.json)));
    });

  cmd
    .command("website-summaries")
    .description("Project-picker website summaries (GET /api/account/1/project-picker/website-summaries)")
    .option("--account-id <id>", "account id", "1")
    .option("--page <n>", "page index", "0")
    .option("--json", "compact JSON output")
    .action(async (opts) => {
      const outcome = await run({
        method: "GET",
        auth: "account",
        base: ACCOUNT_BASE,
        path: "/api/account/{accountId}/project-picker/website-summaries",
        pathParams: { accountId: opts.accountId },
        query: { page: opts.page }
      });
      process.stdout.write(formatOutcome(outcome, Boolean(opts.json)));
    });

  return cmd;
}
