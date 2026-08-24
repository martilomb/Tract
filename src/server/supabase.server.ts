import { createClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { readServerEnvironment } from "./env.server";

export function createUserDataClient(input: {
  environment: Record<string, string | undefined>;
  accessToken: string;
}) {
  const environment = readServerEnvironment(input.environment);
  return createClient<Database>(environment.VITE_SUPABASE_URL, environment.VITE_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
  });
}

export function createServiceDataClient(environmentSource: Record<string, string | undefined>) {
  const environment = readServerEnvironment(environmentSource);
  if (!environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this privileged operation");
  }
  return createClient<Database>(
    environment.VITE_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    },
  );
}
