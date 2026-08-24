import { Command } from "commander";
import { run, formatOutcome } from "../lib.js";

/**
 * Domains surface captured from the authenticated account dashboard. Read-only.
 */
const ACCOUNT_BASE = "https://account.squarespace.com";

export function domainsCommand(): Command {
  const cmd = new Command("domains").description("Account domains surface (user domains, summaries)");

  cmd
    .command("list")
    .description("List the account's domains (GET /api/account/1/user/domains)")
    .option("--account-id <id>", "account id", "1")
    .option("--json", "compact JSON output")
    .action(async (opts) => {
      const outcome = await run({
        method: "GET",
        auth: "account",
        base: ACCOUNT_BASE,
        path: "/api/account/{accountId}/user/domains",
        pathParams: { accountId: opts.accountId }
      });
      process.stdout.write(formatOutcome(outcome, Boolean(opts.json)));
    });

  cmd
    .command("summaries")
    .description("Domain summaries (GET /api/account/1/domain-summaries)")
    .option("--account-id <id>", "account id", "1")
    .option("--page <n>", "page index", "0")
    .option("--page-size <n>", "page size", "20")
    .option("--json", "compact JSON output")
    .action(async (opts) => {
      const outcome = await run({
        method: "GET",
        auth: "account",
        base: ACCOUNT_BASE,
        path: "/api/account/{accountId}/domain-summaries",
        pathParams: { accountId: opts.accountId },
        query: { page: opts.page, pageSize: opts.pageSize }
      });
      process.stdout.write(formatOutcome(outcome, Boolean(opts.json)));
    });

  return cmd;
}
