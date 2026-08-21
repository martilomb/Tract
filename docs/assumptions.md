# Assumptions and unresolved decisions

## Implemented defaults

- The approved recovery formula, signed-event corrections, effective-dated rates, exact decimals, one settlement currency per accrual, and boundary-only rounding are implemented as policy version 1.
- Organization is the tenant boundary. Memberships may span organizations. Grants are additive within one organization.
- The default DCR lifecycle is Draft → Submitted → Under Review → Approved → Active → Closed, with Rejected and Cancelled terminal paths.
- IHS, AFS, or both are confirmed vehicle-volume source options behind one neutral file/API adapter. Development uses staged CSV/Excel until provider documentation, licensing, samples, and credentials are supplied.
- SAP and other ERPs are confirmed operational-source options behind customer-specific declarative mappings. Original values are preserved and recoverability is never inferred.
- Contract/DCR extraction is evidence-backed and human-approved. Development uses a deterministic empty-field extractor and manual review.
- Configuration is versioned, effective-dated, permission-controlled, declarative, and auditable.

## Deliberately not claimed or automated

- IHS, AFS, SAP, email/SMS, SSO, or production extraction is not connected.
- No predictive accuracy, machine-learning training, blockchain, formal SOX compliance, profit release, financial posting, claim eligibility, or contractual clawback is claimed.
- The app does not infer contract rights from under- or over-recovery.

## Pending production inputs

- IHS/AFS provider specification, licensed use/retention, cadence, schemas, samples, and credentials.
- Customer SAP/ERP transports, object/API specifications, network policy, mapping rules, samples, credentials, and schedules.
- Customer identity provider, MFA/SSO policy, region/residency, RPO/RTO, retention, incident terms, and formal control requirements.
- Required document types, languages, malware scanning, field mappings, human-review roles, and approved extraction provider.
- Customer claim-pack and approval templates, notification recipients/channels, FX sources, and multi-currency settlement rules.
