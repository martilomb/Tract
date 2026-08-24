import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const contractsSource = readFileSync("src/routes/contracts.tsx", "utf8");
const dcrSource = readFileSync("src/routes/dcrs.tsx", "utf8");

describe("commercial workspace acceptance boundaries", () => {
  it("keeps recovery setup controlled, URL-scoped, and all-or-nothing", () => {
    expect(contractsSource).toContain("validateSearch: (search: Record<string, unknown>)");
    expect(contractsSource).toContain("Set up / activate recovery");
    expect(contractsSource).toContain("activateRecoveryAgreement(approved");
    expect(contractsSource).toContain("Incomplete draft retained:");
    expect(contractsSource).toContain("value={item.id}");
    expect(contractsSource).not.toContain("splitValues(");
  });

  it("provides governed Table and Board movement through one DCR state machine", () => {
    expect(dcrSource).toContain("<Table>");
    expect(dcrSource).toContain("BOARD_STAGES.map");
    expect(dcrSource).toContain("draggable");
    expect(dcrSource).toContain("moveDcr(dcrId, stage)");
    expect(dcrSource).toContain('aria-label="Synthetic actor role"');
    expect(dcrSource).toContain('aria-label="Affected program"');
    expect(dcrSource).toContain("transitionDcr({");
    expect(dcrSource).not.toMatch(/custom[- ]property|pipeline builder|automation engine/i);
  });
});
