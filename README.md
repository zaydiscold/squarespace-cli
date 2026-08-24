# Squarespace CLI (MCP + API)

I run a couple of sites and a store on Squarespace, and I kept wanting to do the
boring parts — check orders, look at inventory, list transactions, poke at my
account and domains — without clicking through the dashboard. The Commerce API
is there and it's well documented, so I mapped it, folded in the account/domains
calls I could see from the logged-in app, and wrapped the whole thing in a CLI I
can drive from the terminal or hand to an agent.

## What it does

A typed commander.js CLI with one command group per surface:

- `orders` — `list`, `get`, `fulfill`
- `products` — `list`, `get`, `create`, `update`
- `inventory` — `get`, `adjust`
- `transactions` — `list`
- `contacts` — `list`, `get` (Squarespace calls these profiles)
- `webhooks` — `list`, `create`
- `account` — the dashboard context, website briefs, summaries
- `domains` — the account's domains and domain summaries

Reads run live. **Writes default to a dry-run** — `create`, `update`, `fulfill`,
and `adjust` print the exact request they'd send and stop. Pass `--live-write`
to actually send it. Commerce reads/writes use `SQUARESPACE_API_KEY`.
Account/domain reads use a browser session from `SQUARESPACE_COOKIE` or the
protected `~/.squarespace/auth.json`; neither credential is printed.

```bash
export SQUARESPACE_API_KEY=...
pnpm install && pnpm build

squarespace-cli orders list --json
squarespace-cli products list --type PHYSICAL
squarespace-cli inventory adjust --body '{"incrementOperations":[{"variantId":"V","quantity":5}]}'   # dry-run
squarespace-cli inventory adjust --body '{"incrementOperations":[{"variantId":"V","quantity":5}]}' --live-write

# Account/domains: open a logged-in account.squarespace.com page in a Chrome
# debug profile, then capture + live-verify an origin-scoped session.
node scripts/extract-squarespace-auth.mjs
squarespace-cli domains list --json
```

There's a stdio MCP server in `mcp/` (`squarespace-mcp`) that exposes the same
operations as tools, with the same dry-run-by-default rule on writes.

## The map is the point

The CLI is convenient, but the thing I actually care about is `api-map/`. That's
an OpenAPI 3.1 document (`api-map/openapi/squarespace-api-map.json`) covering the
Commerce endpoints plus the account/domains surface, with per-endpoint Markdown
in `api-map/markdown/` and copy-pasteable curl in `api-map/curl/`. The
account/domains calls came from watching the logged-in dashboard; every ID and
token in there is masked. If all you want is to understand the API, read the map
and ignore the binary.

## Extending it

Every command goes through one `run()` function in `cli/src/lib.ts`, which owns
the read-live / write-dry-run rule. To add an endpoint: add it to the OpenAPI
doc, write a one-line `run({ method, path, ... })` call in a command file, and
it inherits the safety behavior for free. Tests live in `cli/test/`.

Built on the trio pattern (CLI + skill + MCP) pioneered by [Matt Van Horn's Printing Press](https://github.com/mvanhorn/cli-printing-press).

---

Mapped & built by Zayd Khan ([@ColdCooks](https://twitter.com/ColdCooks) / [zaydiscold](https://github.com/zaydiscold)). MIT © Zayd Khan.
