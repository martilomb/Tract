import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  resolveRequestId,
} from "@/server/security-headers.server";

describe("HTTP response hardening", () => {
  it("applies restrictive browser controls, request correlation, and private caching", async () => {
    const response = applySecurityHeaders({
      response: new Response("<h1>Tract</h1>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
      request: new Request("https://tract.example.test/operations"),
      requestId: "request-123",
      supabaseUrl: "https://project.supabase.co",
    });

    expect(await response.text()).toBe("<h1>Tract</h1>");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://project.supabase.co");
    expect(csp).toContain("wss://project.supabase.co");
    expect(csp).not.toContain("https://attacker.test");
  });

  it("allows only the local development websocket on localhost", () => {
    const csp = buildContentSecurityPolicy({
      requestUrl: new URL("http://localhost:4173/operations"),
      supabaseUrl: "not-a-url",
    });
    expect(csp).toContain("ws://localhost:4173");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("replaces malformed or oversized inbound request ids", () => {
    expect(resolveRequestId("upstream:123", () => "generated")).toBe("upstream:123");
    expect(resolveRequestId("bad\r\nheader", () => "generated")).toBe("generated");
    expect(resolveRequestId("x".repeat(129), () => "generated")).toBe("generated");
  });
});
