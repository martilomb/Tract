# Tract delivery status

## Current stage

Milestones 1–9 infrastructure and local domain foundations are complete, but a product-owner demonstration review on 24 August 2026 opened Milestone 10 before enterprise acceptance. The approved correction separates Programs, Parts, DCRs, and Contracts; adds a dedicated contract workspace; replaces confusing, conflated, or non-functional interactions; and requires scalable selectors, tables, and traceable drill-downs. The approved GitHub repository is connected and published without rewriting history. Automatic GitHub Actions execution remains disabled because hosted Actions credits are exhausted. Supabase CLI `2.111.0` is authenticated and linked to confirmed non-production staging project `qflwjgmrspmcyghzinwz`; unchanged migrations `202608210001`–`003`, the exact remote ledger, database lint, RLS/ingestion pgTAP, Auth service boundary, private Storage boundary, and generated types are verified. Hosted Auth workflow configuration, document scanning/signed-read behavior, restore evidence, Cloudflare deployment, and paid or external providers remain fail-closed and approval-gated.

## Completed

- Preserved the supplied artifacts and original extracted prototype under `.project/prototype`, then promoted the working application to the repository root.
- Standardized the Node/pnpm toolchain, lockfile, lint/format/type/test/build gates, GitHub Actions workflow, environment validation, health endpoint, structured request logging, and Cloudflare Worker build.
- Added organization-bound schema, composite tenant constraints, memberships/additive grants, validated RLS helpers and policies, audit/outbox infrastructure, and cross-tenant denial tests.
- Added DCR master data, configurable workflow and permissions, immutable history, assignments/comments, private-attachment model, and a functional labelled demonstration workflow.
- Added the exact-decimal recovery ledger with versioned policies, effective rates, immutable signed volume, correction/duplicate/over-recovery handling, reproducible results, and tests.
- Added CSV/Excel staging, declarative mappings, SHA-256 idempotency, generic HTTPS REST and SAP extension contracts, reconciliation schema, and a functional local operations screen.
- Added the generic server-side REST runtime with runtime-only credential resolution, exact host allowlisting, redirect denial, abort timeout, bounded transient retries/backoff, JSON/byte/record limits, and secret-free results.
- Confirmed and implemented the three ingestion domains: replaceable IHS/AFS vehicle volume, evidence-backed contract/DCR documents, and customer-mapped SAP/ERP operational data.
- Added immutable original/raw records, versioned canonical candidates, a permissioned Received→Staged→Validated→Mapped→Reviewed→Approved→Posted lifecycle, exception/reconciliation records, and a unique economic-event posting registry.
- Added OEM/program/model/plant/region/part mappings; effective parts-per-vehicle, take-rate, allocation, and eligible-volume policies; immutable vehicle-production and ERP records; and ledger references that prevent external production totals from becoming part volume without approved contract rules.
- Added document text/table/field candidates with page/table evidence, confidence/warnings, correction reasons, reviewer identity, immutable approval, and controlled destination postings.
- Added versioned forecast provenance, secure document lifecycle/provider/review interfaces, deterministic local extraction, safe reports/evidence manifests, approvals, and notification outbox.
- Added clean-scan/document-hash gating, required evidence and correction reasons, a complete synthetic manual-review/posting-plan path, canonical recovery replay hashes, explicit partial-import/retry/cancel/reconciliation controls, and destination-at-delivery notification adapters.
- Routed the built Worker through the hardened custom server entry with CSP/isolation/frame/referrer/permissions/cache controls, validated request ids, structured request events, and catastrophic SSR normalization.
- Pinned the database CLI in CI, added the production dependency audit, weekly dependency/Actions updates, CI concurrency, static migration contract tests, and a build-entry regression test.
- Removed external runtime assets and unsupported affirmative claims, repaired responsive navigation/overflow, and documented architecture, accounting, security, imports, operations, deployment, costs, assumptions, milestones, and release controls.
- Verified current official Supabase and Cloudflare pricing; the estimated low-usage pilot base is about US$30/month before excluded services. Nothing paid has been activated.

## Verification

