import { describe, expect, it } from "vitest";
import { buildRequest, COMMERCE_BASE } from "../src/client.js";
import { run, isMutating, formatOutcome } from "../src/lib.js";

describe("buildRequest", () => {
  it("renders the commerce base, path params, and query", () => {
    const plan = buildRequest({
      method: "GET",
      path: "/orders/{orderId}",
      pathParams: { orderId: "abc 123" },
      query: { cursor: "x", skip: undefined }
    });
    expect(plan.method).toBe("GET");
    expect(plan.url).toBe(`${COMMERCE_BASE}/orders/abc%20123?cursor=x`);
    expect(plan.headers.Authorization).toBe("Bearer <SQUARESPACE_API_KEY>");
  });

  it("throws when a required path param is missing", () => {
    expect(() => buildRequest({ method: "GET", path: "/orders/{orderId}" })).toThrow(/missing path parameter/);
  });

  it("uses browser cookies, never a bearer key, for account/domain requests", () => {
    const plan = buildRequest({
      method: "GET",
      auth: "account",
      base: "https://account.squarespace.com",
      path: "/api/account/1/user/domains",
      cookie: "SS_SESSION_ID=test"
    });
    expect(plan.headers.Cookie).toBe("SS_SESSION_ID=test");
    expect(plan.headers.Authorization).toBeUndefined();
    expect(plan.headers.Origin).toBe("https://account.squarespace.com");
    const rendered = formatOutcome({ mode: "read", plan, result: [] }, true);
    expect(rendered).not.toContain("SS_SESSION_ID=test");
    expect(rendered).toContain('"Cookie":"<redacted>"');
  });
});

describe("write safety", () => {
  it("classifies mutating methods", () => {
    expect(isMutating("GET")).toBe(false);
    expect(isMutating("POST")).toBe(true);
    expect(isMutating("PUT")).toBe(true);
    expect(isMutating("DELETE")).toBe(true);
  });

  it("dry-runs a write by default: builds the right method, url, and body, sends nothing", async () => {
    const body = { sku: "TEE-001", title: "Test Tee" };
    const outcome = await run({ method: "POST", path: "/products", body });

    expect(outcome.mode).toBe("dry-run");
    expect(outcome.result).toBeUndefined(); // nothing was sent
    expect(outcome.plan.method).toBe("POST");
    expect(outcome.plan.url).toBe(`${COMMERCE_BASE}/products`);
    expect(outcome.plan.body).toEqual(body);
    expect(outcome.plan.headers["Content-Type"]).toBe("application/json");
  });

  it("dry-runs a fulfillment with path params without touching the network", async () => {
    const outcome = await run({
      method: "POST",
      path: "/orders/{orderId}/fulfillments",
      pathParams: { orderId: "order_42" },
      body: { shouldNotifyCustomer: false }
    });
    expect(outcome.mode).toBe("dry-run");
    expect(outcome.plan.url).toBe(`${COMMERCE_BASE}/orders/order_42/fulfillments`);
  });
});
