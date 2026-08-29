import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const config = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf8");

function section(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = config.match(new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\n\\[|$)`, "u"));
  if (!match?.[1]) throw new Error(`Missing Supabase config section: ${name}`);
  return match[1];
}

describe("hosted staging Auth configuration", () => {
  it("keeps public signup closed without disabling approved email/password sign-in", () => {
    expect(section("auth")).toMatch(/\nenable_signup = false\n/u);
    expect(section("auth.email")).toMatch(/\nenable_signup = true\n/u);
    expect(section("auth.email")).toMatch(/\nenable_confirmations = true\n/u);
    expect(section("auth.email")).toMatch(/\nsecure_password_change = true\n/u);
  });

  it("uses only the approved local acceptance origins and a one-hour access token", () => {
    const auth = section("auth");
    expect(auth).toContain('site_url = "http://127.0.0.1:8081"');
    expect(auth).toContain(
      'additional_redirect_urls = ["http://127.0.0.1:8081", "http://localhost:8081"]',
    );
    expect(auth).not.toContain("*");
    expect(auth).toMatch(/\njwt_expiry = 3600\n/u);
    expect(auth).toMatch(/\nenable_refresh_token_rotation = true\n/u);
    expect(auth).toMatch(/\nrefresh_token_reuse_interval = 10\n/u);
  });

  it("retains the free TOTP enrollment and verification boundary", () => {
    expect(section("auth.mfa.totp")).toMatch(/\nenroll_enabled = true\n/u);
    expect(section("auth.mfa.totp")).toMatch(/\nverify_enabled = true\n/u);
  });
});
