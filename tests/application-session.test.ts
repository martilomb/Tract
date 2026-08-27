import { describe, expect, it } from "vitest";

import {
  isApplicationSession,
  selectActiveMembership,
  type ActiveMembership,
} from "@/domain/application-session";
import {
  assertSameOrigin,
  clearApplicationSessionCookies,
} from "@/server/application-session.server";

const memberships: readonly ActiveMembership[] = [
  {
    id: "membership-a",
    organizationId: "20000000-0000-0000-0000-000000000001",
    organizationName: "Organization A",
    organizationSlug: "organization-a",
    defaultCurrency: "USD",
    role: "administrator",
  },
  {
    id: "membership-b",
    organizationId: "20000000-0000-0000-0000-000000000002",
    organizationName: "Organization B",
    organizationSlug: "organization-b",
    defaultCurrency: "EUR",
    role: "member",
  },
];

describe("application session boundary", () => {
  it("accepts a selected organization only from active memberships", () => {
    expect(selectActiveMembership(memberships, memberships[1]!.organizationId)).toBe(
      memberships[1],
    );
    expect(selectActiveMembership(memberships, "20000000-0000-0000-0000-000000000099")).toBe(
      memberships[0],
    );
    expect(selectActiveMembership([], memberships[0]!.organizationId)).toBeUndefined();
  });

  it("recognizes only declared public session states", () => {
    expect(isApplicationSession({ status: "unauthenticated" })).toBe(true);
    expect(isApplicationSession({ status: "authenticated" })).toBe(false);
    expect(
      isApplicationSession({
        status: "authenticated",
        user: { id: "user-a", email: "user@example.invalid" },
        memberships,
        selectedMembership: memberships[0],
      }),
    ).toBe(true);
    expect(isApplicationSession({ status: "error" })).toBe(false);
    expect(isApplicationSession(null)).toBe(false);
  });

  it("denies cross-origin mutations and clears opaque cookies on sign-out", () => {
    const crossOrigin = new Request("https://tract.example/api/auth/logout", {
      headers: { origin: "https://attacker.example" },
    });
    expect(() => assertSameOrigin(crossOrigin)).toThrow("Cross-origin session mutation denied");
    expect(() => assertSameOrigin(new Request("https://tract.example/api/auth/logout"))).toThrow(
      "Cross-origin session mutation denied",
    );

    const sameOrigin = new Request("https://tract.example/api/auth/logout", {
      headers: { origin: "https://tract.example" },
    });
    const headers = clearApplicationSessionCookies(sameOrigin);
    const cookies = headers.getSetCookie();
    expect(cookies).toHaveLength(3);
    expect(cookies.every((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes("SameSite=Lax"))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes("Secure"))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes("Max-Age=0"))).toBe(true);
  });
});
