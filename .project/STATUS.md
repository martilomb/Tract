# Tract delivery status

## Current stage

All useful Milestone 1–9 production work is complete. The approved GitHub repository is connected and the existing `main` history is published without rewriting it. Automatic GitHub Actions execution is disabled because the account's hosted Actions credits are exhausted; the verified workflow remains available for manual execution after credits reset. The project-scoped Supabase MCP server is now registered and OAuth-authenticated, but the running task predates that tool registration and therefore has not inspected or changed staging. Hosted activation remains fail-closed, modular, and approval-gated.

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

- Full local quality gate passed: formatting, zero-warning lint, TypeScript, 47 tests across 13 files, and production Worker build.
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

## Genuine activation blockers

- A fresh Codex task is required to load the newly registered and OAuth-authenticated Supabase MCP tools. The linked project must then be confirmed as non-production before applying any missing migrations, generating project database types, or executing the staging pgTAP/RLS/Auth/Storage/restore suite.
- A Cloudflare account/project and controlled secret values are required for a staging deployment and hosted log/health verification.
- Production IHS/AFS, SAP/ERP, document extraction/scanning, notification, and SSO providers require approved specifications, credentials, licensing/data-processing terms, and any paid-service approval.
- Authoritative customer rules remain required for FX, settlement rounding, claim eligibility, clawbacks/profit release, retention, residency, RPO/RTO, notification recipients, and formal compliance commitments. Existing behavior remains versioned/configurable or disabled.
- The GitHub remote is active. No Supabase or Cloudflare deployment, provider connection, credential, or paid service has been activated. The complete input checklist is [docs/external-activation.md](../docs/external-activation.md).

## Exact next step

Start a fresh Codex task in this repository so it loads the authenticated Supabase MCP server, then confirm project `qflwjgmrspmcyghzinwz` is staging, inspect and apply only missing migrations, run hosted database validation, generate types, and execute Auth/Storage/ingestion checks before staging deployment. Activate IHS/AFS, SAP, scanning/extraction, email, SSO, or other providers independently only after the corresponding specifications, samples, licensing/security approval, credentials, and reconciliation evidence in [docs/external-activation.md](../docs/external-activation.md) are complete.
