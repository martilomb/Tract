# Release checklist

- [x] The approved GitHub remote is connected at `https://github.com/martilomb/Tract.git`, and the existing `main` history was published without rewriting it.
- [x] Local `pnpm install --frozen-lockfile` and `pnpm check` pass.
- [x] Dependency review has no known production vulnerabilities.
- [x] Static migration contract tests pass for ordering, transactions, RLS coverage, security-definer search paths, critical immutable/posting guards, and credential-shaped text.
- [x] GitHub Actions applies all three Supabase migrations cleanly to a fresh database.
- [x] Hosted `supabase db lint` and `supabase test db` pass, including ingestion, role-elevation, scoped-access, and cross-tenant denial checks.
- [x] The project-scoped Supabase MCP server is loaded and OAuth-authenticated for `qflwjgmrspmcyghzinwz`; read-only preflight confirms the documented staging reference, empty application migration/schema/Auth/Storage state, no application policies, and clean pre-migration advisors.
- [x] The staging migration ledger contains exact repository versions `202608210001`–`003` in order after Supabase CLI `2.111.0` dry-run and push applied only the unchanged files; no substitute version or manual ledger repair was used.
- [x] Linked staging database lint passes at warning-as-failure; the unchanged transactional pgTAP RLS (7 assertions) and ingestion (10 assertions) suites and private Storage RLS (2 assertions) suite pass with no retained seed records.
- [x] Generated database types are committed and both user-scoped and service-role server clients use them.
- [ ] Authentication, invitation, password reset, MFA policy, session expiry, and multi-organization switching pass browser tests. Auth service health passes, but hosted self-signup is currently enabled contrary to the repository configuration; approved site/redirect URLs, policies, and invited test identities are required before correction and acceptance.
- [ ] Private document upload, scan, signed read, expiry, replacement, and denial pass. The private 25 MiB bucket, absence of direct authenticated object policies, empty object state, and authenticated insert/list denial boundary pass; scanner and signed-read lifecycle testing still require approved inputs/provider access.
- [x] Calculation replay produces the same input hash, lines, exact values, and policy version in local contract tests.
- [x] Import duplicate, partial failure, retry, cancellation, and reconciliation pass in local contract tests.
- [ ] IHS/AFS and SAP/ERP adapters remain disabled until provider documentation, licensing where applicable, approved samples, mappings, credentials, and reconciliation thresholds are recorded.
- [ ] Raw-source retention, mapping-version replay, missing-mapping/conflict/material-revision exceptions, review/approval permissions, and duplicate economic-event posting denial pass.
- [ ] Document text/table extraction, page/table evidence, confidence/warnings, corrections, human approval, and controlled canonical postings pass with the approved scanner/extractor.
- [ ] Each accrual's eligible-volume basis and any parts-per-vehicle, take-rate, and allocation rules are contract-approved and effective-dated; vehicle-production totals cannot post directly as part volume.
- [ ] Full manual keyboard, screen-reader, and supported-browser certification passes; local semantic control labelling, main-content AA contrast sampling, nine-route desktop smoke, and the 390 x 844 responsive shell/primary navigation have passed.
- [ ] Backup restore evidence satisfies the approved RPO/RTO.
- [ ] Structured logs, alerts, incident ownership, spend limits, and retention are configured.
- [x] Production builds fail closed when the required connection is absent; demonstration mode requires an explicit build-time flag and is visibly labelled.
- [x] The generated Worker uses the hardened custom server entry; live local responses include correlation, CSP/isolation/frame/referrer/permissions/cache controls and structured request events.
- [x] A distinct, fail-closed Cloudflare staging environment is committed, and its production bundle passes a local no-upload Wrangler dry run.
- [x] No unsupported integration, compliance, accounting, or predictive claim is presented as an active capability.

## Product model and enterprise UX acceptance

- [ ] Programs, parts/revisions, DCRs, and contracts/recovery agreements have distinct persisted workflows and do not share a conflated creation form.
- [ ] The Contracts workspace supports private originals, versions, extraction evidence, corrections, linked entities, terms, eligible-volume basis, approval, activation, expiry, supersession, and audit history.
- [ ] DCRs use a left-to-right pipeline with search, filters, evidence/attachment/reviewer gates, assignments, comments, direct record links, and filterable transition history.
- [ ] Operations uses plain-language explanations and drillable ingestion states; volume staging, document review queues, connectors, mappings, retries, reconciliation, and rules/policies expose meaningful actions and outcomes.
- [ ] Forecast, Overview, Recoveries, Programs, and Parts use searchable OEM → program/model → model-year selection where relevant; long tables support sorting, filtering, counts, and pagination or virtualization.
- [ ] OEM, program, model-year, and part drill-downs show actual, contract, forecast, variance, break-even, calculation version, source provenance, and related evidence.
- [ ] Commodity filtering uses real part relationships and never assigns one exclusive synthetic commodity to a vehicle program.
- [ ] Every visible control performs its labelled action or is disabled with a specific reason; Profile and Organization are functional, and API Keys exists only if a customer API is confirmed.
- [ ] Inaccurate vehicle silhouettes and unsupported accounting/legal implications are absent; approved OEM assets or consistent text marks are used.
- [ ] A product-owner browser review confirms the revised workflows and terminology are understandable without implementation knowledge.
