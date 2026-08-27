import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { selectActiveMembership, type ApplicationSession } from "../domain/application-session";
import { loadActiveMemberships } from "./repositories/memberships.server";
import { createPublicAuthClient, createUserDataClient } from "./supabase.server";

const ACCESS_COOKIE = "tract_access";
const REFRESH_COOKIE = "tract_refresh";
const ORGANIZATION_COOKIE = "tract_organization";

const credentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(1024),
});

type ResolvedSession = Readonly<{
  session: ApplicationSession;
  headers: Headers;
  client?: SupabaseClient<Database>;
}>;

export type AuthenticatedApplicationContext = Readonly<{
  session: Extract<ApplicationSession, { status: "authenticated" }>;
  headers: Headers;
  client: SupabaseClient<Database>;
}>;

export type ApplicationUserContext = Readonly<{
  session: Exclude<ApplicationSession, { status: "unauthenticated" }>;
  headers: Headers;
  client: SupabaseClient<Database>;
}>;

function parseCookies(request: Request): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>();
  for (const segment of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 1) continue;
    const name = segment.slice(0, separator).trim();
    try {
      cookies.set(name, decodeURIComponent(segment.slice(separator + 1).trim()));
    } catch {
      // An invalid cookie is ignored and cannot become session authority.
    }
  }
  return cookies;
}

function cookieSecurity(request: Request): string {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

function sessionCookie(request: Request, name: string, value: string, maxAge?: number): string {
  const lifetime = maxAge === undefined ? "" : `; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${lifetime}${cookieSecurity(request)}`;
}

function organizationCookie(request: Request, organizationId: string): string {
  return sessionCookie(request, ORGANIZATION_COOKIE, organizationId);
}

function responseHeaders(): Headers {
  return new Headers({ "cache-control": "no-store, private", vary: "Cookie" });
}

function clearSessionCookies(request: Request, headers: Headers): void {
  headers.append("set-cookie", sessionCookie(request, ACCESS_COOKIE, "", 0));
  headers.append("set-cookie", sessionCookie(request, REFRESH_COOKIE, "", 0));
  headers.append("set-cookie", sessionCookie(request, ORGANIZATION_COOKIE, "", 0));
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new Error("Cross-origin session mutation denied");
  }
}

async function resolveAuthorizedSession(input: {
  request: Request;
  environment: Record<string, string | undefined>;
  accessToken: string;
  user: { id: string; email?: string };
  headers: Headers;
  requestedOrganizationId?: string;
}): Promise<ResolvedSession> {
  const client = createUserDataClient({
    environment: input.environment,
    accessToken: input.accessToken,
  });
  const memberships = await loadActiveMemberships(client, input.user.id);
  const user = Object.freeze({ id: input.user.id, email: input.user.email ?? "" });
  const selectedMembership = selectActiveMembership(memberships, input.requestedOrganizationId);

  if (!selectedMembership) {
    return {
      headers: input.headers,
      session: Object.freeze({ status: "organization_required", user, memberships: [] as const }),
      client,
    };
  }

  return {
    headers: input.headers,
    session: Object.freeze({
      status: "authenticated",
      user,
      memberships,
      selectedMembership,
    }),
    client,
  };
}

export async function resolveApplicationSession(
  request: Request,
  environment: Record<string, string | undefined>,
): Promise<ResolvedSession> {
  const headers = responseHeaders();
  const cookies = parseCookies(request);
  let accessToken = cookies.get(ACCESS_COOKIE);
  const refreshToken = cookies.get(REFRESH_COOKIE);
  const requestedOrganizationId = cookies.get(ORGANIZATION_COOKIE);
  if (!accessToken && !refreshToken) {
    return { headers, session: Object.freeze({ status: "unauthenticated" }) };
  }

  const authClient = createPublicAuthClient(environment);
  let userResult = accessToken ? await authClient.auth.getUser(accessToken) : undefined;

  if ((!userResult || userResult.error || !userResult.data.user) && refreshToken) {
    const refreshResult = await authClient.auth.refreshSession({ refresh_token: refreshToken });
    if (!refreshResult.error && refreshResult.data.session && refreshResult.data.user) {
      accessToken = refreshResult.data.session.access_token;
      headers.append(
        "set-cookie",
        sessionCookie(
          request,
          ACCESS_COOKIE,
          refreshResult.data.session.access_token,
          refreshResult.data.session.expires_in,
        ),
      );
      headers.append(
        "set-cookie",
        sessionCookie(request, REFRESH_COOKIE, refreshResult.data.session.refresh_token),
      );
      userResult = { data: { user: refreshResult.data.user }, error: null };
    }
  }

  if (!accessToken || !userResult || userResult.error || !userResult.data.user) {
    clearSessionCookies(request, headers);
    return { headers, session: Object.freeze({ status: "unauthenticated" }) };
  }

  return resolveAuthorizedSession({
    request,
    environment,
    accessToken,
    user: userResult.data.user,
    headers,
    requestedOrganizationId,
  });
}

