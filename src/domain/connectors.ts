import { invariant } from "./errors";
import type { IngestionDomain, IngestionTransport } from "./ingestion";

export interface ProviderAdapterContract {
  readonly providerKey: string;
  readonly domain: IngestionDomain;
  readonly transports: readonly IngestionTransport[];
  readonly mappingConfigurationId: string;
  readonly credentialReference?: string;
  readonly schedule?: string;
  readonly manualRunsEnabled: boolean;
  readonly activationState: "disabled" | "configured" | "approved";
  readonly documentationReference?: string;
  readonly licenseReference?: string;
  readonly sampleReference?: string;
}

export function validateProviderAdapter(
  contract: ProviderAdapterContract,
): ProviderAdapterContract {
  invariant(
    /^[a-z0-9][a-z0-9_-]*$/.test(contract.providerKey),
    "Provider key is invalid",
    "invalid_provider_key",
  );
  invariant(
    contract.transports.length > 0,
    "At least one transport is required",
    "connector_transport_required",
  );
  invariant(
    contract.mappingConfigurationId.trim() !== "",
    "Mapping configuration is required",
    "connector_mapping_required",
  );
  if (contract.credentialReference) {
    invariant(
      /^[a-z][a-z0-9+.-]*:\/\//.test(contract.credentialReference),
      "Credential must be an opaque secret-store reference",
      "invalid_credential_reference",
    );
  }
  if (contract.activationState === "approved") {
    invariant(
      Boolean(contract.documentationReference),
      "Approved connector requires interface documentation",
      "connector_documentation_required",
    );
    invariant(
      Boolean(contract.sampleReference),
      "Approved connector requires approved test samples",
      "connector_sample_required",
    );
    if (contract.providerKey === "ihs" || contract.providerKey === "afs") {
      invariant(
        Boolean(contract.licenseReference),
        "IHS/AFS activation requires a license reference",
        "connector_license_required",
      );
    }
    if (contract.transports.some((transport) => transport === "rest" || transport === "odata")) {
      invariant(
        Boolean(contract.credentialReference),
        "API activation requires a credential reference",
        "connector_credential_required",
      );
    }
  }
  return contract;
}

export interface RestConnectorConfiguration {
  id: string;
  organizationId: string;
  version: number;
  endpoint: string;
  method: "GET" | "POST";
  allowedHosts: readonly string[];
  credentialReference?: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  maxResponseBytes: number;
  maxRecords: number;
  recordPath: readonly string[];
  fieldMappings: Readonly<Record<string, readonly string[]>>;
}

export interface SapConnectorContract {
  readonly adapterType: "sap";
  readonly providerKey: string;
  readonly supportedTransports: readonly ("odata" | "rest" | "file_drop")[];
  readonly credentialReference: string;
  readonly mappingConfigurationId: string;
  readonly reconciliationKeyFields: readonly string[];
  readonly recordTypes: readonly (
    | "shipment"
    | "purchase_order"
    | "invoice"
    | "material_document"
    | "cost"
    | "correction"
    | "reversal"
    | "return"
  )[];
  readonly manualRunsEnabled: boolean;
  readonly schedule?: string;
}

export function validateRestConnector(
  configuration: RestConnectorConfiguration,
): RestConnectorConfiguration {
  const url = new URL(configuration.endpoint);
  invariant(url.protocol === "https:", "REST connectors require HTTPS", "insecure_connector");
  invariant(
    configuration.allowedHosts.includes(url.hostname),
    "REST connector host is not allowlisted",
    "connector_host_denied",
    { hostname: url.hostname },
  );
  invariant(
    configuration.timeoutMs >= 1000 && configuration.timeoutMs <= 30000,
    "Connector timeout must be between 1 and 30 seconds",
    "invalid_connector_timeout",
  );
  invariant(
    Number.isInteger(configuration.maxRetries) &&
      configuration.maxRetries >= 0 &&
      configuration.maxRetries <= 5,
    "Connector retries must be an integer from 0 to 5",
    "invalid_connector_retries",
  );
  invariant(
    Number.isInteger(configuration.retryBackoffMs) &&
      configuration.retryBackoffMs >= 100 &&
      configuration.retryBackoffMs <= 10000,
    "Connector retry backoff must be between 100 ms and 10 seconds",
    "invalid_connector_backoff",
  );
  invariant(
    Number.isInteger(configuration.maxResponseBytes) &&
      configuration.maxResponseBytes >= 1024 &&
      configuration.maxResponseBytes <= 25 * 1024 * 1024,
    "Connector response limit must be between 1 KiB and 25 MiB",
    "invalid_connector_response_limit",
  );
  invariant(
    Number.isInteger(configuration.maxRecords) &&
      configuration.maxRecords >= 1 &&
      configuration.maxRecords <= 100000,
    "Connector record limit must be between 1 and 100,000",
    "invalid_connector_record_limit",
  );
  invariant(
    Object.keys(configuration.fieldMappings).length > 0,
    "Connector requires field mappings",
    "connector_mapping_required",
  );
  for (const path of [configuration.recordPath, ...Object.values(configuration.fieldMappings)]) {
    invariant(
      path.length > 0 && path.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment)),
      "Connector paths accept property names only",
      "invalid_connector_path",
    );
  }
  return configuration;
}

function valueAtPath(source: unknown, path: readonly string[]): unknown {
  let current = source;
  for (const segment of path) {
    invariant(
      current !== null && typeof current === "object" && !Array.isArray(current),
      "Connector response path does not exist",
      "connector_path_missing",
      { path: path.join(".") },
    );
    current = (current as Readonly<Record<string, unknown>>)[segment];
  }
  return current;
}

export function mapRestResponse(
  response: unknown,
  configuration: RestConnectorConfiguration,
): readonly Readonly<Record<string, string>>[] {
  validateRestConnector(configuration);
  const records = valueAtPath(response, configuration.recordPath);
  invariant(
    Array.isArray(records),
    "Connector record path must resolve to an array",
    "invalid_connector_response",
  );
  return Object.freeze(
    records.map((record) =>
      Object.freeze(
        Object.fromEntries(
          Object.entries(configuration.fieldMappings).map(([target, path]) => {
            const value = valueAtPath(record, path);
            invariant(
              value === null || ["string", "number", "boolean"].includes(typeof value),
              "Mapped connector values must be scalar",
              "invalid_connector_value",
              { target },
            );
            return [target, value === null ? "" : String(value)];
          }),
        ),
      ),
    ),
  );
}
