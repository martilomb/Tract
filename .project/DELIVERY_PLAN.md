# Tract delivery baseline and plan

## Baseline

- The workspace contains seven supplied artifacts and no Git repository or remote.
- The Lovable archive is a TanStack Start / React 19 / TypeScript / Tailwind prototype. It builds and type-checks, but it has no authentication, database, Supabase configuration, migrations, API, storage, tests, CI, deployment configuration, or operational documentation.
- All programs, parts, DCRs, forecasts, audit windows, approvals, AFS status, contacts, and accounting results are deterministic mock data generated in the client. Several primary controls are visual-only. The only working exports are the part CSV and browser print for the generated DCR.
- Useful visual direction to preserve: Tract navy/blue branding, the overview hierarchy, OEM/program/part drill-down, recovery status vocabulary, filtering, DCR document presentation, recovery/forecast charts, and report-card layout.
- Runtime verification: production build passed; TypeScript passed; configured lint failed with 414 formatting errors; dependency peer validation failed on `h3`/`ocache`; mobile viewport has horizontal overflow and no usable primary navigation; no browser console errors were observed on the six routes.

## Requirements traceability

| Area                                    | Delivery status                                                      | Source-supported outcome                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recovery accounting                     | Implemented; staging schema/DB validation passed                     | Recoverable cost, rate periods/effective dates, precise decimals, contract/accrual-specific eligible-volume basis, recovered/remaining/percent/completion/variance, provenance, revisions, reproducible rules, drill-down, exceptions, reports, filters, exports, audit history.                                           |
| DCR workflow                            | Fixed-lifecycle Table/Board correction implemented and verified      | Table and Board views, guarded drag/drop and accessible stage control, controlled affected-record selection, evidence, assignments/reviewers, private attachments, comments, approvals, and activity history, with an agreement/setup gate at Active without requiring an agreement to draft.                              |
| Contracts and recovery agreements       | Guided atomic setup implemented and verified                         | The separate Contracts area provides URL filters, controlled canonical links, bounded evidence/history detail, and one guided recovery setup that joins an optional approved DCR, approved agreement evidence, controlled vehicle/part records, effective rates, volume basis, assumptions, and all-or-nothing activation. |
| Master-data boundaries                  | Distinct records plus additive provenance controls verified; UX open | Vehicle programs, part numbers/revisions, DCRs, and recovery agreements are distinct records and workflows. Governed vehicle make/model/architecture identifiers, proposals, aliases, and merge provenance are persisted; duplicate/review UX remains in Milestone 10.                                                     |
| Documents                               | Private Storage boundary passed; scanner/end-to-end flow pending     | Contract/DCR/engineering/tooling/amortization documents, private originals, versioned extraction of text/tables and candidate fields, page/table evidence, confidence/warnings, corrections, human approval, controlled canonical-record postings, replaceable provider.                                                   |
| Vehicle-volume ingestion                | Local framework/runtime implemented; IHS/AFS access pending          | IHS, AFS, or both through replaceable file/API adapters; actual/forecast/revised/scenario kinds; OEM/program/model/plant/region/part mapping; effective part quantity/take-rate/allocation; immutable forecast versions; reconciliation and exceptions.                                                                    |
| SAP and ERP ingestion                   | Local contract/runtime implemented; SAP specification pending        | Customer-specific declarative file/API mappings for shipments, transactions, available costs, corrections/reversals/returns, original values/currencies/fields/timestamps, credentials, schedules, retries, idempotency, reconciliation, history, and monitoring.                                                          |
| Shared ingestion controls               | Implemented; staging database/RLS validation passed                  | Immutable source objects/raw rows separated from normalized candidates; Received→Staged→Validated→Mapped→Reviewed→Approved→Posted; rejected/failed traceability; duplicate economic-event prevention; no executable mappings.                                                                                              |
| Identity and authorization              | Staging schema/RLS passed; hosted Auth flows and SSO pending         | Authentication, tenant isolation, database/server enforcement, admin/full-view plus part/program/department/technical-team scopes, combinations, permission audit.                                                                                                                                                         |
| Enterprise UX                           | Milestone 10 correction in progress                                  | Canonical Overview/Programs/Parts/Forecasts/Recoveries/Reports and shared bounded overlays are implemented; Contracts/DCR/Operations/Settings and the complete revised browser matrix remain. All workflows stay permission-aware and honest about synthetic/live state.                                                   |
| Forecasting                             | Canonical scoped experience and reconciliation implemented           | Versioned forecast projections use the canonical aggregation layer with program and part scope, chart/table views, scoped CSV export, provenance, and reconciliation to the same source records. Unsupported predictive claims remain excluded.                                                                            |
| Claims/profit release                   | Unconfirmed and disabled                                             | Prototype includes claim packs, contractual clawback windows, over-recovery release, and Finance VP approval. Accounting semantics and approval stages require confirmation before implementation.                                                                                                                         |
| SOX compliance                          | Audit-ready controls only; no compliance claim                       | Materials promote SOX reporting/risk reduction. Build audit-ready controls, but do not claim certification or compliance without defined controls and customer validation.                                                                                                                                                 |
| Blockchain and multi-industry expansion | Excluded as unsupported                                              | Do not implement in the confirmed delivery scope.                                                                                                                                                                                                                                                                          |
| Volume data provider                    | Provider-neutral seam implemented; live providers disabled           | IHS, AFS, or both are supported behind one provider-neutral contract. No live provider is claimed until documentation, licensing, approved samples, and credentials are supplied.                                                                                                                                          |

