import { describe, expect, it } from "vitest";

import { activateConfiguration, type VersionedConfiguration } from "@/domain/configuration";
import {
  mapRestResponse,
  validateConnectorAdministrator,
  validateConnectorConfiguration,
  validateProviderAdapter,
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
  retryBackoffMs: 250,
  maxResponseBytes: 1024 * 1024,
  maxRecords: 1000,
  recordPath: ["data", "events"],
  fieldMappings: { externalId: ["id"], units: ["quantity"] },
};

describe("connector and configuration boundaries", () => {
  const administratorDraft = {
    id: "connector-draft",
    organizationId: "org-a",
    name: "Staging ERP",
    providerKey: "customer_erp",
    systemType: "sap_erp" as const,
    environment: "staging" as const,
    domain: "erp" as const,
    transports: ["odata"] as const,
    endpoint: "https://erp.example.test/odata",
    allowedHosts: ["erp.example.test"],
    authenticationMethod: "oauth2" as const,
    deltaBehavior: "Changed records since the approved delta token",
    timeZone: "UTC",
    sourceObjects: ["Shipments"],
    dataCategories: ["shipment", "cost", "correction", "reversal", "return"] as const,
    fieldMappings: [
      {
        source: "Material",
        destination: "part_number",
        required: true,
        operation: "trim" as const,
      },
      {
        source: "Quantity",
        destination: "signed_quantity",
        required: true,
        operation: "decimal" as const,
      },
    ],
    reconciliationRules: "Source quantity and value totals must match by posting period",
    maximumRetries: 3,
    owner: "Enterprise integration owner",
  };

  it("validates safe connector drafts while keeping live tests blocked without runtime inputs", () => {
    const result = validateConnectorConfiguration(administratorDraft);
    expect(result.configurationValid).toBe(true);
    expect(result.liveTestAvailable).toBe(false);
    expect(result.checks.at(-1)).toMatchObject({ state: "blocked" });
  });

  it("denies non-admin and cross-tenant connector administration", () => {
    expect(() =>
      validateConnectorAdministrator({
        draftOrganizationId: "org-a",
        activeOrganizationId: "org-a",
        role: "full_view",
      }),
    ).toThrow(/administrators/);
    expect(() =>
      validateConnectorAdministrator({
        draftOrganizationId: "org-b",
        activeOrganizationId: "org-a",
        role: "administrator",
      }),
    ).toThrow(/Cross-tenant/);
  });

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

  it("keeps IHS and AFS disabled until license, samples, documentation, and credentials exist", () => {
    expect(() =>
      validateProviderAdapter({
        providerKey: "ihs",
        domain: "vehicle_volume",
        transports: ["rest"],
        mappingConfigurationId: "map-1",
        manualRunsEnabled: true,
        activationState: "approved",
      }),
    ).toThrow(/documentation/i);
    expect(
      validateProviderAdapter({
        providerKey: "afs",
        domain: "vehicle_volume",
        transports: ["csv", "excel"],
        mappingConfigurationId: "map-1",
        manualRunsEnabled: true,
        activationState: "disabled",
      }).activationState,
    ).toBe("disabled");
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