export async function requireApplicationUserContext(
  request: Request,
  environment: Record<string, string | undefined>,
): Promise<ApplicationUserContext> {
  const resolved = await resolveApplicationSession(request, environment);
  if (resolved.session.status === "unauthenticated" || !resolved.client) {
    throw new Error("Authentication required");
  }
  return {
    session: resolved.session,
    headers: resolved.headers,
    client: resolved.client,
  };
}

export async function requireAuthenticatedApplicationContext(
  request: Request,
  environment: Record<string, string | undefined>,
): Promise<AuthenticatedApplicationContext> {
  const resolved = await resolveApplicationSession(request, environment);
  if (resolved.session.status !== "authenticated" || !resolved.client) {
    throw new Error("Active organization required");
  }
  return {
    session: resolved.session,
    headers: resolved.headers,
    client: resolved.client,
  };
}

export async function signInApplicationSession(
  request: Request,
  environment: Record<string, string | undefined>,
  payload: unknown,
): Promise<ResolvedSession> {
  assertSameOrigin(request);
  const credentials = credentialsSchema.parse(payload);
  const authClient = createPublicAuthClient(environment);
  const result = await authClient.auth.signInWithPassword(credentials);
  if (result.error || !result.data.session || !result.data.user) {
    throw new Error("Email/password sign-in failed");
  }

  const headers = responseHeaders();
  headers.append(
    "set-cookie",
    sessionCookie(
      request,
      ACCESS_COOKIE,
      result.data.session.access_token,
      result.data.session.expires_in,
    ),
  );
  headers.append(
    "set-cookie",
    sessionCookie(request, REFRESH_COOKIE, result.data.session.refresh_token),
  );

  return resolveAuthorizedSession({
    request,
    environment,
    accessToken: result.data.session.access_token,
    user: result.data.user,
    headers,
  });
}

export async function selectApplicationOrganization(
  request: Request,
  environment: Record<string, string | undefined>,
  organizationId: string,
): Promise<ResolvedSession> {
  assertSameOrigin(request);
  const resolved = await resolveApplicationSession(request, environment);
  if (resolved.session.status !== "authenticated") return resolved;
  const selectedMembership = resolved.session.memberships.find(
    (membership) => membership.organizationId === organizationId,
  );
  if (!selectedMembership) throw new Error("Organization access denied");
  resolved.headers.append("set-cookie", organizationCookie(request, organizationId));
  return {
    headers: resolved.headers,
    session: Object.freeze({ ...resolved.session, selectedMembership }),
    client: resolved.client,
  };
}

export function clearApplicationSessionCookies(request: Request): Headers {
  assertSameOrigin(request);
  const headers = responseHeaders();
  clearSessionCookies(request, headers);
  return headers;
}

export async function signOutApplicationSession(
  request: Request,
  environment: Record<string, string | undefined>,
): Promise<Headers> {
  const headers = clearApplicationSessionCookies(request);
  const cookies = parseCookies(request);
  const accessToken = cookies.get(ACCESS_COOKIE);
  const refreshToken = cookies.get(REFRESH_COOKIE);
  if (!accessToken || !refreshToken) return headers;

  const authClient = createPublicAuthClient(environment);
  const sessionResult = await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionResult.error) throw new Error("The Auth session could not be revoked");
  const signOutResult = await authClient.auth.signOut({ scope: "local" });
  if (signOutResult.error) throw new Error("The Auth session could not be revoked");
  return headers;
}
