# Tract delivery status

## Current stage

Production-shaped local implementation is complete through Milestone 9's locally executable scope. Hosted activation remains fail-closed and approval-gated.

## Completed

- Preserved the supplied artifacts and original extracted prototype under `.project/prototype`, then promoted the working application to the repository root.
- Standardized the Node/pnpm toolchain, lockfile, lint/format/type/test/build gates, GitHub Actions workflow, environment validation, health endpoint, structured request logging, and Cloudflare Worker build.
- Added organization-bound schema, composite tenant constraints, memberships/additive grants, validated RLS helpers and policies, audit/outbox infrastructure, and cross-tenant denial tests.
- Added DCR master data, configurable workflow and permissions, immutable history, assignments/comments, private-attachment model, and a functional labelled demonstration workflow.
- Added the exact-decimal recovery ledger with versioned policies, effective rates, immutable signed volume, correction/duplicate/over-recovery handling, reproducible results, and tests.
- Added CSV/Excel staging, declarative mappings, SHA-256 idempotency, generic HTTPS REST and SAP extension contracts, reconciliation schema, and a functional local operations screen.
- Confirmed and implemented the three ingestion domains: replaceable IHS/AFS vehicle volume, evidence-backed contract/DCR documents, and customer-mapped SAP/ERP operational data.
- Added immutable original/raw records, versioned canonical candidates, a permissioned Received→Staged→Validated→Mapped→Reviewed→Approved→Posted lifecycle, exception/reconciliation records, and a unique economic-event posting registry.
- Added OEM/program/model/plant/region/part mappings; effective parts-per-vehicle, take-rate, allocation, and eligible-volume policies; immutable vehicle-production and ERP records; and ledger references that prevent external production totals from becoming part volume without approved contract rules.
- Added document text/table/field candidates with page/table evidence, confidence/warnings, correction reasons, reviewer identity, immutable approval, and controlled destination postings.
- Added versioned forecast provenance, secure document lifecycle/provider/review interfaces, deterministic local extraction, safe reports/evidence manifests, approvals, and notification outbox.
- Removed external runtime assets and unsupported affirmative claims, repaired responsive navigation/overflow, and documented architecture, accounting, security, imports, operations, deployment, costs, assumptions, milestones, and release controls.
- Verified current official Supabase and Cloudflare pricing; the estimated low-usage pilot base is about US$30/month before excluded services. Nothing paid has been activated.

## Verification

- `pnpm check`: passed after the ingestion clarification (format, zero-warning lint, TypeScript, 24 tests across 7 files, and production build).
- Unit/domain tests cover recovery precision/boundaries, authorization, DCR transitions, imports/Excel parsing, configuration, connectors, documents, and reports.
- Production dependency audit: no known vulnerabilities.
- Browser smoke: all nine routes render from the local server with the demonstration boundary visible and no console warnings/errors.
- Functional browser checks: DCR transition, staged CSV validation/fingerprint, and mobile navigation passed.
- Updated Operations browser check: all three confirmed ingestion domains, shared lifecycle, vehicle-volume staging, valid/rejected row traceability, and source-of-truth warning passed with no console warnings/errors.
- Responsive browser check at 390 x 844: no horizontal document overflow; the primary navigation is available from the labelled mobile menu.
- Cloudflare Worker production build: passed without connecting an account.
- Repository scan found no committed secret material or unresolved source TODO/FIXME markers; retained references to the original prototype are limited to durable provenance/safeguard documentation.
- Supabase pgTAP/RLS tests, including the new ingestion schema and cross-tenant/unapproved-ledger denial checks, are authored and wired into CI but cannot be executed until a local container runtime or approved Supabase project is available.

## Genuine activation blockers

- A production Supabase project/credentials or an available local container runtime is required to apply migrations, generate project database types, and execute the pgTAP/RLS suite.
- A Cloudflare account/project and secret values are required for a staging deployment and real log/health verification.
- Production IHS/AFS, SAP/ERP, document extraction/scanning, notification, and SSO providers require approved specifications, credentials, licensing/data-processing terms, and any paid-service approval.
- Authoritative customer rules remain required for FX, settlement rounding, claim eligibility, clawbacks/profit release, retention, residency, RPO/RTO, notification recipients, and formal compliance commitments. Existing behavior remains versioned/configurable or disabled.
- No Git remote is connected; this remains intentionally pending product-owner approval.

## Exact next step

After the product owner provides an approved Supabase project or local container runtime, apply all three migrations to a fresh database, run `supabase db lint` and `supabase test db`, generate database types, then execute authenticated anonymous/cross-tenant and ingestion-lifecycle browser tests. Provider adapters remain disabled until their individual specifications, licensing, samples, and credentials are approved. A Git remote can be connected only after explicit approval.
