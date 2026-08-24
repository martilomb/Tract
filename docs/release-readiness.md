# Release readiness and handoff protocol

This checklist defines what a Tract delivery handoff may claim. Passing the current increment's tests, or exhausting credential-free work, does not by itself make the product final, complete, production-ready, or accepted.

## Required outcome label

Every delivery handoff uses exactly one of these labels:

1. **INCREMENT COMPLETE** — a bounded milestone or increment is implemented and verified, but approved scope remains.
2. **BLOCKED / EXTERNAL ACTIVATION REQUIRED** — required work cannot continue without a specifically named external input, credential, decision, licensed provider, or environment. The handoff must distinguish blocked work from other useful approved work that can still continue.
3. **RELEASE CANDIDATE READY** — all approved product scope and acceptance criteria in the delivery plan, including Milestone 10, are implemented; no known release-blocking defects or nonfunctional placeholder controls remain; the complete defined verification matrix passes; remaining items are only explicitly listed customer/provider activation or product-owner acceptance.
4. **FINAL ACCEPTED** — the product owner has reviewed the release candidate, required real-provider/customer-environment validation is complete or formally waived, and the product owner explicitly accepts it.

Do not substitute synonyms for the label. “Tested everything” means the documented representative, risk-based matrix passed; it never claims exhaustive proof.

## Release-candidate evidence matrix

Current assessment (24 August 2026): **INCREMENT COMPLETE** at published commit `caa7302`, with a verified Contracts/DCR workflow increment in progress and approved scope remaining. Product-owner acceptance is explicitly not granted: Operations/Settings corrections, the complete revised verification matrix, and a new localhost review remain open. The earlier credential-free Milestone 10 pass claim is superseded; release-candidate rows remain unchecked until the entire approved A–G correction and documented risk-based matrix pass.

A **RELEASE CANDIDATE READY** handoff must report every row below with exact evidence, counts, and any approved deferral.

- [ ] Approved requirements and traceability are implemented, or deferred with the approved reason.
- [ ] Core user journeys and every route/control work, respect permissions, and contain no unexplained dead action or mock/live claim.
- [ ] Database migrations, schema, RLS, Auth, Storage, and tenant-boundary tests pass in the named staging environment.
- [ ] Recovery math/ledger, contracts, DCRs, parts/programs, imports, connectors, document review, reporting, and account/admin workflows pass their defined tests.
- [ ] Format, lint, type, unit, integration, pgTAP, and build results are recorded with exact counts.
- [ ] Desktop and 390 px mobile critical-role workflows pass; keyboard, accessibility, console, and network-error results are recorded.
- [ ] Dependency, security, secret, database-advisor, and response-header checks pass or have an approved exception.
- [ ] Staging deployment and hosted verification status are explicit.
- [ ] Known defects, residual risks, external activation items, and untested real-provider behavior are explicit.
- [ ] Git is clean and the exact commit and synchronization status are recorded.

## Real-provider truth boundary

SAP/ERP, IHS/AFS, document scanning/extraction, email/notification delivery, and SSO behavior remains **unverified** until tested against approved specifications, licensing, samples, credentials, policies, and customer environments. Local synthetic or configuration validation proves only the bounded adapter, mapping, security, and fail-closed behavior; it does not prove a live provider integration.
