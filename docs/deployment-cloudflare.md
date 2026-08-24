# Cloudflare deployment decision

## Decision

Use TanStack Start's current official Cloudflare Vite plugin path. The earlier Nitro module proof built successfully, but TanStack documents the Nitro/Vite integration as under active development and lists `@cloudflare/vite-plugin` as the official Cloudflare setup. The application was moved before infrastructure existed, so no runtime or financial rule depends on Nitro.

Primary references:

- https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/

## Local validation

`pnpm build` must produce the Cloudflare Worker bundle without real credentials. Wrangler points to `src/server.ts`, which wraps TanStack's default handler with structured request events, correlation ids, error normalization, cache controls, and browser security headers. The runtime configuration test and bundle inspection prevent a silent fallback to the framework's unhardened default entry. `pnpm preview` is the local production-shape smoke target. This validates compilation and routing only; it is not a deployed infrastructure test.

The committed `staging` Wrangler environment has the distinct Worker name `tract-recovery-platform-staging`, production-shaped logging, and fail-closed declarations for all three Supabase bindings. `pnpm cloudflare:dry-run:staging` builds the application and validates the real upload bundle without uploading it. The no-upload dry run passed on 24 August 2026 at 2.86 MiB uncompressed and 604 KiB gzip. Build-time `VITE_*` values and Worker bindings still need to be supplied by the controlled staging environment; no placeholders are committed.

## Production activation gate

1. User approves or supplies Cloudflare and Supabase accounts/projects.
2. Set the public Supabase URL and anonymous key in the controlled build environment and as staging Worker bindings.
3. Add the privileged Supabase key as an encrypted staging Worker secret. Do not use Wrangler `vars` for secrets.
4. Apply migrations in a staging Supabase project with pinned CLI `2.111.0` and run `supabase db lint` plus `supabase test db`.
5. Run `pnpm check`, anonymous/authenticated route tests, cross-tenant RLS tests, and signed-document tests.
6. Run `pnpm cloudflare:dry-run:staging`, then upload a staging Worker version, smoke it on a non-production hostname, and review logs before any promotion.
7. Configure spend alerts, quotas, log sampling, backup/restore evidence, and incident ownership.

No login, deploy, secret creation, account provisioning, custom domain, or paid tier has been activated.

The consolidated account, provider, security, and product inputs are in [external-activation.md](external-activation.md).
