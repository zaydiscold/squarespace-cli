#!/usr/bin/env node
import { run, formatOutcome, type BuildRequestInput } from "@zaydiscold/squarespace-cli";
import { createInterface } from "node:readline";

const COMMERCE = undefined; // default base in client
const ACCOUNT_BASE = "https://account.squarespace.com";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

function respond(id: JsonRpcRequest["id"], result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function rpcError(id: JsonRpcRequest["id"], message: string): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message } })}\n`);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function call(input: BuildRequestInput, liveWrite: boolean): Promise<string> {
  const outcome = await run(input, { liveWrite });
  return formatOutcome(outcome, true);
}

const TOOLS = [
  { name: "squarespace_orders_list", description: "List Commerce orders.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { cursor: { type: "string" }, fulfillmentStatus: { type: "string" } } } },
  { name: "squarespace_orders_get", description: "Get one order by id.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { orderId: { type: "string" } }, required: ["orderId"] } },
  { name: "squarespace_orders_fulfill", description: "Fulfill an order. Dry-run unless liveWrite is true.", annotations: { "mcp:read-only": false, "mcp:risk": "write-mutate" }, inputSchema: { type: "object", properties: { orderId: { type: "string" }, body: { type: "object" }, liveWrite: { type: "boolean" } }, required: ["orderId", "body"] } },
  { name: "squarespace_products_list", description: "List store products.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { cursor: { type: "string" }, type: { type: "string" } } } },
  { name: "squarespace_products_get", description: "Get one product by id.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { productId: { type: "string" } }, required: ["productId"] } },
  { name: "squarespace_products_create", description: "Create a product. Dry-run unless liveWrite is true.", annotations: { "mcp:read-only": false, "mcp:risk": "write-mutate" }, inputSchema: { type: "object", properties: { body: { type: "object" }, liveWrite: { type: "boolean" } }, required: ["body"] } },
  { name: "squarespace_inventory_get", description: "Get inventory levels.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { cursor: { type: "string" } } } },
  { name: "squarespace_inventory_adjust", description: "Adjust inventory. Dry-run unless liveWrite is true.", annotations: { "mcp:read-only": false, "mcp:risk": "write-mutate" }, inputSchema: { type: "object", properties: { body: { type: "object" }, liveWrite: { type: "boolean" } }, required: ["body"] } },
  { name: "squarespace_transactions_list", description: "List Commerce transactions.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { cursor: { type: "string" } } } },
  { name: "squarespace_contacts_list", description: "List customer profiles/contacts.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { cursor: { type: "string" }, filter: { type: "string" } } } },
  { name: "squarespace_webhooks_list", description: "List webhook subscriptions.", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: {} } },
  { name: "squarespace_webhooks_create", description: "Create a webhook subscription. Dry-run unless liveWrite is true.", annotations: { "mcp:read-only": false, "mcp:risk": "write-mutate" }, inputSchema: { type: "object", properties: { body: { type: "object" }, liveWrite: { type: "boolean" } }, required: ["body"] } },
  { name: "squarespace_account_context", description: "Account project-picker context (dashboard surface).", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { accountId: { type: "string" } } } },
  { name: "squarespace_domains_list", description: "List the account's domains (dashboard surface).", annotations: { "mcp:read-only": true }, inputSchema: { type: "object", properties: { accountId: { type: "string" } } } }
];

async function dispatch(name: string, args: Record<string, unknown>): Promise<string> {
  const live = args.liveWrite === true;
  switch (name) {
    case "squarespace_orders_list":
      return call({ method: "GET", base: COMMERCE, path: "/orders", query: { cursor: str(args.cursor), fulfillmentStatus: str(args.fulfillmentStatus) } }, false);
    case "squarespace_orders_get":
      return call({ method: "GET", base: COMMERCE, path: "/orders/{orderId}", pathParams: { orderId: str(args.orderId) ?? "" } }, false);
    case "squarespace_orders_fulfill":
      return call({ method: "POST", base: COMMERCE, path: "/orders/{orderId}/fulfillments", pathParams: { orderId: str(args.orderId) ?? "" }, body: args.body }, live);
    case "squarespace_products_list":
      return call({ method: "GET", base: COMMERCE, path: "/products", query: { cursor: str(args.cursor), type: str(args.type) } }, false);
    case "squarespace_products_get":
      return call({ method: "GET", base: COMMERCE, path: "/products/{productId}", pathParams: { productId: str(args.productId) ?? "" } }, false);
    case "squarespace_products_create":
      return call({ method: "POST", base: COMMERCE, path: "/products", body: args.body }, live);
    case "squarespace_inventory_get":
      return call({ method: "GET", base: COMMERCE, path: "/inventory", query: { cursor: str(args.cursor) } }, false);
    case "squarespace_inventory_adjust":
      return call({ method: "POST", base: COMMERCE, path: "/inventory/adjustments", body: args.body }, live);
    case "squarespace_transactions_list":
      return call({ method: "GET", base: COMMERCE, path: "/transactions", query: { cursor: str(args.cursor) } }, false);
    case "squarespace_contacts_list":
      return call({ method: "GET", base: COMMERCE, path: "/profiles", query: { cursor: str(args.cursor), filter: str(args.filter) } }, false);
    case "squarespace_webhooks_list":
      return call({ method: "GET", base: COMMERCE, path: "/webhook_subscriptions" }, false);
    case "squarespace_webhooks_create":
      return call({ method: "POST", base: COMMERCE, path: "/webhook_subscriptions", body: args.body }, live);
    case "squarespace_account_context":
      return call({ method: "GET", auth: "account", base: ACCOUNT_BASE, path: "/api/account/{accountId}/context/project-picker", pathParams: { accountId: str(args.accountId) ?? "1" } }, false);
    case "squarespace_domains_list":
      return call({ method: "GET", auth: "account", base: ACCOUNT_BASE, path: "/api/account/{accountId}/user/domains", pathParams: { accountId: str(args.accountId) ?? "1" } }, false);
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

async function handle(req: JsonRpcRequest): Promise<void> {
  if (req.method === "initialize") {
    respond(req.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "squarespace-mcp", version: "0.1.0" }
    });
    return;
  }
  if (req.method === "tools/list") {
    respond(req.id, { tools: TOOLS });
    return;
  }
  if (req.method === "tools/call") {
    const name = req.params?.name ?? "";
    const args = req.params?.arguments ?? {};
    respond(req.id, { content: [{ type: "text", text: await dispatch(name, args) }] });
    return;
  }
  if (req.method === "notifications/initialized") return;
  rpcError(req.id ?? null, `unsupported method: ${req.method}`);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (!line.trim()) return;
  void handle(JSON.parse(line) as JsonRpcRequest).catch((err: unknown) => {
    rpcError(null, err instanceof Error ? err.message : String(err));
  });
});
