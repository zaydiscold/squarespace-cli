# Auth

## Commerce API
- Header: `Authorization: Bearer ***`
- Env var: `SQUARESPACE_API_KEY`
- Get a key from the Squarespace dashboard under **Settings → Advanced → Developer API Keys**. Scope it to the permissions you actually need (orders, products, inventory, transactions, profiles).
- The CLI reads `SQUARESPACE_API_KEY` at call time. It is never printed; plans and results redact the `Authorization` header to `Bearer <redacted>`.

## Account / domains dashboard surface
- Authenticated by the logged-in browser **session** (cookies: `login_session`, `member-session`, `crumb`, `SS_SESSION_ID`), not the bearer key.
- Run `node scripts/extract-squarespace-auth.mjs` while a logged-in
  `account.squarespace.com` tab is open in Chrome CDP (default `:9222`). The
  helper captures only the named Squarespace auth cookies, requires a live
  HTTP 200 domains read, then writes `~/.squarespace/auth.json` mode `0600`.
- `SQUARESPACE_COOKIE` and `SQUARESPACE_AUTH_FILE` override the persisted path.
- The CLI redacts both `Authorization` and `Cookie` headers from output.
- The account/domains surface remains **read-only**.
