# Release checklist

Outcome claims and the required release-candidate evidence matrix are governed by [release-readiness.md](./release-readiness.md).

- [x] The approved GitHub remote is connected at `https://github.com/martilomb/Tract.git`, and the existing `main` history was published without rewriting it.
- [x] Local `pnpm install --frozen-lockfile` and `pnpm check` pass.
- [x] Dependency review has no known production vulnerabilities.
- [x] Static migration contract tests pass for ordering, transactions, RLS coverage, security-definer search paths, critical immutable/posting guards, and credential-shaped text.
- [x] GitHub Actions applies all three Supabase migrations cleanly to a fresh database.
- [x] Hosted `supabase db lint` and `supabase test db` pass, including ingestion, role-elevation, scoped-access, and cross-tenant denial checks.
- [x] The project-scoped Supabase MCP server is loaded and OAuth-authenticated for `qflwjgmrspmcyghzinwz`; read-only preflight confirms the documented staging reference, empty application migration/schema/Auth/Storage state, no application policies, and clean pre-migration advisors.
- [x] The staging migration ledger contains exact repository versions `202608210001`–`003` followed only by additive Milestone 10 versions `202608240001`–`003`; each successful push was preceded by an exact CLI `2.111.0` dry run, and no substitute version, MCP migration application, or manual ledger repair was used.
- [x] Linked staging database lint passes at warning-as-failure; transactional pgTAP RLS (7 assertions), ingestion (10), Milestone 10 workflow/isolation (16), integrity-guard (3), and acceptance-control (22) suites pass, plus 2 private Storage RLS assertions, with no retained seed records.
- [x] Generated database types are committed and both user-scoped and service-role server clients use them.
- [ ] Authentication, invitation, password reset, MFA policy, session expiry, and multi-organization switching pass browser tests. Auth service health passes, but hosted self-signup is currently enabled contrary to the repository configuration; approved site/redirect URLs, policies, and invited test identities are required before correction and acceptance.
- [ ] Private document upload, scan, signed read, expiry, replacement, and denial pass. The private 25 MiB bucket, absence of direct authenticated object policies, empty object state, and authenticated insert/list denial boundary pass; scanner and signed-read lifecycle testing still require approved inputs/provider access.
- [x] Calculation replay produces the same input hash, lines, exact values, and policy version in local contract tests.
- [x] Import duplicate, partial failure, retry, cancellation, and reconciliation pass in local contract tests.
- [ ] IHS/AFS and SAP/ERP adapters remain disabled until provider documentation, licensing where applicable, approved samples, mappings, credentials, and reconciliation thresholds are recorded.
- [ ] Raw-source retention, mapping-version replay, missing-mapping/conflict/material-revision exceptions, review/approval permissions, and duplicate economic-event posting denial pass.
- [ ] Document text/table extraction, page/table evidence, confidence/warnings, corrections, human approval, and controlled canonical postings pass with the approved scanner/extractor.
- [ ] Each accrual's eligible-volume basis and any parts-per-vehicle, take-rate, and allocation rules are contract-approved and effective-dated; vehicle-production totals cannot post directly as part volume.
- [ ] Full manual keyboard, screen-reader, and supported-browser certification passes; local semantic control labelling, main-content AA contrast sampling, 13-route desktop smoke, critical keyboard-focus sampling, and all-route 390 x 844 responsive/navigation checks have passed.
- [ ] Backup restore evidence satisfies the approved RPO/RTO.
- [ ] Structured logs, alerts, incident ownership, spend limits, and retention are configured.
- [x] Production builds fail closed when the required connection is absent; demonstration mode requires an explicit build-time flag and is visibly labelled.
- [x] The generated Worker uses the hardened custom server entry; live local responses include correlation, CSP/isolation/frame/referrer/permissions/cache controls and structured request events.
- [x] A distinct, fail-closed Cloudflare staging environment is committed, and its production bundle passes a local no-upload Wrangler dry run.
- [x] No unsupported integration, compliance, accounting, or predictive claim is presented as an active capability.

## Product model and enterprise UX acceptance

The product-owner browser review reopened Milestone 10. Checks previously recorded as passed are reset where the demonstrated defects or approved A–G correction require new evidence.

