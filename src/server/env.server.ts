import { z } from "zod";

const serverEnvironmentSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  TRACT_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function readServerEnvironment(
  source: Record<string, string | undefined>,
): ServerEnvironment {
  return serverEnvironmentSchema.parse(source);
}

export function inspectServerEnvironment(source: Record<string, string | undefined>) {
  const result = serverEnvironmentSchema.safeParse(source);
  return Object.freeze({
    configured: result.success,
    serviceRoleConfigured: Boolean(source.SUPABASE_SERVICE_ROLE_KEY),
    issues: result.success
      ? []
      : result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
  });
}
