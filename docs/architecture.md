# Architecture

## Runtime boundaries

Tract uses one React/TanStack Start application deployed as a Cloudflare module Worker. Supabase provides Postgres, Auth, private Storage, and migration-managed database functions. The browser may call Supabase only with the public anonymous key and an end-user access token; Row Level Security remains authoritative. Privileged storage signing, connector credentials, extraction, notification delivery, and administrative jobs remain server-side.

```text
Browser -> TanStack Start / Cloudflare Worker -> Supabase Auth + Postgres + private Storage
                                              -> approved connector or extraction adapters
```

The canonical business rules live in `src/domain`. Database constraints and RLS enforce invariants and atomic persistence; they do not introduce a second financial formula. Server-only adapters live in `src/server`. Customer configuration is declarative and versioned, never executable.

## Mandatory invariants

- `organization_id` is the tenant boundary on every owned record.
- Cross-tenant foreign keys are rejected with composite constraints.
- Authorization is enforced by RLS or a server operation that rechecks the same organization and scope.
- Source volume events, completed calculations, DCR history, extraction approvals, and audit events are append-only.
- Money, rates, volume, and derived results use decimal strings in TypeScript and Postgres `numeric`; floating-point arithmetic is not accepted in accounting code.
- Policy and workflow changes are versioned and effective-dated. Existing calculation runs retain the exact configuration and source-event references used.
- Over-recovery remains visible but has no automatic accounting disposition.

## Data modules

- Identity: organizations, memberships, roles, additive permission grants.
- Master data: departments, technical teams, OEMs, suppliers, contacts, programs, parts.
- DCR: versioned workflow, assignments, comments, part links, attachments, transition history, notifications.
- Recovery: accruals, effective-dated rates, immutable volume events, calculation runs, lines, results.
- Forecasts: provider-neutral versions, lines, provenance, actual-versus-scenario projection.
- Imports: connector registry, versioned mappings, content fingerprint, staging rows, validation, reconciliation.
- Documents: private versions, hashes, extraction jobs, field evidence, manual corrections, immutable approval.
- Controls: audit events, notification outbox, report manifests, approvals.

## Demo boundary

The visually labelled local demo imports `src/lib/demo-data.ts`. Production builds fail closed unless demo mode is explicitly enabled; the synthetic routes are not presented as persisted records or live integrations. Connecting the real repository requires an approved Supabase project, applied migrations, passing RLS tests, generated database types, and an authenticated request context.