- [x] One canonical tenant-scoped aggregation/query contract drives Overview, Programs, Parts, Recoveries, Forecasts, Reports, and current-scope exports with no fixed anchors, proportional normalization, unexplained queue values, or route-local financial calculations. Demonstration data is direct and deterministic; authenticated production population remains subject to hosted Auth/query acceptance.
- [x] Program→OEM, part→program, chart→table, selected-filter, forecast-variance, and export reconciliation/property tests pass against direct deterministic fixtures and the shared production-facing snapshot contract.
- [x] Overview clearly separates six direct, clickable, organization-wide headline tiles plus organization-wide risks/quarterly/OEM views from the OEM→program/model→model-year→part selector that scopes the graph/table and Active Programs below it; scope is URL-preserved and provenance/as-of/currency/calculation/forecast/source versions are visible.
- [ ] All dialogs, drawers, and previews are viewport-bounded and internally scrollable with visible close, focus trap/restoration, Escape and keyboard support; Overview KPI and Part detail regressions pass with 200 programs/17,000 parts at desktop and 390 px.
- [x] Overview follows the approved order and responsive hierarchy: six headline tiles; concise risks; quarterly queue/OEM row; analytical selector; selected chart/table with export; scoped clickable Active Programs. All values are canonical and derived, with neutral evidence review/export and no unsupported remedy implications.
- [ ] Organization-configurable, permissioned, versioned, audited absolute/percentage materiality rules and documented program/agreement overrides drive risk classification.
- [ ] The atomic Set up / activate recovery journey links optional approved DCR, reviewed agreement evidence, controlled automotive and part records, rates, volume basis, currency/dates/rounding/assumptions, and activates transactionally without partial active recovery.
- [ ] Ordinary users are routed away from orphan-producing Program/Part creation; authorized master-data maintenance includes duplicate/effective-date/provenance review. Platform copy is **Vehicle architecture (optional)**.
- [ ] DCR Table and Board views support useful counted/filterable/sortable columns/cards, right-panel detail, guarded drag/drop plus a keyboard/menu alternative, exact denial/return behavior, the fixed governed lifecycle, notes, private attachments, assignments/reviewers, approvals, and activity/history.
- [x] Arbitrary custom-property design, granular per-property permissions, stage-specific required-field UI, configurable automation, and broadly customizable pipelines are documented as deferred future enterprise configuration and have no visible placeholder controls.
- [ ] Canonical OEM/make/model/model-year/program/part identifiers, aliases, effective dates, provider mappings, confidential proposals, duplicate suggestions, approval, and immutable merge/alias provenance are governed; vPIC remains optional and inactive.
- [ ] Contracts provide URL-preserved filters, bounded list/detail, controlled links, evidence/version/history, permission-checked original access, and the atomic recovery setup; synthetic originals are explicit.
- [x] Under/over recovery queues share a neutral actionable component with View evidence and real scoped CSV report download; selection appears only with an explained bulk evidence-package action, and the former fake review-package claim is absent.
- [ ] Authorized current-scope CSV/XLSX/PDF/print exports and filter→preview→generate report workflows work for recovery position, actual/contract/forecast, variance, DCR aging, ingestion reconciliation, and audit/evidence packages.
- [ ] Operations is one tabbed workspace and its synthetic connection/import lifecycle changes coherent state from draft through posted/reconciled, including safe test, errors, retry/cancel, next action, and audit; SAP remains fail-closed without customer inputs.
- [ ] Settings separates Personal, Organization, Rules & policies, and approved security/SSO/retention/integration areas; real Auth/provider actions work through secure services or name their exact activation input.
- [ ] Every route/control is functional and permission-aware or explicitly disabled with a precise reason; deterministic demo behavior is clearly synthetic and no live/provider/persistence claim is made.
- [ ] Targeted domain/UI/authorization/connector/export/reconciliation tests, exact `pnpm check`, dependency/secret checks, desktop/390 px route workflows, keyboard/accessibility, downloads, URL state, long-content scrolling, and console/network checks pass with exact evidence.
- [x] Additive migration `202608240003` was dry-run then applied to staging; the exact six-version ledger, 70/70 public-table RLS, tenant/helper/activation denial, 58 database pgTAP assertions, database lint/advisors, empty Auth/Storage state, and generated types were reverified.
- [ ] Gemma completes a new localhost product-owner review and explicitly accepts or records further traceable defects.

Historical baseline evidence at `885d370`: additive migrations `202608240001`–`002`; 35 linked staging pgTAP assertions; 56 local tests across 15 files; clean format/lint/type/build. The new browser findings supersede the former Milestone 10 UX acceptance claim. Current governed status remains **INCREMENT COMPLETE** with approved scope in progress, not release-candidate or final acceptance.

Reopened correction evidence in progress: the complete local gate passes formatting, zero-warning lint, TypeScript, 76 tests across 18 files, and the client plus SSR/Worker production build after adding canonical analytical-workspace, export, URL-scope, focus-restoration, activation, and schema-contract coverage. Overview passed targeted browser checks at 1440×900 and 390×844: six organization-wide direct tiles remain stable while OEM and Program/Part URL scope changes only the analytical section; the chart/table uses 24 common periods; the 200-program detail has a 10,775–10,910 px inner scroll area bounded to the viewport; the close action stays visible; and Escape restores tile focus. Programs, Part Numbers, Forecasts, Recoveries, and Reports also pass clean desktop/mobile route checks with no document overflow or console warnings/errors; mobile Part detail is viewport-bounded, scrollable, Escape-dismissible, and focus-restoring. The 17,000-part overlay fixture, Contracts/DCR/Operations/Settings corrections, full export-format matrix, complete accessibility matrix, and product-owner review remain open.