## Product-owner review: enterprise workflow correction

The 24 August 2026 demonstration review confirmed that the visual foundation is useful but that several screens expose implementation concepts, conflate business records, or present non-functional controls. The following decisions are approved scope, not optional polish.

### Plain-language product model

| Concept                        | Meaning and intended behavior                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vehicle program                | The OEM vehicle/carline record, including platform, model years, plants/regions, and mapped IHS/AFS identifiers. Creating one must not also create a part, DCR, or financial recovery.                                          |
| Part number or revision        | A component assigned to applicable programs and model years. A redesign is handled through a DCR and then a new part number or effective-dated revision; historical parts are never overwritten.                                |
| Design Change Request (DCR)    | The proposal, evidence, review, and approval workflow for a change. A DCR may begin before commercial terms are signed, but required evidence must gate approval and activation.                                                |
| Contract or recovery agreement | The contractual authority for recoverable cost, per-unit rates, effective dates, eligible-volume basis, and linked programs/parts/DCRs. An approved agreement is required before recovery can become active or post accounting. |
| Ingestion lifecycle            | Received → Staged → Validated → Mapped → Reviewed → Approved → Posted is the controlled path that prevents unverified source data from affecting calculations. Each stage must expose records, issues, evidence, and actions.   |
| Accounting disposition         | The approved treatment of an over-recovered balance. It is not a legal deposition. User-facing language should say “Accounting treatment” or “Over-recovery decision” unless a customer explicitly prefers the technical term.  |

### Add

- A dedicated **Contracts** navigation item and **Recovery Agreements and Contracts** workspace.
- A contract wizard: upload original → extract candidates → review evidence → link supplier/DCR/program/model year/part → confirm recovery and volume rules → approve and activate.
- Contract search, filters, statuses, version history, original documents, extracted evidence, linked records, approval history, expiry, and supersession.
- Read-only linked-contract summaries on Program, Part, and DCR pages, with “Link existing contract” and context-preserving “Create contract” actions.
- Searchable hierarchical OEM → program/model → model-year selectors, with an additional part selector wherever part-level analysis is relevant.
- Three-state sortable table headings, record counts, pagination or virtualization, and filters appropriate to each high-volume table.
- OEM, program, model-year, and part drill-downs showing actual, expected, forecast, variance, break-even, provenance, and underlying calculation/evidence links.
- Functional Profile and Organization pages. Add API-key management only if an external Tract API is confirmed; otherwise remove the menu item.
- Plain-language help text, tooltips, empty states, and “why this matters” explanations for operational and accounting concepts.