- Full local quality gate passed: formatting, zero-warning lint, TypeScript, 48 tests across 13 files, and production Worker build.
- Tests cover recovery precision/boundaries/canonical replay, authorization, DCR transitions, imports/Excel/partial approval/retry/cancellation, configuration, ingestion reconciliation, connector runtime security, scanned document intake/review/posting, notification delivery, response hardening, migration invariants, and runtime configuration.
- Production dependency audit: no known vulnerabilities.
- Browser smoke under the hardened Worker entry: all nine routes render with the demonstration boundary visible and no console warnings/errors.
- Functional browser checks: DCR transition, staged CSV validation/fingerprint, and mobile navigation passed.
- Updated Operations browser check: all three confirmed ingestion domains, shared lifecycle, vehicle-volume staging, valid/rejected row traceability, synthetic document field/evidence/reason review, and a three-action controlled posting plan passed with no console warnings/errors.
- Responsive browser check at 390 x 844: no horizontal document overflow; the primary navigation is available from the labelled mobile menu.
- Accessibility sampling found no unnamed controls, duplicate ids, positive tab order, missing image alternatives, or missing table captions; 67 rendered main-content text samples pass WCAG AA contrast after the primary-action color correction. Full manual assistive-technology/browser certification remains external.
- Live local health response verified fail-closed `503` behavior plus no-store, CSP, frame denial, opener isolation, and malformed request-id replacement. Bundle inspection verified the hardened entry is present in `dist/server/index.js`.
- Static migration tests pass for order, transaction wrapping, RLS coverage, security-definer `search_path`, critical immutability/posting guards, and credential-shaped text. Cloudflare Worker production build passes without connecting an account.
- Static migration tests also enforce the private document bucket, size limit, absence of direct authenticated object policies, and server-signed access contract.
- The named `tract-recovery-platform-staging` Cloudflare environment declares every required Supabase binding without values, retains structured logging, and passes a real no-upload Wrangler bundle dry run at 2.86 MiB uncompressed and 604 KiB gzip.
- Repository scan found no committed secret material or unresolved source TODO/FIXME markers; retained references to the original prototype are limited to durable provenance/safeguard documentation.
- GitHub Actions successfully created a fresh Supabase stack, applied all three migrations, passed database lint, and passed both pgTAP suites. Its first RLS run exposed an incorrect test expectation: PostgreSQL denied a member's role update by matching zero rows rather than raising an exception. The corrected regression verifies that the role remains unchanged, and both hosted CI jobs pass at commit `27929e4`.
- Authenticated staging preflight on 24 August 2026 verified the exact project URL, an empty application migration ledger/schema, zero Auth users and Storage objects, no application policies, and no pre-migration security or performance advisor findings. The local migration SHA-256 values still match the verified handoff, and the six static migration contract tests pass.
- Supabase CLI `2.111.0` dry-run listed only unchanged repository migrations `202608210001_foundation.sql`, `202608210002_product.sql`, and `202608210003_ingestion_domains.sql`; the subsequent push applied only those files. CLI and API inspection both report the exact three remote ledger versions and names in order.
- Linked staging contains 51 public tables with RLS enabled, 95 public policies, 22 application functions, 80 public triggers, the required immutability/transition/posting triggers, and the private `tract-private-documents` bucket with a 25 MiB limit and no direct authenticated object policy. Auth and Storage remain empty after validation.
- Linked database lint passes at warning-as-failure. The unchanged repository pgTAP RLS suite passes 7 assertions, the ingestion suite passes 10 assertions, and the private Storage RLS suite passes 2 assertions; each ran transactionally and left no seeded Auth, tenant, ingestion, volume, or object records.
- Supabase Auth and Storage service health pass using runtime-only credentials. Direct authenticated Storage insertion is denied and object listing exposes no private rows. Hosted Auth currently reports self-signup enabled even though the repository configuration disables it, so invitation/reset/MFA/session and multi-organization browser flows are not accepted as complete.
- Post-migration security advisors are clean. Performance advisors report 230 unindexed foreign-key notices, 10 unused-index notices on the empty database, 4 Auth RLS initialization-plan warnings, and 32 multiple-permissive-policy warnings. These are recorded for measured hardening; no unapproved fourth migration or additive-scope policy redesign was introduced during the exact-version activation.
- Project database types were generated from linked staging and wired into both user-scoped and service-role Supabase clients.

## Genuine activation blockers

- Milestone 10 is approved local work and is not blocked by external credentials. Its full add/change/remove/retain decisions and acceptance criteria are recorded in [DELIVERY_PLAN.md](./DELIVERY_PLAN.md). Enterprise UX acceptance is not complete until that milestone passes product-owner review.

- Hosted Auth configuration requires approved site/redirect URLs, invitation and password-reset behavior, MFA/session policy, multi-organization rules, and a controlled configuration change that disables the currently enabled public signup path. Browser acceptance needs invited test identities supplied through the approved credential path.
- End-to-end private document upload, malware scan, short-lived signed read, expiry, and replacement require an approved scanning/extraction provider, sanitized documents, credentials, retention rules, and paid-service approval where applicable. The database and Storage denial boundary is verified, but unsupported provider behavior remains disabled.
- Performance advisor findings require workload-informed index selection and an explicit review of intentional additive RLS policies before a separately traceable migration; empty-database unused-index notices are not sufficient evidence for removal.
- A Cloudflare account/project and controlled secret values are required for a staging deployment and hosted log/health verification.
- Production IHS/AFS, SAP/ERP, document extraction/scanning, notification, and SSO providers require approved specifications, credentials, licensing/data-processing terms, and any paid-service approval.
- Authoritative customer rules remain required for FX, settlement rounding, claim eligibility, clawbacks/profit release, retention, residency, RPO/RTO, notification recipients, and formal compliance commitments. Existing behavior remains versioned/configurable or disabled.
- The GitHub remote and non-production Supabase staging database are active. No production resource, Cloudflare deployment, external provider connection, or paid service has been activated. The complete input checklist is [docs/external-activation.md](../docs/external-activation.md).

## Exact next step

Execute Milestone 10 in dependency order: establish the canonical Program/Part/DCR/Contract UX boundaries and dedicated Contracts workspace; then correct DCR and Operations workflows; then add hierarchical selectors, scalable tables, traceable drill-downs, terminology, imagery, and account behavior; finally run product-owner browser acceptance and the full regression gate. Hosted Auth, document-provider, restore, Cloudflare, and live-provider activation can proceed independently when their inputs in [docs/external-activation.md](../docs/external-activation.md) become available.
