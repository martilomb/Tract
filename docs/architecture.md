# Architecture

## Runtime boundaries

Tract uses one React/TanStack Start application deployed as a Cloudflare module Worker. Supabase provides Postgres, Auth, private Storage, and migration-managed database functions. The browser may call Supabase only with the public anonymous key and an end-user access token; Row Level Security remains authoritative. Privileged storage signing, connector credentials, extraction, notification delivery, and administrative jobs remain server-side.

```text
Browser -> TanStack Start / Cloudflare Worker -> Supabase Auth + Postgres + private Storage
                                              -> approved connector or extraction adapters
```

The canonical business rules live in `src/domain`. Database constraints and RLS enforce invariants and atomic persistence; they do not introduce a second financial formula. Server-only adapters live in `src/server`. Customer configuration is declarative and versioned, never executable.

All analytical workspaces and exports consume one canonical analysis snapshot rather than re-aggregating route-local values. In demonstration mode, the snapshot starts from deterministic part-level facts, allocates exact model-year values, and rolls them up part → program → OEM. In an authenticated workspace, the same interface must be populated from tenant-scoped persisted query results. Scope, organization, as-of time, currency, calculation version, forecast version, source version, provenance, chart series, record table, alerts, and export rows travel together so a filter cannot silently change only one surface.

## Mandatory invariants

- `organization_id` is the tenant boundary on every owned record.
- Cross-tenant foreign keys are rejected with composite constraints.
- Authorization is enforced by RLS or a server operation that rechecks the same organization and scope.
- Source volume events, completed calculations, DCR history, extraction approvals, and audit events are append-only.
- Original source objects and raw ingestion records are immutable. Mapping creates separate versioned candidates; only reviewed and approved candidates can post.
- Money, rates, volume, and derived results use decimal strings in TypeScript and Postgres `numeric`; floating-point arithmetic is not accepted in accounting code.
- Presentation aggregates never use fixed target anchors or proportional normalization. Gross under- and over-recovery are summed separately so opposing records cannot hide exposure; remaining recovery is additive by record.
- Policy and workflow changes are versioned and effective-dated. Existing calculation runs retain the exact configuration and source-event references used.
- Over-recovery remains visible but has no automatic accounting treatment.
- Programs, model years, parts/revisions, DCRs, and recovery agreements are independent canonical records joined by tenant-bound relationships. Recovery activation and calculation require an effective approved agreement.
- Agreement activation is one database transaction. The administrator-only `app.activate_recovery_agreement` operation locks the agreement, validates approved/effective evidence, controlled program/part links, DCR state when present, currency, and every draft accrual, then activates the agreement and valid accruals together. Any invalid row aborts the transaction; callers cannot directly set an agreement Active.
- The client domain mirrors that fail-closed boundary for the labelled synthetic workflow: `activateRecoveryAgreement` is a pure all-or-nothing transition requiring reviewed evidence, controlled compatible program/model-year/part links, confirmed volume basis, approved half-even rounding boundary, versioned forecast assumptions, and Approved/Active state for every optional linked DCR. A validation error returns no active record and leaves the explicit draft available for correction; it never claims a database posting.
- Vehicle-production, ERP, and document sources remain independent. Related values reconcile; no source overwrites another and one economic event cannot post twice.

## Ingestion boundary

```text
IHS / AFS files or APIs ─┐
Private contract/DCR docs ├─> Received -> Staged -> Validated -> Mapped
SAP / ERP files or APIs ──┘        -> Reviewed -> Approved -> Posted
                                      │
                                      ├─> vehicle production / forecast versions
                                      ├─> ERP transactions
                                      └─> human-confirmed document terms

Approved contract/accrual volume basis + approved mapping rules
                                      └─> immutable eligible volume event -> recovery ledger
```

Raw records, normalized candidates, exceptions, approvals, and postings are separate tables. The ledger has no dependency on a provider-specific payload, so another ERP, vehicle-volume provider, or extraction service can be added without changing the recovery formula.

## Data modules

- Identity: organizations, memberships, roles, additive permission grants.
- Master data: departments, technical teams, OEMs, vehicle makes/models/architectures, suppliers, contacts, programs/model years, parts/revisions, provider identifiers, governed proposals/aliases/merge provenance, many-to-many applications and commodities, plants, regions, and effective part-per-vehicle/take-rate/allocation rules.
- DCR: versioned evidence-gated workflow, assignments, comments, program/model-year/part links, attachments, agreement links, transition history, notifications.
- Recovery agreements: private originals/versions, linked programs/model years/parts/DCRs, eligible-volume basis, effective rates, approval, activation, expiry, supersession, and audit history.
- Recovery: agreement-bound accruals, effective-dated rates, immutable volume events, calculation runs, lines, results.
- Forecasts: provider-neutral versions, lines, provenance, actual-versus-scenario projection.
- Ingestion: provider-neutral adapters, stored original objects, immutable raw records, versioned candidates, exceptions, reconciliation, approvals, economic-event posting registry.
- Vehicle volume: IHS/AFS-neutral actual/forecast/revised/scenario records, dimensional mappings, immutable forecast versions, relevant part links.
- ERP: canonical shipments/transactions/cost values with complete original-value provenance and no inferred recoverability.
- Documents: private versions, hashes, text/tables, extraction jobs, page/table field evidence, confidence/warnings, corrections, immutable approval and destination postings.
- Controls: audit events, notification outbox, destination-at-delivery adapters, report manifests, approvals.

Materiality rules are tenant-bound, versioned, effective-dated, permissioned, and auditable, with optional program or agreement scope. Connector test runs persist only configuration/synthetic/live test metadata and sanitized outcomes; live execution remains fail-closed until the approved interface specification and runtime secret reference exist.

Recovery replay canonicalizes event/rate ordering and hashes the complete terms, policy version, rates, and source events before calculation. Identical economic inputs therefore reproduce the same SHA-256 and exact ordered lines even if an upstream collection returns records in a different order.

## Demo boundary

The visually labelled local demo imports `src/lib/demo-data.ts`. Production builds fail closed unless demo mode is explicitly enabled; the synthetic routes are not presented as persisted records or live integrations. The approved non-production staging project has the migration ledger, RLS tests, and generated types, but leaving demo mode still requires approved hosted Auth identities, environment configuration, and permission-aware browser validation.
