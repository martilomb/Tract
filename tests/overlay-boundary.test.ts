import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (name: string) =>
  readFileSync(new URL(`../src/components/ui/${name}.tsx`, import.meta.url), "utf8");

describe("shared overlay viewport boundary", () => {
  it.each(["dialog", "alert-dialog", "sheet", "drawer"])(
    "%s keeps long content inside the viewport with an internal scroll path",
    (name) => {
      const content = source(name);
      expect(content).toMatch(/max-h-\[/);
      expect(content).toContain("overflow-y-auto");
      expect(content).toContain("overscroll-contain");
      expect(content).toContain("data-tract-overlay-content");
      expect(content).toContain("data-tract-overlay-scroll-region");
      expect(content).toContain("overflow-hidden");
    },
  );

  it("keeps the shared dialog close action visible while content scrolls", () => {
    const content = source("dialog");
    expect(content).toContain("absolute right-4 top-4");
    expect(content).toContain("sticky top-0");
    expect(content).toContain("sticky bottom-0");
  });
});
