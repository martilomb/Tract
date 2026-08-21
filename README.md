# Tract

Tract is an enterprise recovery-accounting workspace for automotive suppliers. It combines organization-scoped DCR workflows, immutable volume events, versioned recovery policies, decimal-safe calculations, forecasts, documents, imports, and auditable reports.

## Local development

Requirements: Node.js 22.12 or newer and pnpm 11.19.

1. Copy `.env.example` to `.env.local`.
2. Keep `VITE_TRACT_DEMO_MODE=true` for the visibly labelled local demonstration dataset, or configure a Supabase project whose migrations and RLS tests have been applied.
3. Run `pnpm install`, then `pnpm dev`.
4. Run the full release gate with `pnpm check`.

No paid service, remote repository, or production data source is configured by this repository. The application must fail closed when production configuration is absent; demo mode is explicit and visibly identified.

## Architecture and operations

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/security.md`](docs/security.md)
- [`docs/operations.md`](docs/operations.md)
- [`docs/assumptions.md`](docs/assumptions.md)
- [`docs/accounting.md`](docs/accounting.md)
- [`docs/imports.md`](docs/imports.md)
- [`docs/deployment-cloudflare.md`](docs/deployment-cloudflare.md)
- [`docs/costs.md`](docs/costs.md)
- [`docs/milestones.md`](docs/milestones.md)
- [`docs/release-checklist.md`](docs/release-checklist.md)

Database migrations live in `supabase/migrations`. Core accounting and authorization decisions are centralized in `src/domain` and mirrored by database constraints and RLS policies.
