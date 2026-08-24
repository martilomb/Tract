import { invariant } from "./errors";
import type { IngestionDomain, IngestionTransport } from "./ingestion";

export type ConnectorEnvironment = "development" | "staging" | "production";
export type ConnectorAuthenticationMethod =
  "none" | "basic" | "api_key" | "oauth2" | "client_certificate" | "managed_identity";
export type ConnectorDataCategory =
  | "shipment"
  | "purchase_order"
  | "invoice"
  | "material_document"
  | "cost"
  | "correction"
  | "reversal"
  | "return";
export type MappingOperation =
  "copy" | "trim" | "uppercase" | "lowercase" | "date_iso" | "decimal" | "integer" | "constant";

export interface ConnectorFieldMapping {
  source: string;
  destination: string;
  required: boolean;
  operation: MappingOperation;
  constantValue?: string;
}

export interface ConnectorDraft {
  id: string;
  organizationId: string;
  name: string;
  providerKey: string;
  systemType: "file" | "api" | "sap_erp" | "volume_provider";
  environment: ConnectorEnvironment;
  domain: IngestionDomain;
  transports: readonly IngestionTransport[];
  endpoint?: string;
  allowedHosts: readonly string[];
  authenticationMethod: ConnectorAuthenticationMethod;
  credentialReference?: string;
  schedule?: string;
  deltaBehavior: string;
  timeZone: string;
  sourceObjects: readonly string[];
  dataCategories: readonly ConnectorDataCategory[];
  fieldMappings: readonly ConnectorFieldMapping[];
  reconciliationRules: string;
  maximumRetries: number;
  owner: string;
  documentationReference?: string;
  sampleReference?: string;
  licenseReference?: string;
}

export interface ConnectorValidationResult {
  configurationValid: boolean;
  liveTestAvailable: boolean;
  summary: string;
  checks: readonly { label: string; state: "passed" | "blocked"; detail: string }[];
}

const APPROVED_OPERATIONS = new Set<MappingOperation>([
  "copy",
  "trim",
  "uppercase",
  "lowercase",
  "date_iso",
  "decimal",
  "integer",
  "constant",
]);

export function validateConnectorAdministrator(input: {
  draftOrganizationId: string;
  activeOrganizationId: string;
  role: "administrator" | "full_view" | "member";
}): void {
  invariant(
    input.draftOrganizationId === input.activeOrganizationId,
    "Cross-tenant connector administration is denied",
    "connector_cross_tenant_denied",
  );
  invariant(
    input.role === "administrator",
    "Only organization administrators can manage data connections",
    "connector_admin_required",
  );
}

export function validateConnectorFieldMappings(
  mappings: readonly ConnectorFieldMapping[],
): readonly ConnectorFieldMapping[] {
  invariant(
    mappings.length > 0,
    "At least one field mapping is required",
    "connector_mapping_required",
  );
  const destinations = new Set<string>();
  for (const mapping of mappings) {
    invariant(
      mapping.source.trim() !== "",
      "Mapping source is required",
      "connector_mapping_invalid",
    );
    invariant(
      /^[a-z][a-z0-9_]*$/.test(mapping.destination),
      "Canonical destination must use a supported field name",
      "connector_mapping_invalid",
    );
    invariant(
      APPROVED_OPERATIONS.has(mapping.operation),
      "Mapping operation is not an approved declarative operation",
      "connector_mapping_operation_denied",
    );
    invariant(
      !destinations.has(mapping.destination),
      "Each canonical destination may be mapped only once",
      "connector_mapping_duplicate",
    );
    invariant(
      mapping.operation !== "constant" || Boolean(mapping.constantValue?.trim()),
      "Constant mappings require a value",
      "connector_mapping_invalid",
    );
    destinations.add(mapping.destination);
  }
  return mappings;
}

