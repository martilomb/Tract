import { invariant } from "./errors";

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
  recordPath: readonly string[];
  fieldMappings: Readonly<Record<string, readonly string[]>>;
}

export interface SapConnectorContract {
  readonly adapterType: "sap";
  readonly supportedTransport: "odata" | "rest" | "file-drop";
  readonly credentialReference: string;
  readonly mappingConfigurationId: string;
  readonly reconciliationKeyFields: readonly string[];
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
