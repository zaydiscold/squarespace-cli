#!/usr/bin/env node
/** Capture an origin-scoped Squarespace account session from Chrome CDP.
 *
 * The file is written only after a live account/domains read succeeds. Cookie
 * values never reach stdout. Credentials/passwords/OTP remain browser-only.
 */
import { mkdir, writeFile, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const cdpBase = process.env.SQUARESPACE_CDP_URL ?? "http://127.0.0.1:9222";
const authFile = process.env.SQUARESPACE_AUTH_FILE ?? join(homedir(), ".squarespace", "auth.json");
const ACCOUNT_ORIGIN = "https://account.squarespace.com";
const AUTH_COOKIE_NAMES = new Set(["login_session", "member-session", "crumb", "SS_SESSION_ID"]);

function connect(url) {
  const ws = new WebSocket(url);
  let sequence = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    pending.get(message.id)(message);
    pending.delete(message.id);
  };
  const opened = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return {
    opened,
    send(method, params = {}) {
      return new Promise((resolve) => {
        const id = ++sequence;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const targetsResponse = await fetch(`${cdpBase}/json`);
  if (!targetsResponse.ok) throw new Error(`CDP target list returned HTTP ${targetsResponse.status}`);
  const targets = await targetsResponse.json();
  const target = targets.find(
    (candidate) => candidate.type === "page" && candidate.url?.startsWith(`${ACCOUNT_ORIGIN}/`)
  );
  if (!target?.webSocketDebuggerUrl) {
    throw new Error("no account.squarespace.com page is open in the CDP browser");
  }

  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.opened;
  try {
    await cdp.send("Network.enable");
    const reply = await cdp.send("Network.getCookies", {
      urls: [`${ACCOUNT_ORIGIN}/`, "https://secure.squarespace.com/"]
    });
    const cookies = (reply.result?.cookies ?? []).filter(
      (cookie) =>
        AUTH_COOKIE_NAMES.has(cookie.name) &&
        (cookie.domain === "account.squarespace.com" ||
          cookie.domain === "secure.squarespace.com" ||
          cookie.domain === ".squarespace.com")
    );
    const byName = new Map(cookies.map((cookie) => [cookie.name, cookie.value]));
    const cookie = [...byName.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    if (!cookie) throw new Error("Squarespace auth cookies were not present; sign in in the debug browser first");

    const verification = await fetch(`${ACCOUNT_ORIGIN}/api/account/1/user/domains`, {
      headers: {
        Accept: "application/json",
        Cookie: cookie,
        Origin: ACCOUNT_ORIGIN,
        Referer: `${ACCOUNT_ORIGIN}/domains`,
        "User-Agent": "Mozilla/5.0 (compatible; squarespace-cli-auth-capture/1.0)"
      }
    });
    if (!verification.ok) {
      process.stdout.write(
        `auth_state=stale status=${verification.status} auth_file_written=no\n`
      );
      process.exitCode = 1;
      return;
    }
    const payload = await verification.json();
    const count = Array.isArray(payload)
      ? payload.length
      : Array.isArray(payload?.domains)
        ? payload.domains.length
        : null;

    await mkdir(dirname(authFile), { recursive: true });
    await writeFile(
      authFile,
      `${JSON.stringify(
        {
          version: 1,
          capturedAt: new Date().toISOString(),
          origin: ACCOUNT_ORIGIN,
          cookie
        },
        null,
        2
      )}\n`,
      { mode: 0o600 }
    );
    await chmod(authFile, 0o600);
    process.stdout.write(
      `auth_state=verified status=200 domains=${count ?? "unknown"} auth_file_written=yes\n`
    );
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  process.stderr.write(`auth_state=failed reason=${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
