---
name: squarespace
description: "Drive the squarespace TypeScript CLI for Squarespace Commerce (orders, products, inventory, transactions, contacts, webhooks) plus the account/domains dashboard surface; reads are live, writes are dry-run unless --live-write"
author: "zaydiscold"
license: "MIT"
argument-hint: "<group> <command> [args]"
allowed-tools: "Read Bash"
metadata:
  openclaw:
    requires:
      bins:
        - squarespace-cli
---

# squarespace

Use this skill to read and (deliberately) write the Squarespace Commerce API
from the terminal, plus inspect the account/domains dashboard surface.

## Prerequisites

```bash
cd ~/Desktop/squarespace-cli
pnpm install
pnpm build
export SQUARESPACE_API_KEY=...   # Commerce surface only
# Account/domains: node scripts/extract-squarespace-auth.mjs
```

## Useful commands

```bash
pnpm cli -- orders list --json
pnpm cli -- orders get <orderId> --json
pnpm cli -- products list --type PHYSICAL --json
pnpm cli -- inventory get --json
pnpm cli -- transactions list --json
pnpm cli -- contacts list --json
pnpm cli -- webhooks list --json
pnpm cli -- account context --json
pnpm cli -- domains list --json

# Writes: dry-run by default
pnpm cli -- products create --body '{"type":"PHYSICAL","name":"Tee"}' --json
# Add --live-write to actually send
pnpm cli -- products create --body '{"type":"PHYSICAL","name":"Tee"}' --live-write --json
```

## Safety

- Reads run live. Writes default to a dry-run and require `--live-write`.
- `SQUARESPACE_API_KEY` is read only for live Commerce calls and never printed.
- The account/domains surface is cookie-authenticated and read-only. The CLI
  auto-loads `~/.squarespace/auth.json` after the capture script proves a live
  domains read; stale sessions are never written as ready.
