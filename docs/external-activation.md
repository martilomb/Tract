# External activation inputs

Real SAP/ERP, IHS/AFS, document scanning/extraction, email/notification, and SSO behavior is unverified until the approved specifications and environments below are supplied and the defined validation passes. Local synthetic/configuration tests do not establish a live integration.

The credential-free Milestone 10 increment is implemented without activating paid or live providers. The items below are the consolidated inputs needed to validate and activate hosted behavior. Secrets should be placed in the approved secret store or CI environment, not committed or pasted into source files.

## 1. GitHub repository connection

Provide or approve:

- GitHub organization/account, repository name, visibility, and the empty repository URL.
- The maintainer(s) allowed to connect this local history, push `main`, and create pull requests.
- Default-branch protection: require the `quality / verify` and `quality / database` checks, at least one reviewer, resolved conversations, and no force-push/deletion.
- Permission for GitHub Actions and Dependabot; decide who reviews weekly dependency and Actions updates.
- CI/environment ownership and the approved method for adding repository or environment secrets.

Activation status: the approved remote `https://github.com/martilomb/Tract.git` is connected and the existing `main` history is published without rewriting it. Both hosted CI jobs passed before the account's Actions credits were exhausted, including a fresh Supabase start, all migrations, database lint, and pgTAP. Automatic workflow triggers are disabled; the workflow remains available for deliberate manual execution after credits reset. Remaining work is to configure an affordable branch-protection strategy and record the repository and release owner.

## 2. Supabase staging and database validation

Activation status: the project-scoped Supabase MCP server and Supabase CLI `2.111.0` are authenticated for the confirmed non-production staging project `qflwjgmrspmcyghzinwz`. CLI authentication and linking used only private interactive browser/terminal prompts. No credential value was placed in chat, command output, source, documentation, or Git.

On 24 August 2026, the initial `db push --dry-run` listed only the unchanged repository files `202608210001_foundation.sql`, `202608210002_product.sql`, and `202608210003_ingestion_domains.sql`; the subsequent CLI push applied only those files. Milestone 10 then added `202608240001_milestone10_enterprise_workflows.sql` and `202608240002_milestone10_integrity_guards.sql`; each was inspected and dry-run before CLI application. CLI and MCP inspection report exactly those five versions and names in order; no MCP migration application or ledger repair was used.

Validation status: all 63 public tables have RLS enabled; 119 public policies, 30 application functions, 120 non-internal public triggers, and the critical immutable/transition/posting/integrity guards are present. Linked database lint passes at warning-as-failure. Transactional pgTAP RLS passes 7 assertions, ingestion 10, private Storage RLS 2, Milestone 10 workflow/isolation 13, and Milestone 10 integrity guards 3, with no retained seed records. The private `tract-private-documents` bucket is non-public, limited to 25 MiB, empty, and has no direct authenticated object policy. Generated linked-project database types are committed and wired into both server Supabase client factories.

