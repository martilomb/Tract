# Release readiness and handoff protocol

This checklist defines what a Tract delivery handoff may claim. Passing the current increment's tests, or exhausting credential-free work, does not by itself make the product final, complete, production-ready, or accepted.

## Required outcome label

Every delivery handoff uses exactly one of these labels:

1. **INCREMENT COMPLETE** — a bounded milestone or increment is implemented and verified, but approved scope remains.
2. **BLOCKED / EXTERNAL ACTIVATION REQUIRED** — required work cannot continue without a specifically named external input, credential, decision, licensed provider, or environment. The handoff must distinguish blocked work from other useful approved work that can still continue.
3. **RELEASE CANDIDATE READY** — all approved product scope and acceptance criteria in the delivery plan, including Milestone 10, are implemented; no known release-blocking defects or nonfunctional placeholder controls remain; the complete defined verification matrix passes; remaining items are only explicitly listed customer/provider activation or product-owner acceptance.
4. **FINAL ACCEPTED** — the product owner has reviewed the release candidate, required real-provider/customer-environment validation is complete or formally waived, and the product owner explicitly accepts it.

Do not substitute synonyms for the label. “Tested everything” means the documented representative, risk-based matrix passed; it never claims exhaustive proof.

## Production-backed acceptance rule

Synthetic fixtures, browser-local persistence, isolated schema/RLS coverage, domain tests, and visually complete pages are foundation or demonstration evidence only. They cannot justify **RELEASE CANDIDATE READY**. Every enabled production workflow must use authenticated, tenant-scoped Supabase persistence and pass the matching P1–P10 gate in `docs/release-checklist.md`.

A workflow is production-backed only when an authorized non-demo user performs it through the real application, reloads, retrieves the same persisted result, and sees consistent permitted data in every applicable detail, chart, table, export, provenance record, and audit event. The defined slice evidence must include database/RLS, domain, frontend integration, non-demo browser E2E, loading/empty/error, refresh persistence, permissions, audit, desktop/mobile/keyboard/accessibility, and clean console/network results. Enabled no-ops and browser-only simulations are release blockers; unavailable behavior is absent or disabled with its exact activation input.

User testing follows the automated gates and evaluates workflow fitness, terminology, usefulness, and visual quality. It does not replace automated persistence, authorization, reconciliation, accessibility, or runtime-defect coverage.

## Release-candidate evidence matrix

Current assessment (28 August 2026): **INCREMENT COMPLETE** for P1 application spine. The approved non-production Auth boundary and four runtime-only role identities now prove real non-demo Supabase session/organization resolution, invitation acceptance and replay denial, membership administration, seat and last-admin enforcement, scoped and cross-tenant RLS denial, audit, reload persistence, organization switching, TOTP/AAL2, same-origin mutation, and remote logout revocation at desktop and 390 px. P2 Contracts/atomic recovery activation and all downstream production slices remain open; product-owner acceptance is explicitly not granted. Synthetic fixtures, browser-local state, schema-only tests, and polished demonstration routes do not satisfy release-candidate rows. Paid session timeout/single-session and leaked-password controls remain explicitly unactivated pending an approved Supabase Pro-plan spend decision.

A **RELEASE CANDIDATE READY** handoff must report every row below with exact evidence, counts, and any approved deferral.

- [ ] All production slices P1–P10 pass their workflow definition and verification gates; any remaining demo-only path is visibly isolated and excluded from production claims.
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
