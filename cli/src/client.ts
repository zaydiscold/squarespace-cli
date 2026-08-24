import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Request building + execution for Squarespace's two auth surfaces.
 *
 * The base for the public Commerce API is https://api.squarespace.com/1.0/commerce
 * and auth is a bearer API key in the `Authorization` header. The private
 * account/domains dashboard uses a logged-in browser Cookie header instead.
 *
 * Request planning (method + url + headers + body) is deliberately split from
 * execution so the planner can be unit-tested without network or credentials,
 * and so every write defaults to a dry-run preview.
 */

export const COMMERCE_BASE = "https://api.squarespace.com/1.0/commerce";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestPlan {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface BuildRequestInput {
  method: HttpMethod;
  /** Path relative to the Commerce base, e.g. "/orders" or "/products/{id}". */
  path: string;
  pathParams?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Override the base (used by account/domains internal surface). */
  base?: string;
  /** Commerce bearer credential. Omit it to emit a safe placeholder in plans. */
  commerceCredential?: string;
  /** Browser-session Cookie header for the account/domains dashboard. */
  cookie?: string;
  /** Explicit auth surface. Defaults from the request base URL. */
  auth?: "commerce" | "account";
}

const PLACEHOLDER_KEY = "<SQUARESPACE_API_KEY>";
const PLACEHOLDER_COOKIE = "<SQUARESPACE_COOKIE>";

function renderPath(path: string, pathParams: Record<string, string> = {}): string {
  let rendered = path;
  for (const [name, value] of Object.entries(pathParams)) {
    rendered = rendered.replace(new RegExp(`\\{${name}\\}`, "g"), encodeURIComponent(value));
  }
  const missing = Array.from(rendered.matchAll(/\{([^}]+)\}/g), (m) => m[1]);
  if (missing.length > 0) {
    throw new Error(`missing path parameter(s): ${missing.join(", ")}`);
  }
  return rendered;
}

/**
 * Pure function: turns an intent into a concrete request plan. No network.
 */
export function buildRequest(input: BuildRequestInput): RequestPlan {
  const base = input.base ?? COMMERCE_BASE;
  const url = new URL(base.replace(/\/$/, "") + renderPath(input.path, input.pathParams));
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
  const auth = input.auth ?? (url.hostname === "account.squarespace.com" ? "account" : "commerce");
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; squarespace-cli/0.1)",
    Accept: "application/json"
  };
  if (auth === "account") {
    headers.Cookie = input.cookie ?? PLACEHOLDER_COOKIE;
    headers.Origin = "https://account.squarespace.com";
    headers.Referer = "https://account.squarespace.com/domains";
  } else {
    headers.Authorization = "Bearer " + (input.commerceCredential ?? PLACEHOLDER_KEY);
  }
  if (input.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return { method: input.method, url: url.toString(), headers, body: input.body };
}

export function getApiKey(): string {
  const key = process.env.SQUARESPACE_API_KEY;
  if (!key) {
    throw new Error("SQUARESPACE_API_KEY is required for live Commerce calls (set it in your environment)");
  }
  return key;
}

export function getAccountCookie(): string {
  const envCookie = process.env.SQUARESPACE_COOKIE;
  if (envCookie) return envCookie;

  const authFile = process.env.SQUARESPACE_AUTH_FILE ?? join(homedir(), ".squarespace", "auth.json");
  try {
    const parsed = JSON.parse(readFileSync(authFile, "utf8")) as { cookie?: unknown };
    if (typeof parsed.cookie === "string" && parsed.cookie.length > 0) return parsed.cookie;
  } catch {
    // The actionable error below covers missing, unreadable, and malformed files.
  }
  throw new Error(
    `Squarespace account session missing; set SQUARESPACE_COOKIE or run scripts/extract-squarespace-auth.mjs (auth file: ${authFile})`
  );
}

/**
 * Execute a planned request against the live API. Only ever called once a
 * read is requested or a write has been explicitly confirmed with --live-write.
 */
export async function execute(plan: RequestPlan): Promise<unknown> {
  const body = plan.body === undefined ? undefined : JSON.stringify(plan.body);
  const res = await fetch(plan.url, {
    method: plan.method,
    headers: plan.headers,
    body
  });
  const text = await res.text();
  const parsed = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = typeof parsed === "object" && parsed !== null ? JSON.stringify(parsed) : text;
    throw new Error(`Squarespace API returned HTTP ${res.status} for ${plan.method} ${plan.url}: ${detail}`);
  }
  return parsed;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
