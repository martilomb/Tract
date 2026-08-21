import { describe, expect, it, vi } from "vitest";

import { executeRestConnector } from "@/server/connector-runtime.server";
import type { RestConnectorConfiguration } from "@/domain/connectors";

const configuration: RestConnectorConfiguration = {
  id: "volume-provider",
  organizationId: "org-a",
  version: 4,
  endpoint: "https://volume.example.test/v1/events",
  method: "GET",
  allowedHosts: ["volume.example.test"],
  credentialReference: "secret://volume-provider",
  timeoutMs: 1000,
  maxRetries: 2,
  retryBackoffMs: 100,
  maxResponseBytes: 4096,
  maxRecords: 2,
  recordPath: ["events"],
  fieldMappings: { externalId: ["id"], units: ["units"] },
};

describe("REST connector runtime", () => {
  it("resolves credentials at runtime, retries transient responses, and returns bounded mapped data", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ events: [{ id: "A-1", units: 15 }] }, { status: 200 }),
      );
    const sleep = vi.fn(async () => undefined);
    const result = await executeRestConnector(
      { configuration },
      {
        fetcher,
        sleep,
        now: () => new Date("2026-08-21T12:00:00Z"),
        credentialResolver: {
          resolveHeaders: async (reference) => {
            expect(reference).toBe("secret://volume-provider");
            return { Authorization: "Bearer test-secret" };
          },
        },
      },
    );

    expect(result).toMatchObject({
      connectorId: "volume-provider",
      configurationVersion: 4,
      fetchedAt: "2026-08-21T12:00:00.000Z",
      attempts: 2,
      status: 200,
      records: [{ externalId: "A-1", units: "15" }],
    });
    expect(sleep).toHaveBeenCalledWith(100);
    const request = fetcher.mock.calls[1]?.[1];
    expect(new Headers(request?.headers).get("authorization")).toBe("Bearer test-secret");
    expect(request?.redirect).toBe("manual");
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  it("denies redirects and never follows them", async () => {
    await expect(
      executeRestConnector(
        { configuration: { ...configuration, credentialReference: undefined } },
        {
          fetcher: async () =>
            new Response(null, {
              status: 302,
              headers: { location: "https://other.example.test/collect" },
            }),
        },
      ),
    ).rejects.toMatchObject({ code: "connector_redirect_denied" });
  });

  it("rejects oversized and over-record responses before mapping them onward", async () => {
    await expect(
      executeRestConnector(
        {
          configuration: {
            ...configuration,
            credentialReference: undefined,
            maxResponseBytes: 1024,
          },
        },
        {
          fetcher: async () =>
            new Response("{}", {
              status: 200,
              headers: { "content-type": "application/json", "content-length": "2048" },
            }),
        },
      ),
    ).rejects.toMatchObject({ code: "connector_response_too_large" });

    await expect(
      executeRestConnector(
        { configuration: { ...configuration, credentialReference: undefined, maxRecords: 1 } },
        {
          fetcher: async () =>
            Response.json({
              events: [
                { id: "A-1", units: 1 },
                { id: "A-2", units: 2 },
              ],
            }),
        },
      ),
    ).rejects.toMatchObject({ code: "connector_record_limit_exceeded" });
  });

  it("rejects unsafe credential headers and endpoint-embedded credentials", async () => {
    await expect(
      executeRestConnector(
        { configuration },
        { credentialResolver: { resolveHeaders: async () => ({ Host: "attacker.test" }) } },
      ),
    ).rejects.toMatchObject({ code: "connector_credential_header_denied" });

    await expect(
      executeRestConnector({
        configuration: {
          ...configuration,
          endpoint: "https://user:password@volume.example.test/v1/events",
        },
      }),
    ).rejects.toMatchObject({ code: "invalid_connector_endpoint" });
  });
});
