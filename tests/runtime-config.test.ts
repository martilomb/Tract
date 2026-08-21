import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("production runtime configuration", () => {
  it("routes the Worker through the hardened custom server entry", () => {
    const wrangler = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
    expect(wrangler).toContain('"main": "src/server.ts"');
    expect(wrangler).toContain('"SUPABASE_SERVICE_ROLE_KEY"');
    expect(wrangler).toContain('"observability"');

    const server = readFileSync(join(process.cwd(), "src", "server.ts"), "utf8");
    expect(server).toContain("applySecurityHeaders");
    expect(server).toContain('event: "request_completed"');
    expect(server).toContain('event: "request_failed"');
  });
});
