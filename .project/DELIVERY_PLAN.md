# Tract delivery baseline and plan

## Baseline

- The workspace contains seven supplied artifacts and no Git repository or remote.
- The Lovable archive is a TanStack Start / React 19 / TypeScript / Tailwind prototype. It builds and type-checks, but it has no authentication, database, Supabase configuration, migrations, API, storage, tests, CI, deployment configuration, or operational documentation.
- All programs, parts, DCRs, forecasts, audit windows, approvals, AFS status, contacts, and accounting results are deterministic mock data generated in the client. Several primary controls are visual-only. The only working exports are the part CSV and browser print for the generated DCR.
- Useful visual direction to preserve: Tract navy/blue branding, the overview hierarchy, OEM/program/part drill-down, recovery status vocabulary, filtering, DCR document presentation, recovery/forecast charts, and report-card layout.
- Runtime verification: production build passed; TypeScript passed; configured lint failed with 414 formatting errors; dependency peer validation failed on `h3`/`ocache`; mobile viewport has horizontal overflow and no usable primary navigation; no browser console errors were observed on the six routes.

## Requirements traceability

| Area                                    | Delivery status                                                        | Source-supported outcome                                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recovery accounting                     | Implemented locally; exact-version staging apply/DB validation pending | Recoverable cost, rate periods/effective dates, precise decimals, contract/accrual-specific eligible-volume basis, recovered/remaining/percent/completion/variance, provenance, revisions, reproducible rules, drill-down, exceptions, reports, filters, exports, audit history. |
| DCR/accrual workflow                    | Implemented locally; persistence/auth validation pending               | Auto initiator/date, duplicate-aware DCR number, component, multiple parts/programs, supplier contacts, ED&T, piece-price impact, volume, comments, attachments, status, assignments, history, notifications, and entity links.                                                  |
| Documents                               | Local intake/review/posting seams implemented; provider pending        | Contract/DCR/engineering/tooling/amortization documents, private originals, versioned extraction of text/tables and candidate fields, page/table evidence, confidence/warnings, corrections, human approval, controlled canonical-record postings, replaceable provider.         |
| Vehicle-volume ingestion                | Local framework/runtime implemented; IHS/AFS access pending            | IHS, AFS, or both through replaceable file/API adapters; actual/forecast/revised/scenario kinds; OEM/program/model/plant/region/part mapping; effective part quantity/take-rate/allocation; immutable forecast versions; reconciliation and exceptions.                          |
| SAP and ERP ingestion                   | Local contract/runtime implemented; SAP specification pending          | Customer-specific declarative file/API mappings for shipments, transactions, available costs, corrections/reversals/returns, original values/currencies/fields/timestamps, credentials, schedules, retries, idempotency, reconciliation, history, and monitoring.                |
| Shared ingestion controls               | Implemented locally; staging DB/RLS validation pending                 | Immutable source objects/raw rows separated from normalized candidates; Received→Staged→Validated→Mapped→Reviewed→Approved→Posted; rejected/failed traceability; duplicate economic-event prevention; no executable mappings.                                                    |
| Identity and authorization              | Schema/domain controls implemented; staging Auth/RLS and SSO pending   | Authentication, tenant isolation, database/server enforcement, admin/full-view plus part/program/department/technical-team scopes, combinations, permission audit.                                                                                                               |
| Enterprise UX                           | Local responsive/browser/contrast gates pass; hosted workflows pending | Persisted production-shaped workflows; accessible responsive experience; explicit empty/loading/success/validation/denied/failure states.                                                                                                                                        |
| Forecasting                             | Implemented locally at confirmed capability level                      | Versioned forecasts, provenance, completion projections, and exception reporting. A specific ML model, MAPE target, nightly training, SAAR/dealer signals, and predictive narrative are not yet confirmed.                                                                       |
| Claims/profit release                   | Unconfirmed and disabled                                               | Prototype includes claim packs, contractual clawback windows, over-recovery release, and Finance VP approval. Accounting semantics and approval stages require confirmation before implementation.                                                                               |
| SOX compliance                          | Audit-ready controls only; no compliance claim                         | Materials promote SOX reporting/risk reduction. Build audit-ready controls, but do not claim certification or compliance without defined controls and customer validation.                                                                                                       |
| Blockchain and multi-industry expansion | Excluded as unsupported                                                | Do not implement in the confirmed delivery scope.                                                                                                                                                                                                                                |
| Volume data provider                    | Provider-neutral seam implemented; live providers disabled             | IHS, AFS, or both are supported behind one provider-neutral contract. No live provider is claimed until documentation, licensing, approved samples, and credentials are supplied.                                                                                                |

