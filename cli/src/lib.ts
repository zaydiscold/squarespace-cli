import {
  buildRequest,
  execute,
  getAccountCookie,
  getApiKey,
  type BuildRequestInput,
  type HttpMethod,
  type RequestPlan
} from "./client.js";

export type { BuildRequestInput, HttpMethod, RequestPlan } from "./client.js";

export interface RunOptions {
  /** Pretty-print plans/results as text instead of compact JSON. Default true for CLI. */
  json?: boolean;
  /** Set by --live-write on mutating commands. */
  liveWrite?: boolean;
}

export interface Outcome {
  mode: "read" | "dry-run" | "live-write";
  plan: RequestPlan;
  result?: unknown;
}

const MUTATING: ReadonlySet<HttpMethod> = new Set<HttpMethod>(["POST", "PUT", "DELETE", "PATCH"]);

export function isMutating(method: HttpMethod): boolean {
  return MUTATING.has(method);
}

/**
 * Core dispatcher used by every command.
 *
 * - Reads (GET) execute against the live API immediately.
 * - Writes (POST/PUT/DELETE/PATCH) DEFAULT TO A DRY-RUN: the request plan is
 *   returned and nothing is sent. Only when `liveWrite` is true is the request
 *   actually executed. This is the safety contract for the whole CLI.
 *
 * Returning the outcome (instead of printing) keeps it unit-testable.
 */
export async function run(input: BuildRequestInput, opts: RunOptions = {}): Promise<Outcome> {
  const mutating = isMutating(input.method);

  if (mutating && !opts.liveWrite) {
    // Dry-run preview: build the plan with a placeholder key so we never touch
    // credentials or the network. Nothing is mutated.
    const plan = buildRequest(input);
    return { mode: "dry-run", plan };
  }

  const auth = input.auth ?? (input.base?.includes("account.squarespace.com") ? "account" : "commerce");
  const plan = auth === "account"
    ? buildRequest({ ...input, auth, cookie: getAccountCookie() })
    : buildRequest({ ...input, auth, commerceCredential: getApiKey() });
  if (mutating) {
    process.stderr.write(
      `[LIVE WRITE -> SQUARESPACE] ${plan.method} ${redactUrl(plan.url)}\n`
    );
  }
  const result = await execute(plan);
  return { mode: mutating ? "live-write" : "read", plan, result };
}

function redactUrl(url: string): string {
  return url;
}

/** Render an outcome for human/agent consumption. Secrets are never printed. */
export function formatOutcome(outcome: Outcome, json: boolean): string {
  const safeHeaders = { ...outcome.plan.headers };
  if (safeHeaders.Authorization) safeHeaders.Authorization = "Bearer <redacted>";
  if (safeHeaders.Cookie) safeHeaders.Cookie = "<redacted>";
  const safePlan: RequestPlan = {
    ...outcome.plan,
    headers: safeHeaders
  };
  const payload: Record<string, unknown> = { mode: outcome.mode, request: safePlan };
  if (outcome.mode === "dry-run") {
    payload.note = "dry-run: nothing was sent. Re-run with --live-write to execute.";
  }
  if (outcome.result !== undefined) {
    payload.result = outcome.result;
  }
  return json ? `${JSON.stringify(payload)}\n` : `${JSON.stringify(payload, null, 2)}\n`;
}