### Change

- Replace the combined “New program from DCR” form with separate Create Program, Create Part/Revision, Create DCR, and Create Recovery Agreement workflows.
- Present DCRs as a left-to-right pipeline with a selected-record evidence panel, required-field/attachment/approval gates, search, filters, assignments, comments, and filterable history.
- Move primary document upload and extraction review into Contracts; retain Operations as the cross-workspace exception/review queue.
- Turn Connector Registry into an administrator wizard for approved file/API providers, mappings, schedules, credential references, tests, health, retries, reconciliation, disablement, and audit history.
- Rename Versioned Configuration to **Rules and Policies** and expose understandable effective dates, versions, owners, approval state, and change history.
- Make every ingestion lifecycle stage selectable and explain what entered, failed, changed, awaits approval, and posted.
- Replace long Forecast and Overview program lists with searchable hierarchical selectors; preserve the selection in URLs where practical.
- Recompose Recoveries into filterable summaries and bounded tables instead of multiple full-book lists on one page. Use available horizontal space for charts and detail, not empty columns.
- Add sorting and filtering to Part Numbers and Overview Active Programs; expand part details with a time-series projection and variance/evidence breakdown.
- Make OEM, program, and model-year cards open progressively deeper recovery views, including aggregate OEM net position and distribution of over/under-recovering programs.
- Replace synthetic commodity-to-program assignment with explicit part-to-commodity relationships. A program may contain many commodities; filters must mean “records containing matching parts,” not exclusive assignment.
- Keep Overview charts data-driven and traceable to calculation inputs. Correct clipped labels and reset or simplify animation when the selected record changes.
- Rename Scenario Exceptions to **Forecast risks and variances** and link each item directly to its program, calculation, cause, threshold, and evidence.
- Rename disposition-facing copy to plain-language accounting-treatment terms and link each balance to its decision/review workflow.
- Define the initial report catalog: recovery position by OEM/program/model year/part, actual-versus-contract/forecast, under/over-recovery exceptions, DCR status/aging, ingestion reconciliation, and audit/evidence packages. Claims remain disabled until approved rules exist.

### Remove or disable

- Remove unverified vehicle silhouettes and other imagery that does not match the actual OEM/model. Use approved OEM assets or a consistent text mark.
- Remove the existing conflated program/DCR/part/accrual creation path after its replacements are available.
- Remove dead navigation and menu actions. During transition, render unavailable actions as disabled with a reason rather than allowing no-op clicks.
- Remove the API Keys menu item unless Tract exposes a confirmed customer API with scoped, expiring, rotatable credentials and audit history.
- Remove unsupported legal, claim, profit-release, or accounting-action implications. Do not imply a balance has an approved treatment when it is merely awaiting review.
- Remove the global commodity control from screens where it cannot produce semantically valid results; use page-level or global filtering only after real relationships support it.

### Retain

- Tract branding, responsive shell, Overview hierarchy, existing chart visual language, recovery status vocabulary, audit history, and fail-closed demonstration banner.
- Part Numbers search, advanced filters, status chips, CSV export, and existing basic part detail as the foundation for the richer drill-down.
- Settings structure, Operations safety controls, immutable ingestion lifecycle, evidence-backed document review, recovery precision, RLS, and auditability.
- Reports as a product area, but only with clearly defined, data-backed report types and scoped exports.

### Milestone 10 acceptance

Product-owner acceptance is reopened. The earlier first-eight-criteria pass statement is withdrawn after the 24 August 2026 browser review demonstrated unbounded dialogs, fixed accounting anchors, mixed filter scope, deterministic route-local calculations, and synthetic or disabled primary actions. The criteria below remain the governing acceptance baseline and must be reverified against the corrected implementation.

