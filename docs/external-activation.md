# External activation inputs

All useful local implementation is complete without accounts, credentials, paid services, Docker, PostgreSQL, or the Supabase CLI. The items below are the consolidated inputs needed to validate and activate hosted behavior. Secrets should be placed in the approved secret store or CI environment, not committed or pasted into source files.

## 1. GitHub repository connection

Provide or approve:

- GitHub organization/account, repository name, visibility, and the empty repository URL.
- The maintainer(s) allowed to connect this local history, push `main`, and create pull requests.
- Default-branch protection: require the `quality / verify` and `quality / database` checks, at least one reviewer, resolved conversations, and no force-push/deletion.
- Permission for GitHub Actions and Dependabot; decide who reviews weekly dependency and Actions updates.
- CI/environment ownership and the approved method for adding repository or environment secrets.

Activation work: add the approved remote, push the existing commits, verify both CI jobs, enable branch protection/Dependabot, and record the repository and release owner. No remote is configured locally today.

## 2. Supabase staging and database validation

Provide or approve:

- A non-production Supabase staging project, project reference, region/data-residency choice, plan/spend cap, and project owner.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the controlled build environment.
- `SUPABASE_SERVICE_ROLE_KEY` only through a server-side secret store, plus the approved Supabase CLI authentication/project-link method. Never expose the service key to the browser.
- Auth site URL/redirect URLs and a private Storage bucket decision if the migration default must differ.
- Backup/PITR features, retention, RPO/RTO, restore-test owner, log retention, and database alert thresholds.

Validation work: apply migrations `202608210001`–`003` to a fresh staging database with pinned CLI `2.111.0`; run `supabase db lint` and `supabase test db`; generate and commit database types; test anonymous denial, cross-tenant/scoped access, invitation/reset/session/MFA flows, organization switching, private upload/scan/signed-read expiry, ingestion transitions, duplicate posting, and a restore into an isolated project.

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

## 7. Authoritative business configuration

Provide the approved, versioned rules for eligible-volume basis per accrual; rate/effective-date precedence; settlement currency and rounding; FX source/timing if multi-currency is required; corrections/returns/negative adjustments; caps; claim eligibility; clawbacks; over-recovery/profit-release disposition; DCR/claim approval stages; and notification/escalation recipients. The local engine keeps these concerns configurable and does not infer contractual or accounting rights.
