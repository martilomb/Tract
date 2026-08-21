# Cloudflare deployment decision

## Decision

Use TanStack Start's current official Cloudflare Vite plugin path. The earlier Nitro module proof built successfully, but TanStack documents the Nitro/Vite integration as under active development and lists `@cloudflare/vite-plugin` as the official Cloudflare setup. The application was moved before infrastructure existed, so no runtime or financial rule depends on Nitro.

Primary references:

- https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/

## Local validation

`pnpm build` must produce the Cloudflare Worker bundle without credentials. `pnpm preview` is the local production-shape smoke target. This validates compilation and routing only; it is not a deployed infrastructure test.

## Production activation gate

1. User approves or supplies Cloudflare and Supabase accounts/projects.
2. Set the public Supabase URL and anonymous key in the controlled build environment.
3. Add the privileged Supabase key as an encrypted Worker secret. Do not use Wrangler `vars` for secrets.
4. Apply migrations in a staging Supabase project and run `supabase db lint` plus `supabase test db`.
5. Run `pnpm check`, anonymous/authenticated route tests, cross-tenant RLS tests, and signed-document tests.
6. Upload a Worker version, smoke it on a non-production hostname, review logs, then promote it.
7. Configure spend alerts, quotas, log sampling, backup/restore evidence, and incident ownership.

No login, deploy, secret creation, account provisioning, custom domain, or paid tier has been activated.
