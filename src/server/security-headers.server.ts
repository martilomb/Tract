const SAFE_REQUEST_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$/;

export function resolveRequestId(candidate: string | null, generate: () => string): string {
  return candidate !== null && SAFE_REQUEST_ID.test(candidate) ? candidate : generate();
}

function connectionSources(requestUrl: URL, supabaseUrl?: string): readonly string[] {
  const sources = new Set(["'self'"]);
  if (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") {
    sources.add(`${requestUrl.protocol === "https:" ? "wss:" : "ws:"}//${requestUrl.host}`);
  }
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      if (url.protocol === "https:") {
        sources.add(url.origin);
        sources.add(`wss://${url.host}`);
      }
    } catch {
      // Environment validation reports invalid values; response hardening stays fail-safe.
    }
  }
  return [...sources];
}

export function buildContentSecurityPolicy(input: {
  requestUrl: URL;
  supabaseUrl?: string;
}): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectionSources(input.requestUrl, input.supabaseUrl).join(" ")}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ];
  if (input.requestUrl.protocol === "https:") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function applySecurityHeaders(input: {
  response: Response;
  request: Request;
  requestId: string;
  supabaseUrl?: string;
}): Response {
  const headers = new Headers(input.response.headers);
  const requestUrl = new URL(input.request.url);
  headers.set(
    "content-security-policy",
    buildContentSecurityPolicy({ requestUrl, supabaseUrl: input.supabaseUrl }),
  );
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("origin-agent-cluster", "?1");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set("x-request-id", input.requestId);
  if (requestUrl.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  const contentType = headers.get("content-type")?.toLowerCase() ?? "";
  if (
    contentType.includes("text/html") ||
    requestUrl.pathname.startsWith("/api/") ||
    input.response.status >= 400
  ) {
    headers.set("cache-control", "no-store");
  }
  return new Response(input.response.body, {
    status: input.response.status,
    statusText: input.response.statusText,
    headers,
  });
}