- A user can distinguish and independently create a program, part/revision, DCR, and contract without duplicate or contradictory data entry.
- A contract can cover multiple programs, model years, parts, and DCRs; related pages link to the same canonical agreement and version.
- No DCR can advance through a gated transition without its configured evidence, reviewer, and approval requirements; a contract is not required merely to save a DCR draft.
- High-volume selectors and tables remain usable with at least 200 programs and 17,000 parts through search, hierarchy, sorting, filtering, and bounded rendering.
- Every visible control either performs its labelled action or is disabled with a specific explanation; there are no no-op menu items or generic links to the wrong record.
- Overview, forecast, recovery, OEM, program, model-year, and part figures reconcile to the same versioned source/calculation data and expose provenance.
- Operations is understandable to a non-technical product owner through plain-language labels and drillable statuses; advanced implementation detail is progressively disclosed.
- Verified or licensed brand assets are used; inaccurate vehicle imagery is absent.
- Desktop, mobile, keyboard, screen-reader, browser, type, lint, test, build, tenant-isolation, and calculation-regression gates pass after the correction.

## Product-owner acceptance response: approved Milestone 10 corrections

The following work is approved governed scope. It corrects demonstrated defects and resolves the product model; it is not an invitation to add speculative features.

### Demonstrated defects

- The Overview total-recovery dialog can grow to roughly 10,699 px while the page body is locked, leaving thousands of pixels outside the viewport and no usable scroll path. Part details and other overlays share the same unbounded-content risk.
- Overview scales raw fixture totals to fixed `462M`, `18M`, and `3M` anchors. Those values are not trustworthy accounting aggregates.
- Changing OEM changes the main chart but leaves KPIs, risks, secondary charts, and the active-program table organization-wide without a clear boundary. Mixed scope is unacceptable.
- Several routes calculate independently from deterministic client fixtures, while primary actions and exports are synthetic-only or disabled. Demonstration mode may remain synthetic, but enabled workflows must change coherent state and produce exact, reconcilable results; production must query tenant-scoped persistence.

### Resolved product model and recovery journey

- Program, Part/Revision, DCR, and Contract/Recovery Agreement remain separate canonical records. Programs and parts may exist before a recovery agreement, and a DCR need not create either record.
- The normal commercial journey is one guided, atomic **Set up / activate recovery** workflow, available from an approved DCR or directly when DCRs are managed elsewhere. It links an optional approved DCR, reviewed agreement evidence, controlled OEM/make/model/program/model-year and part/revision records, recoverable cost, rate periods, eligible-volume basis, currency/rounding/effective dates, forecast assumptions, and final review. Activation succeeds transactionally or leaves an explicit incomplete draft; it never creates a partial active recovery.
- Ordinary users are routed to recovery setup instead of prominent orphan-producing Program or Part creation. Governed master-data maintenance remains available only to authorized administrators and integrations with duplicate/effective-date controls.
- Moving a DCR into the tenant stage mapped to canonical Active requires an approved effective agreement and complete linked recovery setup. Earlier stages, including Draft, remain agreement-independent.
- A **Platform** is a shared vehicle architecture; a **Program** is an OEM/customer-specific vehicle or carline project and lifecycle. User-facing copy says **Vehicle architecture (optional)** and de-emphasizes it when it is not useful.

### Approved work and acceptance evidence