## Proposed architecture

- Keep React, TypeScript, TanStack Router/Start, Tailwind, Radix primitives, and the useful prototype components. Remove the Lovable build wrapper when the standard toolchain is proven equivalent, and replace inactive or unnecessary dependencies deliberately.
- Use Supabase Postgres, Auth, private Storage, Row Level Security, migrations, and Edge Functions. Use direct client access only for RLS-safe CRUD; privileged workflows, connector credentials, document extraction, notifications, and administrative operations stay server-side.
- Put `organization_id` on every tenant-owned record. Model memberships and additive grants for administrator, full-view, department, technical team, program, and part scopes. Enforce access with RLS helper functions and authorization integration tests.
- Store money/rates as Postgres `numeric` and transport decimals as strings. Use one tested decimal calculation library. Separate immutable source events and versioned terms from derived calculation runs/results so every number is reproducible.
- Keep stored source objects and raw ingestion records immutable and distinct from mapped candidates and approved business records. Use an organization-scoped economic-event posting key to prevent duplicate accounting.
- Treat approved documents as contractual authority, SAP/ERP as internal operational actuals, and IHS/AFS as external production/planning context. Reconcile related values instead of assigning provider precedence or overwriting.
- Qualify ledger volume through an approved effective-dated contract/accrual basis. Vehicle production additionally requires approved parts-per-vehicle, take-rate, and allocation rules; production totals never become part volume automatically.
- Core data modules: organizations/memberships/scopes; suppliers/departments/teams/users; OEMs/programs/vehicles/parts; DCRs/status/assignments/comments/attachments/history; contracts/versions/rate periods/currencies; actual volume events; forecast versions/lines; calculation runs/results/exceptions; documents/extraction reviews/evidence; connectors/import runs/staging/errors; audit log/notification outbox.
- Use private object storage and short-lived signed URLs. Queue extraction/import work, persist retries and run state, and keep provider interfaces replaceable. Connector transformations are declarative schemas/mappings, never customer-supplied executable code.
- Deploy the existing SSR frontend on a low-cost Cloudflare Worker/Pages target and keep data/auth/storage/background work in Supabase. Use GitHub Actions for formatting, lint, type safety, unit/integration/RLS/E2E tests, build, migration checks, and dependency/security checks. Final provider and production-tier costs will be recorded before activation.

### Current low-usage cost assumption (verified 2026-08-21)

- Development can run at $0 on the Supabase Free and Cloudflare Workers Free tiers, with the documented inactivity and execution limits.
- A practical production pilot starts at about $30/month: Supabase Pro from $25/month plus Cloudflare Workers Paid at a $5/month account minimum. This excludes domain registration, the licensed production-volume feed, transactional email/SMS, and document extraction, none of which is selected or authorized yet.
- The base remains about $30/month while usage stays inside the included quotas. Overages are usage-based. Supabase Pro currently includes 100,000 MAU, 8 GB database disk, 250 GB egress, and 100 GB file storage; Cloudflare Workers Paid includes 10 million requests and 30 million CPU-ms monthly. Configure spend and CPU caps.
- Official pricing references: https://supabase.com/pricing and https://developers.cloudflare.com/workers/platform/pricing/.

## Vertical milestones

