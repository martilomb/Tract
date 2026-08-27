import { useSyncExternalStore } from "react";

export interface DemoSettings {
  profile: {
    displayName: string;
    timeZone: string;
    dateFormat: string;
  };
  organization: {
    name: string;
    currency: string;
  };
}

type StoredDemoSettings = {
  profile?: Partial<DemoSettings["profile"]>;
  organization?: Partial<DemoSettings["organization"]>;
};

export const DEFAULT_DEMO_SETTINGS: Readonly<DemoSettings> = Object.freeze({
  profile: Object.freeze({
    displayName: "Local reviewer",
    timeZone: "Europe/Madrid",
    dateFormat: "yyyy-mm-dd",
  }),
  organization: Object.freeze({ name: "Demonstration organization", currency: "USD" }),
});

const STORAGE_KEY = "tract-demo-settings";
const CHANGE_EVENT = "tract-demo-settings-change";
const SERVER_DEMO_SETTINGS: DemoSettings = DEFAULT_DEMO_SETTINGS;
let cachedSerialized: string | null | undefined;
let cachedSettings: DemoSettings = SERVER_DEMO_SETTINGS;

function cleanValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeDemoSettings(value: unknown): DemoSettings {
  const candidate = value && typeof value === "object" ? (value as StoredDemoSettings) : {};
  const profile = candidate.profile ?? {};
  const organization = candidate.organization ?? {};
  return {
    profile: {
      displayName: cleanValue(profile.displayName, DEFAULT_DEMO_SETTINGS.profile.displayName),
      timeZone: cleanValue(profile.timeZone, DEFAULT_DEMO_SETTINGS.profile.timeZone),
      dateFormat: cleanValue(profile.dateFormat, DEFAULT_DEMO_SETTINGS.profile.dateFormat),
    },
    organization: {
      name: cleanValue(organization.name, DEFAULT_DEMO_SETTINGS.organization.name),
      currency: cleanValue(
        organization.currency,
        DEFAULT_DEMO_SETTINGS.organization.currency,
      ).toUpperCase(),
    },
  };
}

export function mergeDemoSettings(
  current: DemoSettings,
  change: Partial<DemoSettings>,
): DemoSettings {
  return normalizeDemoSettings({
    profile: { ...current.profile, ...change.profile },
    organization: { ...current.organization, ...change.organization },
  });
}

export function readDemoSettings(): DemoSettings {
  if (typeof window === "undefined") return SERVER_DEMO_SETTINGS;
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (serialized === cachedSerialized) return cachedSettings;
  try {
    cachedSettings = normalizeDemoSettings(JSON.parse(serialized ?? "null"));
  } catch {
    cachedSettings = SERVER_DEMO_SETTINGS;
  }
  cachedSerialized = serialized;
  return cachedSettings;
}

export function saveDemoSettings(change: Partial<DemoSettings>): DemoSettings {
  const next = mergeDemoSettings(readDemoSettings(), change);
  if (typeof window !== "undefined") {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedSerialized = serialized;
    cachedSettings = next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return next;
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useDemoSettings(): DemoSettings {
  return useSyncExternalStore(subscribe, readDemoSettings, getServerDemoSettingsSnapshot);
}

export function getServerDemoSettingsSnapshot(): DemoSettings {
  return SERVER_DEMO_SETTINGS;
}
