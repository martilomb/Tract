# Release checklist

Outcome claims and the required release-candidate evidence matrix are governed by [release-readiness.md](./release-readiness.md).

- [x] The approved GitHub remote is connected at `https://github.com/martilomb/Tract.git`, and the existing `main` history was published without rewriting it.
- [x] Local `pnpm install --frozen-lockfile` and `pnpm check` pass.
- [x] Dependency review has no known production vulnerabilities.
- [x] Static migration contract tests pass for ordering, transactions, RLS coverage, security-definer search paths, critical immutable/posting guards, and credential-shaped text.
- [x] GitHub Actions applies all three Supabase migrations cleanly to a fresh database.
- [x] Hosted `supabase db lint` and `supabase test db` pass, including ingestion, role-elevation, scoped-access, and cross-tenant denial checks.
- [x] The project-scoped Supabase MCP server is loaded and OAuth-authenticated for `qflwjgmrspmcyghzinwz`; read-only preflight confirms the documented staging reference, empty application migration/schema/Auth/Storage state, no application policies, and clean pre-migration advisors.
- [x] The staging migration ledger contains exact repository versions `202608210001`–`003` followed only by additive Milestone 10 versions `202608240001`–`002`; each push was preceded by an exact CLI `2.111.0` dry run, and no substitute version or manual ledger repair was used.
- [x] Linked staging database lint passes at warning-as-failure; transactional pgTAP RLS (7 assertions), ingestion (10), private Storage RLS (2), Milestone 10 workflow/isolation (13), and integrity-guard (3) suites pass with no retained seed records.
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

- [x] Programs, parts/revisions, DCRs, and contracts/recovery agreements have distinct persisted workflows and do not share a conflated creation form.
- [x] The Contracts workspace supports private originals, versions, extraction evidence, corrections, linked entities, terms, eligible-volume basis, approval, activation, expiry, supersession, and audit history.
- [x] DCRs use a left-to-right pipeline with search, filters, evidence/attachment/reviewer gates, assignments, comments, direct record links, and filterable transition history.
- [x] Operations uses plain-language explanations and drillable ingestion states; volume staging, document review queues, connectors, mappings, retries, reconciliation, and rules/policies expose meaningful actions and outcomes.
- [x] Forecast, Overview, Recoveries, Programs, and Parts use searchable OEM → program/model → model-year selection where relevant; long tables support sorting, filtering, counts, and pagination or virtualization.
- [x] OEM, program, model-year, and part drill-downs show actual, contract, forecast, variance, break-even, calculation version, source provenance, and related evidence.
- [x] Commodity filtering uses real part relationships and never assigns one exclusive synthetic commodity to a vehicle program.
- [x] Every visible control performs its labelled action or is disabled with a specific reason; Profile and Organization are functional, and API Keys exists only if a customer API is confirmed.
- [x] Inaccurate vehicle silhouettes and unsupported accounting/legal implications are absent; approved OEM assets or consistent text marks are used.
- [ ] A product-owner browser review confirms the revised workflows and terminology are understandable without implementation knowledge.

Milestone 10 evidence: additive migrations `202608240001`–`002`; 35 linked staging pgTAP assertions; 56 local tests across 15 files; clean format/lint/type/build; all 13 routes at desktop and 390 px without console warnings, document overflow, or duplicate ids; and exercised Program/Part, DCR, Contract, connector, import, document-review, forecast, reporting, and account/admin controls. This is an **INCREMENT COMPLETE** result pending product-owner review, not release-candidate or final acceptance.
