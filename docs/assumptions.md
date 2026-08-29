# Assumptions and unresolved decisions

## Confirmed product model and terminology

- Programs, part numbers/revisions, DCRs, and contracts/recovery agreements are separate canonical records with separate creation workflows.
- The normal commercial journey nevertheless uses one atomic **Set up / activate recovery** workflow. It may link an approved DCR or omit it when the customer manages DCRs elsewhere, but activation and posting always require a reviewed, approved, effective agreement and complete program/part/rate/volume-basis setup.
- Programs and parts may exist before a recovery agreement for governed master data and import matching. Ordinary users do not receive prominent orphan-producing creation actions; authorized administrators/integrations retain controlled maintenance with duplicate detection, effective dates, approval, and provenance.
- Contracts have a dedicated navigation area because one agreement may govern multiple programs, model years, parts, and DCRs. Other pages link to the canonical agreement rather than duplicating contract creation.
- A DCR may be drafted before a contract exists. Configured evidence and approvals gate later DCR transitions, and an approved recovery agreement is required before recovery activation or accounting posting.
- A redesigned part is introduced through a DCR and a new part number or effective-dated revision under the existing program unless a genuinely new vehicle program/carline is being created.
- IHS/AFS vehicle identifiers and customer master-data mappings are selected from governed mappings rather than repeatedly entered as uncontrolled free text.
- “Disposition” means accounting treatment of an over-recovered balance, not a legal deposition. Plain-language user interfaces use “Accounting treatment” or “Over-recovery decision.”
- A vehicle program may contain parts from many commodities. Commodity behavior is based on explicit part relationships, not a synthetic one-commodity-per-program assignment.
- A Platform is a shared vehicle architecture that can support multiple vehicle programs. Product copy uses **Vehicle architecture (optional)**; a Program remains the OEM/customer-specific vehicle or carline project and lifecycle.
- NHTSA vPIC may be configured as an optional US seed/validation adapter. It is not authoritative for confidential/future programs or global coverage and is not activated without approval.

## Implemented defaults

- The approved recovery formula, signed-event corrections, effective-dated rates, exact decimals, one settlement currency per accrual, and boundary-only rounding are implemented as policy version 1.
- Organization is the tenant boundary. Memberships may span organizations. Grants are additive within one organization.
- The default DCR lifecycle is Draft → Submitted → Under Review → Approved → Active → Closed, with Rejected and Cancelled terminal paths.
- The current release keeps that fixed lifecycle and the existing evidence/role transition rules. An arbitrary custom-property designer, granular per-property permissions, stage-specific required-field configuration UI, automation engine, and broadly customizable pipeline builder are deferred to a future enterprise-configuration phase and have no placeholder controls.
- Table, Board drag/drop, and the accessible stage menu are alternative views over that same fixed DCR state machine. No view can bypass role, evidence, approved-effective-agreement, or complete-recovery-setup gates; a blocked move retains the prior stage.
- IHS, AFS, or both are confirmed vehicle-volume source options behind one neutral file/API adapter. Development uses staged CSV/Excel until provider documentation, licensing, samples, and credentials are supplied.
- SAP and other ERPs are confirmed operational-source options behind customer-specific declarative mappings. Original values are preserved and recoverability is never inferred.
- Enterprise connector drafts can be created and configuration/synthetic samples can be validated without credentials. A live test remains blocked unless an approved interface specification and opaque runtime secret reference are available; persisted configuration never contains the credential value.
- Contract/DCR extraction is evidence-backed and human-approved. Development uses a deterministic empty-field extractor and manual review.
- Configuration is versioned, effective-dated, permission-controlled, declarative, and auditable.
- Analysis uses one organization/Program/Part scope and one canonical aggregation layer across UI and exports. Deterministic demonstration fixtures must reconcile directly; fixed presentation anchors and proportional normalization are prohibited.
- Demonstration recovery setup may create a local Active record only after the same reviewed-evidence, compatible controlled links, rate/currency/basis/rounding/forecast, and optional approved-DCR prerequisites pass. The local result is explicitly synthetic and never claims a database or accounting posting.
- Overview deliberately separates organization-wide content from scoped analysis: six organization-wide headline tiles, important alerts, quarterly review queue, and OEM recovery sit above the OEM/program/model-year/part selector, which scopes only the graph/table and Active Programs below it.
- Programs, Part Numbers, Recoveries, and Forecasts provide full analytical coverage through progressive drill-down rather than exposing every database field at once. Every visualization answers a stated business question and reconciles to its table and export.
- Thresholds are configurable, versioned **materiality rules**, not contractual caps. The neutral default action is evidence review and scoped report export, not a remedy, claim, clawback, or accounting posting.
- Non-production staging Auth uses invitation or administrator-created accounts, exact port-8081 local redirects, required email confirmation, a 12-character minimum password, one-hour access JWTs, refresh rotation/reuse detection, and optional free TOTP. Public self-signup is disabled. Paid session timeouts, single-session enforcement, and leaked-password protection remain inactive pending an approved Supabase Pro-plan spend decision.

## Deliberately not claimed or automated

- IHS, AFS, SAP, email/SMS, SSO, or production extraction is not connected.
- No predictive accuracy, machine-learning training, blockchain, formal SOX compliance, profit release, financial posting, claim eligibility, or contractual clawback is claimed.
- The app does not infer contract rights from under- or over-recovery.

## Pending production inputs

- IHS/AFS provider specification, licensed use/retention, cadence, schemas, samples, and credentials.
- Customer SAP/ERP transports, object/API specifications, network policy, mapping rules, samples, credentials, and schedules.
- Customer identity provider, mandatory MFA/SSO and recovery policy, production Auth origins, transactional email, paid session-control decision, region/residency, RPO/RTO, retention, incident terms, and formal control requirements.
- Required document types, languages, malware scanning, field mappings, human-review roles, and approved extraction provider.
- Customer claim-pack and approval templates, notification recipients/channels, FX sources, and multi-currency settlement rules.