export function validateConnectorDraft(draft: ConnectorDraft): ConnectorDraft {
  invariant(
    draft.organizationId.trim() !== "",
    "Organization is required",
    "connector_org_required",
  );
  invariant(draft.name.trim() !== "", "Connection name is required", "connector_name_required");
  invariant(
    /^[a-z0-9][a-z0-9_-]*$/.test(draft.providerKey),
    "Provider key is invalid",
    "invalid_provider_key",
  );
  invariant(
    draft.transports.length > 0,
    "Select at least one transport",
    "connector_transport_required",
  );
  invariant(draft.timeZone.trim() !== "", "Time zone is required", "connector_timezone_required");
  invariant(draft.owner.trim() !== "", "Responsible owner is required", "connector_owner_required");
  invariant(
    Number.isInteger(draft.maximumRetries) &&
      draft.maximumRetries >= 0 &&
      draft.maximumRetries <= 5,
    "Retry attempts must be an integer from 0 to 5",
    "invalid_connector_retries",
  );
  if (draft.systemType === "api" || draft.systemType === "sap_erp") {
    invariant(
      Boolean(draft.endpoint),
      "API and SAP/ERP connections require an HTTPS endpoint",
      "connector_endpoint_required",
    );
    const url = new URL(draft.endpoint!);
    invariant(url.protocol === "https:", "Connections require HTTPS", "insecure_connector");
    invariant(
      url.username === "" && url.password === "" && url.hash === "",
      "Endpoint cannot contain credentials or fragments",
      "invalid_connector_endpoint",
    );
    invariant(
      draft.allowedHosts.includes(url.hostname),
      "Endpoint host is not allowlisted",
      "connector_host_denied",
    );
  }
  if (draft.credentialReference) {
    invariant(
      /^[a-z][a-z0-9+.-]*:\/\//.test(draft.credentialReference),
      "Credentials must be represented by an opaque secret-store reference",
      "invalid_credential_reference",
    );
  }
  if (draft.systemType === "sap_erp") {
    invariant(
      draft.dataCategories.length > 0,
      "Select at least one SAP/ERP data category",
      "connector_data_category_required",
    );
  }
  invariant(
    draft.sourceObjects.length > 0,
    "At least one source object is required",
    "connector_source_required",
  );
  validateConnectorFieldMappings(draft.fieldMappings);
  return draft;
}

export function validateConnectorConfiguration(draft: ConnectorDraft): ConnectorValidationResult {
  validateConnectorDraft(draft);
  const apiTransport = draft.transports.some(
    (transport) => transport === "rest" || transport === "odata",
  );
  const missingCredential =
    apiTransport && draft.authenticationMethod !== "none" && !draft.credentialReference;
  const missingSpecification = apiTransport && !draft.documentationReference;
  const liveTestAvailable = !missingCredential && !missingSpecification;
  const checks: ConnectorValidationResult["checks"] = [
    {
      label: "Tenant and owner",
      state: "passed",
      detail: `${draft.organizationId} · ${draft.owner}`,
    },
    {
      label: "Transport boundary",
      state: "passed",
      detail: apiTransport
        ? "HTTPS endpoint and host allowlist are valid"
        : "File validation path is available",
    },
    {
      label: "Declarative mapping",
      state: "passed",
      detail: `${draft.fieldMappings.length} field mappings use approved operations only`,
    },
    {
      label: "Live connection test",
      state: liveTestAvailable ? "passed" : "blocked",
      detail: missingCredential
        ? "Blocked: add an opaque runtime secret reference; never paste a credential here"
        : missingSpecification
          ? "Blocked: attach the approved provider/interface specification"
          : "Configuration is eligible for a bounded server-side test",
    },
  ];
  return Object.freeze({
    configurationValid: true,
    liveTestAvailable,
    summary: liveTestAvailable
      ? "Configuration validation passed; a bounded server-side test may be requested"
      : "Safe configuration validation passed; live testing remains fail-closed",
    checks: Object.freeze(checks),
  });
}

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