Post-migration security advisors are clean. Performance advisors report 263 unindexed-foreign-key notices, 20 unused-index notices on the empty database, 4 Auth RLS initialization-plan warnings, and 44 multiple-permissive-policy warnings. Index changes require workload evidence, and permissive-policy changes require review against the intentional additive authorization model; the findings do not authorize speculative index removal or a bulk policy rewrite. Remediation references: [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [Auth RLS initialization plans](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), and [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

Auth and Storage service health pass. Auth, Storage, and application tables remain empty after validation. Hosted Auth reports public signup enabled, while repository configuration disables it. Do not push the local configuration unchanged because its localhost site/redirect URLs are not approved for staging. The signup mismatch, invitation/reset/MFA/session and multi-organization browser flows, document scan/signed-read lifecycle, and isolated restore remain open acceptance items.

Provide or approve:

- A non-production Supabase staging project, project reference, region/data-residency choice, plan/spend cap, and project owner.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the controlled build environment.
- `SUPABASE_SERVICE_ROLE_KEY` only through a server-side secret store. Never expose the service key to the browser.
- Auth site URL/redirect URLs and a private Storage bucket decision if the migration default must differ.
- Backup/PITR features, retention, RPO/RTO, restore-test owner, log retention, and database alert thresholds.

Remaining validation work: approve the staging Auth site/redirect URLs, invitation/reset behavior, MFA/session policy, and invited test identities; then correct the hosted signup mismatch and run the Auth/multi-organization browser suite. Approve scanning/extraction inputs before testing private upload/scan/signed-read expiry and replacement. Provide an isolated project plus approved RPO/RTO before restore testing. Review the recorded performance findings against expected workloads and authorization semantics before proposing a separately traceable migration.

## 3. IHS or AFS vehicle-volume access

Provide or approve:

- IHS, AFS, or both, plus the contract/license reference and permitted storage, derived use, retention, region, and user population.
- Interface documentation and version; REST/file transport; endpoints/hosts; authentication scheme; secret-store reference; rate limits; pagination; delta/replay behavior; time zone; schedule; support contact; and maintenance windows.
- Approved representative samples for actual, forecast, revised, scenario, duplicate, corrected, missing-mapping, and conflicting-source cases. Samples must be sanitized if necessary.
- Field definitions and identifiers for OEM, program, vehicle model, plant, region, part relevance, source record/version/timestamp, period, units, and forecast version.
- Mapping ownership, update cadence, material-revision threshold, reconciliation tolerances, forecast retention, and the behavior when both providers describe the same economic event. Sources will reconcile; neither silently overwrites the other.

Activation work: implement the provider module behind the existing bounded adapter, approve mappings/samples, load credentials at runtime, run reconciliation and idempotency tests, then change that provider from disabled to approved configuration.

## 4. SAP interface and sample data

Provide or approve:

- SAP product/version and customer landscape, interface owner, and the selected transport: OData, REST, or controlled file drop.
- Interface specifications, entity/object names, endpoint/host allowlist, network/VPN/IP requirements, authentication scheme, credential rotation, pagination/delta tokens, rate limits, time zone, schedule, and maintenance/error semantics.
- Sanitized samples and expected results for shipments, purchase orders, invoices, material documents, costs, corrections, reversals, returns, duplicates, partial failures, and replays.
- Source transaction/idempotency keys; part/program/model/plant/supplier/customer mappings; signed quantities; original values/currencies/source fields; timestamps; units of measure; and mapping-version rules.
- Recovery classification ownership, reconciliation totals/tolerances, retry/cancellation policy, close-period handling, and the explicit rule that available cost or transaction data does not imply recoverability.

Activation work: add the customer-specific declarative adapter/mapping, validate it with the approved samples, prove bounded retry/idempotency/reconciliation behavior, and activate only after credential and network tests pass.

## 5. Approved document scanning and extraction

Provide or approve:

- The malware-scanning provider and extraction/OCR provider(s), or one provider covering both, including security review, DPA, sub-processors, region, retention/deletion, model-training use, support/SLA, and price/spend cap.
- API documentation/version, endpoint/host allowlist, authentication and secret reference, request/response limits, async callback or polling contract, retry/rate-limit behavior, and provider outage policy.
- Allowed document types, MIME types, languages, maximum size, expected monthly volume, retention/replacement rules, and private-storage lifecycle.
- Per-document configured fields/tables, page/table evidence requirements, confidence/warning thresholds, correction reasons, destination mappings, and approved sanitized test documents with expected outputs.
- Human reviewer/approver roles, segregation of duties, fallback manual-entry behavior, and which document versions are contractual authority.

Activation work: implement the approved scanner/extractor modules behind `DocumentSafetyScanner` and `ExtractionProvider`, verify clean-scan gating and hash continuity, test evidence-backed review/posting plus failure/expiry paths, and keep the deterministic adapter development-only.

## 6. Identity, email, security, and deployment configuration

Identity and access:

- Supabase Auth method(s), invited user populations, multi-organization rules, SAML/OIDC provider metadata if SSO is required, domain restrictions, MFA enrollment/recovery policy, session/refresh lifetime, inactivity timeout, account lockout, break-glass ownership, and joiner/mover/leaver process.
- Final role/scope matrix for administrator, full-view, department, technical-team, program, and part grants; reviewer/approver/poster segregation; supplier/OEM contact access; and audit-review ownership.

Email and notifications:

- Approved transactional email provider or SMTP relay, verified sender/domain, reply-to/support address, region/DPA, credentials via secret reference, rate/spend limits, bounce/complaint handling, DKIM/SPF/DMARC ownership, and email retention.
- Approved invitation, reset, review-request, approval, failure, and escalation templates; locale/accessibility requirements; recipient rules; quiet hours; retry/dead-letter thresholds; and whether any non-email channels are required.

Security and operations:

- Data classification/residency, retention/deletion/legal-hold rules, RPO/RTO, backup/PITR/restore cadence, vulnerability and penetration-test expectations, formal control/compliance mapping, audit/log retention, security contact, incident severity/on-call/notification terms, and customer questionnaire requirements.
- Allowed origins/custom domains, CSP nonce work if inline hydration must be removed, WAF/rate-limit/bot policy, secret rotation, dependency update SLA, alert thresholds/routes, performance/SLO targets, and production browser/accessibility certification matrix.

Deployment:

- Cloudflare account, Worker/project and staging/production environments, region/domain/DNS ownership, access method, deployment approvers, rollback owner, public Supabase variables, encrypted Worker secrets, log destination/sampling, spend/CPU caps, and custom-domain/TLS policy.
- Promotion policy from staging to production and evidence required for sign-off: CI, database/RLS/auth/storage tests, connector/provider tests, accessibility/browser tests, backup restore, health/log verification, and approval record.

Activation status: the named `tract-recovery-platform-staging` Wrangler environment is committed with fail-closed Supabase binding declarations and production-shaped logging. Its real bundle passes `pnpm cloudflare:dry-run:staging` without an account or upload. Account access, secret/public binding values, spending controls, hostname/DNS, upload, and log verification remain external and approval-gated.

## 7. Authoritative business configuration

Provide the approved, versioned rules for eligible-volume basis per accrual; rate/effective-date precedence; settlement currency and rounding; FX source/timing if multi-currency is required; corrections/returns/negative adjustments; caps; claim eligibility; clawbacks; over-recovery/profit-release disposition; DCR/claim approval stages; and notification/escalation recipients. The local engine keeps these concerns configurable and does not infer contractual or accounting rights.
