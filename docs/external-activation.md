# External activation inputs

Real SAP/ERP, IHS/AFS, document scanning/extraction, email/notification, and SSO behavior is unverified until the approved specifications and environments below are supplied and the defined validation passes. Local synthetic/configuration tests do not establish a live integration.

The published credential-free Milestone 10 baseline did not activate paid or live providers. Product-owner acceptance is now reopened for credential-free A–G corrections; that work does not change the external inputs below. The items remain the consolidated inputs needed to validate and activate hosted behavior. Secrets should be placed in the approved secret store or CI environment, not committed or pasted into source files.

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

On 24 August 2026, the initial `db push --dry-run` listed only the unchanged repository files `202608210001_foundation.sql`, `202608210002_product.sql`, and `202608210003_ingestion_domains.sql`; the subsequent CLI push applied only those files. Milestone 10 then added `202608240001_milestone10_enterprise_workflows.sql`, `202608240002_milestone10_integrity_guards.sql`, and `202608240003_milestone10_acceptance_controls.sql`; each successful CLI application followed inspection and an exact dry run. On 27 August 2026, the application-spine dry run listed only `202608270001_application_spine.sql`, and the CLI applied only that additive migration. The remote ledger now contains exactly those seven versions in order. No MCP migration application or ledger repair was used.

Validation status: all 74 public tables have RLS enabled; 138 public policies, the critical immutable/transition/posting/integrity/application-spine guards, and the private document boundary are present. Linked database lint reports no schema errors. Transactional database pgTAP passes RLS 7 assertions, ingestion 10, Milestone 10 workflow/isolation and atomic activation 16, integrity guards 3, acceptance controls 22, and application spine 27: 85 assertions total. Docker is unavailable on the workstation, so the database suites run through authenticated linked SQL execution by composing repository synthetic seed data into each rolled-back transaction. Those seed rows are not retained. Four randomized `.invalid` Auth identities and two isolated tenant fixtures are separately retained only for the P1–P2 authenticated acceptance matrix; credentials stay runtime-only and the accounts will be deactivated after the matrix. The private `tract-private-documents` bucket remains non-public, empty, and has no direct authenticated object policy. Generated linked-project database types remain wired into the server Supabase client factories; P1 Auth activation changed no schema.

The security advisor reports two reviewed warnings: `public.accept_organization_invitation(text)`, the bounded authenticated security-definer RPC required for atomic invitation consumption, and leaked-password protection, which Supabase exposes only on Pro and above. The invitation RPC's pinned search path, least-privilege grant, email/token/expiry/replay/seat checks, and transactional audit behavior are covered by the 27-case spine suite. Warning-level performance advisors remain 4 Auth RLS initialization-plan and 49 multiple-permissive-policy findings. Policy changes require workload and authorization review; the findings do not authorize a speculative bulk rewrite. Remediation references: [authenticated security-definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password security](https://supabase.com/docs/guides/auth/password-security), [Auth RLS initialization plans](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), and [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

Auth and Storage service health pass. Gemma approved the reversible staging Auth boundary on 28 August 2026. CLI `2.111.0` now reports remote Auth up to date with the repository: site URL `http://127.0.0.1:8081`; exact redirects for that origin and `http://localhost:8081`; public signup disabled while approved existing email identities can sign in; email confirmation and secure password change enabled; 12-character minimum; one-hour JWT; refresh rotation and recommended 10-second reuse interval; and TOTP enrollment/verification enabled. The P1 browser/API matrix passes sign-in, invitation acceptance and replay denial, refresh/reload persistence, multi-organization switching, membership visibility, role/deactivation/reactivation, last-admin and seat enforcement, audit, scoped/cross-tenant/non-admin denial, remote logout revocation, 1440×900 and 390×844 layout, semantic keyboard order, and zero console warnings/errors. Basic TOTP enrollment/challenge/AAL2 verification/cleanup passes. No external email was sent, and no Storage, production, paid, or live-provider setting changed.

Provide or approve:

- A non-production Supabase staging project, project reference, region/data-residency choice, plan/spend cap, and project owner.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the controlled build environment.
- `SUPABASE_SERVICE_ROLE_KEY` only through a server-side secret store. Never expose the service key to the browser.
- Production Auth site/redirect URLs, transactional email provider/templates, and a private Storage bucket decision if the migration default must differ.
- Backup/PITR features, retention, RPO/RTO, restore-test owner, log retention, and database alert thresholds.

Remaining validation work: paid session lifetime/inactivity/single-session controls and leaked-password protection require an explicit Supabase Pro-plan spend decision; production Auth origins, SMTP/templates, account recovery, and customer MFA policy remain external. Approve scanning/extraction inputs before testing private upload/scan/signed-read expiry and replacement. Provide an isolated project plus approved RPO/RTO before restore testing. Review the recorded performance findings against expected workloads and authorization semantics before proposing a separately traceable migration.

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