- **A — trustworthy scoped analysis:** one canonical aggregation/query layer supplies Overview, Programs, Parts, Recoveries, Forecasts, Reports, and exports. Remove fixed anchors, proportional normalization, and independent queue/quarter calculations. Analytical workspaces follow concise summary → chart/table → useful breakdowns/exceptions → record drill-down → provenance/evidence → scoped export, and preserve drill-down from OEM/make → program/model → model year → part and back. URL-preserved Program/Part scope includes part number, optional date, and forecast version. Property/reconciliation tests prove program→OEM, part→program, chart→table, forecast variance, filters, and exports. All overlays are viewport-bounded, internally scrollable, focus-managed, keyboard dismissible, and verified with 200 programs/17,000 parts at desktop and 390 px.
- **B — materiality and approved Overview:** keep six clickable organization-wide headline tiles, but derive them directly from the canonical source and route each to a useful filtered breakdown. Beneath them show concise organization-wide Forecast risks and variances, then a two-column desktop row with a derived actionable quarterly over-recovery review queue and Recovery by OEM. Clearly separate the analytical selector below: OEM → program/model → model year → part number scopes only the selected chart/table and Active Programs. The selected graph shows exact scope, as-of/source/calculation version, chart/table toggle, export, and drill-down; Active Programs honors relevant scope and every row opens program detail. Organization administrators configure versioned, audited absolute or percentage materiality rules and documented program/agreement overrides, while Overview displays only the resulting important alerts. No legal remedy or accounting treatment is inferred.
- **C — DCR workspace:** table and HubSpot-style board views support useful full-width counted columns/cards, search/filter/sort, card/right-panel detail, accessible drag/drop plus stage-change menu, and exact blocked-transition explanations using existing fixed evidence/role guards. The understandable release lifecycle remains Draft → Submitted → Under Review → Approved → Active → Closed, plus governed Rejected/Cancelled paths. Notes, private attachments, assignments/reviewer information, approvals, and activity/history are functional in synthetic mode. A blocked move returns to the prior stage; Active still requires the approved agreement and complete linked recovery setup. A simple data-model seam may be retained, but the arbitrary custom-property designer, granular per-property permissions, stage-specific required-field UI, automation engine, and broadly customizable pipeline builder are explicitly deferred to a future enterprise-configuration phase with no visible placeholders.
- **D — controlled automotive master data:** canonical OEM/make/model/model-year/program records retain stable internal IDs, provider IDs, aliases, effective dates, and provenance. IHS/AFS mappings remain provider-neutral and licensing-gated; NHTSA vPIC is optional US seed/validation only. Confidential program proposals and part/revision creation require duplicate suggestions, reason, review, effective dating, and immutable merge/alias provenance.
- **E — contracts and recoveries:** Contracts provide URL-preserved search/filter across agreement, supplier, status, OEM/program/model year/part/DCR/date; bounded list plus accessible detail; terms, evidence, history, controlled canonical links, and permission-checked original access. Synthetic originals are clearly labelled. Under/over queues share one neutral evidence/review/report pattern, selection exists only with an explained bulk action, and downloadable packages are real or absent.
- **F — reports and exports:** every meaningful table, chart, and detail exports its authorized current scope. Tabular CSV/XLSX and review PDF/print outputs include organization, filters, as-of time, currency, calculation/forecast/source versions, and provenance. Recovery position, actual-versus-contract/forecast, variance/exceptions, DCR status/aging, ingestion reconciliation, and audit/evidence reports use filter→preview→generate/download and never ignore filters.
- **G — Operations and Settings:** Operations is one workspace with Data connections, Imports & runs, Document review, Exceptions & reconciliation, Rules & policies, and Audit/monitoring. A durable synthetic lifecycle demonstrates draft→mapping→validation→safe test→raw/staged/validated/mapped/reviewed/approved/posted→reconciled plus retry/cancel/audit. SAP remains a replaceable fail-closed extension requiring customer-specific protocol/network/auth inputs. Settings separates Personal, Organization, Rules & policies, and approved Security/SSO/retention/integration controls; unavailable real Auth/provider actions name the activation input rather than simulating success.

Validation must include targeted domain, authorization, connector, export, reconciliation, and overlay regression tests; exact `pnpm check`; additive migration dry-run and staging ledger/RLS/pgTAP/lint/advisor/type verification if schema changes; desktop and 390 px critical workflows; keyboard/accessibility sampling; downloads and URL scope persistence; and zero unexplained console/network errors. Real provider behavior stays labelled unverified. Gemma must re-review the corrected localhost build before acceptance.

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
10. **Product model and enterprise UX correction:** complete the reopened A–G correction above: canonical scoped analysis, bounded accessible overlays, atomic recovery setup, fixed-lifecycle DCR Table/Board workflow, versioned materiality rules, controlled master data, actionable contracts/recoveries/reports, unified Operations, honest Settings, and a new product-owner acceptance pass. Arbitrary DCR property/pipeline/automation configuration remains deferred.

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