1. **Foundation:** promote the prototype into the repository root, initialize Git without rewriting history, standardize the toolchain, make baseline CI green, add environment validation, docs, health checks, demo seeding, and the durable status file.
2. **Tenant security:** Supabase migrations, Auth, organizations, memberships, additive scopes, RLS, admin permission UI, and authorization tests demonstrating cross-tenant denial.
3. **Master data and DCR:** persisted suppliers/departments/teams/programs/parts, complete create/edit/assign/status/history workflow, duplicate detection, private attachments, comments, and in-app notification outbox.
4. **Recovery ledger:** versioned contract terms/rates/effective dates/currencies, actual volume events, decimal calculation engine, recovery results/exceptions, audit history, dashboards and drill-down, boundary/correction/duplicate/negative/over-recovery tests.
5. **Import framework:** common three-domain lifecycle, stored original objects, immutable raw records, versioned mappings/candidates, exception/reconciliation/approval/posting controls, staged CSV/Excel, generic REST, IHS/AFS and SAP/ERP contracts, schedules, credentials, retries, and monitoring.
6. **Forecasting:** provider-neutral volume source, versioned forecasts/provenance, completion projection, variance/exceptions, forecast-vs-actual reporting, and no unsupported model-quality claims.
7. **Documents:** contract/DCR lifecycle, extraction job/review UI, field evidence/confidence/corrections, replaceable approved runtime provider, availability/failure behavior, security/cost documentation.
8. **Reports and approvals:** scoped exports, claim/accrual reports, confirmed approval workflows, notification delivery, audit bundles, and accessible responsive workflow completion.
9. **Release hardening:** E2E/browser/accessibility/performance/security review, backup/restore and incident guidance, monitoring/logging, deployment runbook, cost model, secret/dead-code/mock-data scan, and release-candidate verification.

## Material risks

- Recovery, FX, rounding, clawback, and approval rules are not defined precisely enough for authoritative accounting.
- Tenant and scope semantics could require schema rework if external suppliers, OEM customers, or multi-organization users are expected.
- IHS/AFS licensing, API shape, cadence, and allowed retention are unknown.
- Documents may contain confidential contract and personal data; provider retention, region, and training policies must be approved.
- Email/SMS delivery and enterprise SSO would add external services and costs and are not yet authorized.
- The prototype's synthetic scale and polished claims can mislead reviewers unless all production-facing mock paths and unsupported claims are removed.
- The current Lovable wrapper, inactive Recharts branch, lint debt, peer mismatch, large bundles, and broken mobile layout require early cleanup.

## Batched questions for the product owner

1. What is the canonical recovery formula, including eligible volume event, rate/effective-date precedence, rounding scale/mode, corrections/returns/negative adjustments, caps, multiple currencies/FX, and over-recovery treatment?
2. IHS, AFS, or both are confirmed external production/planning sources; the contract/accrual selects whether recovery uses ERP shipments, vehicle production, invoiced units, or another approved basis. Provider samples, API/file documentation, licensing/retention, cadence, and credentials remain required for activation.
3. What is the tenant boundary? Can one user belong to multiple organizations, can supplier/OEM contacts sign in, and are part/program/department/team grants additive or restrictive when combined?
4. What are the exact DCR statuses, transition permissions, approval stages, assignment rules, DCR-number uniqueness scope, and notification triggers/recipients?
5. Are claim packs, contractual claim/clawback windows, Finance VP profit release, and SOX reports confirmed product workflows or prototype concepts? If confirmed, what are the approval and accounting rules?
6. Which document types, languages, average/max sizes, monthly volumes, retention periods, data region, and extracted fields are required? Is there an already-approved production extraction API/provider?
7. What production security/operations requirements apply: deployment region, MFA/SSO, audit retention, backup retention, RPO/RTO, data residency, customer security questionnaires, and compliance commitments?
8. Please provide the complete Lovable conversation and either an empty GitHub repository/remote or approval to initialize locally and connect a remote later.
