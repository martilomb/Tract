import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEMO_SETTINGS,
  getServerDemoSettingsSnapshot,
  mergeDemoSettings,
  normalizeDemoSettings,
  readDemoSettings,
} from "../src/domain/demo-settings";

describe("browser-local demonstration settings", () => {
  it("keeps profile and organization changes in one coherent settings snapshot", () => {
    const updated = mergeDemoSettings(DEFAULT_DEMO_SETTINGS, {
      profile: {
        displayName: "Morgan Lee",
        timeZone: "UTC",
        dateFormat: "dd-mm-yyyy",
      },
      organization: { name: "Northstar Components", currency: "eur" },
    });

    expect(updated).toEqual({
      profile: { displayName: "Morgan Lee", timeZone: "UTC", dateFormat: "dd-mm-yyyy" },
      organization: { name: "Northstar Components", currency: "EUR" },
    });
  });

  it("fails closed to safe demonstration defaults for incomplete browser storage", () => {
    expect(normalizeDemoSettings({ profile: { displayName: "  " }, organization: {} })).toEqual(
      DEFAULT_DEMO_SETTINGS,
    );
  });

  it("returns stable snapshots until browser-local settings change", () => {
    expect(Object.is(readDemoSettings(), readDemoSettings())).toBe(true);
    expect(Object.is(getServerDemoSettingsSnapshot(), getServerDemoSettingsSnapshot())).toBe(true);
  });
});
