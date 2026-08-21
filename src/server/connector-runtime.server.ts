import { DomainError, invariant } from "@/domain/errors";
import {
  mapRestResponse,
  validateRestConnector,
  type RestConnectorConfiguration,
} from "@/domain/connectors";

export interface ConnectorCredentialResolver {
  resolveHeaders(reference: string): Promise<Readonly<Record<string, string>>>;
}

export interface RestConnectorRunResult {
  connectorId: string;
  configurationVersion: number;
  fetchedAt: string;
  attempts: number;
  status: number;
  responseBytes: number;
  records: readonly Readonly<Record<string, string>>[];
}

export interface RestConnectorRuntimeDependencies {
  fetcher?: typeof fetch;
  credentialResolver?: ConnectorCredentialResolver;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
}

const FORBIDDEN_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function validateCredentialHeaders(headers: Readonly<Record<string, string>>): Headers {
  const validated = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();
    invariant(
      /^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(normalizedName) &&
        !FORBIDDEN_REQUEST_HEADERS.has(normalizedName) &&
        !normalizedName.startsWith("cf-") &&
        !normalizedName.startsWith("x-forwarded-"),
      "Credential resolver returned a forbidden request header",
      "connector_credential_header_denied",
      { header: name },
    );
    invariant(
      !value.includes("\r") && !value.includes("\n"),
      "Credential resolver returned an invalid request header value",
      "connector_credential_header_invalid",
      { header: name },
    );
    validated.set(name, value);
  }
  return validated;
}

async function readBoundedBody(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    invariant(
      Number.isFinite(parsedLength) && parsedLength >= 0 && parsedLength <= maximumBytes,
      "Connector response exceeds the configured byte limit",
      "connector_response_too_large",
      { maximumBytes },
    );
  }

  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      invariant(
        total <= maximumBytes,
        "Connector response exceeds the configured byte limit",
        "connector_response_too_large",
        { maximumBytes },
      );
      chunks.push(part.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function requestBody(input: unknown): BodyInit | undefined {
  if (input === undefined) return undefined;
  const serialized = JSON.stringify(input);
  invariant(
    new TextEncoder().encode(serialized).byteLength <= 1024 * 1024,
    "Connector request body exceeds 1 MiB",
    "connector_request_too_large",
  );
  return serialized;
}

export async function executeRestConnector(
  input: {
    configuration: RestConnectorConfiguration;
    requestBody?: unknown;
    signal?: AbortSignal;
  },
  dependencies: RestConnectorRuntimeDependencies = {},
): Promise<RestConnectorRunResult> {
  const configuration = validateRestConnector(input.configuration);
  const endpoint = new URL(configuration.endpoint);
  invariant(
    endpoint.username === "" && endpoint.password === "" && endpoint.hash === "",
    "Connector endpoints cannot contain credentials or fragments",
    "invalid_connector_endpoint",
  );
  invariant(
    configuration.method === "POST" || input.requestBody === undefined,
    "GET connectors cannot include a request body",
    "invalid_connector_request_body",
  );

  const headers = new Headers({ accept: "application/json" });
  if (configuration.credentialReference) {
    invariant(
      dependencies.credentialResolver,
      "Connector credential resolver is required",
      "connector_credential_resolver_required",
    );
    const credentialHeaders = validateCredentialHeaders(
      await dependencies.credentialResolver.resolveHeaders(configuration.credentialReference),
    );
    credentialHeaders.forEach((value, name) => headers.set(name, value));
  }
  const body = requestBody(input.requestBody);
  if (body !== undefined) headers.set("content-type", "application/json");

  const fetcher = dependencies.fetcher ?? fetch;
  const sleep =
    dependencies.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;

  for (let attempt = 1; attempt <= configuration.maxRetries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort("connector_timeout"),
      configuration.timeoutMs,
    );
    const abortFromCaller = () => controller.abort(input.signal?.reason);
    input.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetcher(endpoint, {
        method: configuration.method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
      });
      invariant(
        response.status < 300 || response.status >= 400,
        "Connector redirects are not permitted",
        "connector_redirect_denied",
        { status: response.status },
      );
      if (!response.ok) {
        if (isTransientStatus(response.status) && attempt <= configuration.maxRetries) {
          await sleep(configuration.retryBackoffMs * 2 ** (attempt - 1));
          continue;
        }
        throw new DomainError(
          "Connector returned an unsuccessful response",
          "connector_http_error",
          {
            status: response.status,
            attempts: attempt,
          },
        );
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      invariant(
        contentType.includes("application/json") || contentType.includes("+json"),
        "Connector response must use a JSON content type",
        "invalid_connector_content_type",
      );
      const bytes = await readBoundedBody(response, configuration.maxResponseBytes);
      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new DomainError("Connector response is not valid JSON", "invalid_connector_json");
      }
      const records = mapRestResponse(payload, configuration);
      invariant(
        records.length <= configuration.maxRecords,
        "Connector response exceeds the configured record limit",
        "connector_record_limit_exceeded",
        { maximumRecords: configuration.maxRecords },
      );
      return Object.freeze({
        connectorId: configuration.id,
        configurationVersion: configuration.version,
        fetchedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
        attempts: attempt,
        status: response.status,
        responseBytes: bytes.byteLength,
        records,
      });
    } catch (error) {
      if (error instanceof DomainError) throw error;
      lastError = error;
      if (input.signal?.aborted || attempt > configuration.maxRetries) break;
      await sleep(configuration.retryBackoffMs * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  throw new DomainError("Connector request failed", "connector_request_failed", {
    attempts: configuration.maxRetries + 1,
    errorName: lastError instanceof Error ? lastError.name : "UnknownError",
  });
}
