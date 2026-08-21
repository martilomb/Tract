import { describe, expect, it } from "vitest";

import { activateConfiguration, type VersionedConfiguration } from "@/domain/configuration";
import {
  mapRestResponse,
  validateRestConnector,
  type RestConnectorConfiguration,
} from "@/domain/connectors";

const connector: RestConnectorConfiguration = {
  id: "connector-1",
  organizationId: "org-a",
  version: 1,
  endpoint: "https://volume.example.test/api/events",
  method: "GET",
  allowedHosts: ["volume.example.test"],
  credentialReference: "secret://volume-provider",
  timeoutMs: 5000,
  maxRetries: 3,
  recordPath: ["data", "events"],
  fieldMappings: { externalId: ["id"], units: ["quantity"] },
};

describe("connector and configuration boundaries", () => {
  it("maps allowlisted HTTPS responses without executable mapping expressions", () => {
    expect(validateRestConnector(connector)).toBe(connector);
    expect(mapRestResponse({ data: { events: [{ id: "one", quantity: 12 }] } }, connector)).toEqual(
      [{ externalId: "one", units: "12" }],
    );
  });

  it("rejects insecure or non-allowlisted endpoints", () => {
    expect(() =>
      validateRestConnector({ ...connector, endpoint: "http://volume.example.test/api" }),
    ).toThrow(/HTTPS/);
    expect(() =>
      validateRestConnector({ ...connector, endpoint: "https://other.example.test/api" }),
    ).toThrow(/allowlisted/);
  });

  it("activates only sequential, effective-dated, same-tenant configuration", () => {
    const current: VersionedConfiguration<{ scale: number }> = {
      id: "p1",
      organizationId: "org-a",
      kind: "recovery_policy",
      version: 1,
      effectiveFrom: "2026-01-01",
      status: "active",
      payload: { scale: 2 },
    };
    const draft: VersionedConfiguration<{ scale: number }> = {
      ...current,
      id: "p2",
      version: 2,
      effectiveFrom: "2027-01-01",
      status: "draft",
      payload: { scale: 4 },
    };
    const activated = activateConfiguration({ draft, current, actorCanManage: true });
    expect(activated.active).toMatchObject({ status: "active", supersedesId: "p1" });
    expect(activated.superseded?.status).toBe("superseded");
    expect(() =>
      activateConfiguration({
        draft: { ...draft, organizationId: "org-b" },
        current,
        actorCanManage: true,
      }),
    ).toThrow(/Cross-tenant/);
  });
});
