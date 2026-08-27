import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const settingsSource = readFileSync("src/routes/settings.tsx", "utf8");

describe("Settings workspace boundaries", () => {
  it("separates the approved settings areas and reuses functional routes", () => {
    expect(settingsSource).toContain("Personal");
    expect(settingsSource).toContain("Organization");
    expect(settingsSource).toContain("Rules &amp; policies");
    expect(settingsSource).toContain("Security, SSO &amp; data controls");
    expect(settingsSource).toContain('to="/profile"');
    expect(settingsSource).toContain('to="/organization"');
    expect(settingsSource).toContain('to="/connections"');
  });

  it("keeps security actions fail-closed and master-data controls permission-aware", () => {
    expect(settingsSource).toContain("Password reset unavailable");
    expect(settingsSource).toContain("MFA policy unavailable");
    expect(settingsSource).toContain("Enterprise SSO unavailable");
    expect(settingsSource).toContain("Retention policy unavailable");
    expect(settingsSource).toContain("canManagePermissions(");
    expect(settingsSource).toContain("CreateProgramDialog");
    expect(settingsSource).toContain("CreatePartRevisionDialog");
    expect(settingsSource).toContain("No custom DCR properties, pipeline builders");
    expect(settingsSource).toContain("automation controls are available in this release");
  });
});
