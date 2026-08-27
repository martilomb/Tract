# Security model

## Authorization

Organization membership is necessary but not sufficient for scoped resources. Administrators can manage configuration and permissions. Full-view users may read the organization but cannot manage permissions. Members receive additive department, technical-team, program, or part grants with explicit read, write, or approve permissions.

RLS helper functions are `security definer`, live outside the exposed schemas, pin `search_path` to an empty value, and fully qualify referenced objects. This follows Supabase's current RLS hardening guidance. Service credentials are server-only and never shipped to the browser.

The atomic agreement-activation function is callable only by authenticated users or the service role and rechecks organization-administrator authority inside the transaction; anonymous execution is revoked. Internal master-data existence helpers are not executable by browser roles, preventing cross-tenant identifier probing. Proposal, alias, merge, approval, and activation audit records retain the authenticated actor and reject cross-tenant entity or approver references.

The application-spine migration requires every permission grant to reference a same-tenant membership and makes `app.can_access_scope` fail unless that membership is active. This closes the verified stale-grant path for deactivated users. Membership identity is immutable, the final active administrator cannot be removed, demoted, or deactivated, and new/reactivated memberships plus pending invitations are serialized against an effective seat entitlement.

Production browser sessions are server-mediated. Access and refresh values are HttpOnly, SameSite cookies; the access token is validated with Supabase Auth for each session resolution, refresh remains server-only, organization selection is accepted only from RLS-returned active memberships, and sign-out attempts remote session revocation before reporting success. State-changing Auth/organization endpoints require same-origin requests. Credential and token values are excluded from application responses except for the one-time invitation link returned to its authorized creator, and request bodies are never logged.

The invitation acceptance RPC intentionally uses `SECURITY DEFINER` to keep membership creation, seat enforcement, invitation status, outbox evidence, and audit atomic. Its `search_path` is pinned; execute is revoked from public/anonymous roles; the authenticated caller must match the normalized invitation email and raw token digest; expired, used, wrong-user, cross-tenant, over-seat, and replay paths fail. The single corresponding security-advisor warning is reviewed and accepted for this bounded function, not treated as a blanket waiver for other security-definer functions.

## Data and documents

- Tenant ids cannot be reassigned after creation.
- Cross-tenant entity references are rejected at the database layer.
- The document bucket is private and has no authenticated `storage.objects` read policy.
- A server operation may issue a short-lived signed URL only after an organization/scope check.
- Document versions record size, MIME type, path, SHA-256, actor, and timestamp.
- Original ingestion objects are private and tenant-prefixed. Raw records, posted vehicle/ERP records, document-term postings, and economic-event postings are immutable.
- Approved and superseded part-revision terms are immutable. Approved agreement terms and linked scope are protected; activation and recovery posting require approval evidence.
- Connector activation stores opaque credential references only. IHS/AFS approval additionally requires documentation, samples, and a license reference.
- Connector administration and mapping versions are organization-administrator only. Staging pgTAP proves non-admin reads and cross-tenant writes are denied. Persisted endpoints must match their exact hostname allowlist, and mapping objects accept only approved declarative fields and operations.
- Mapped candidates cannot post until review and approval; organization-scoped economic-event uniqueness prevents a second source from posting the same event.
- A 25 MiB default limit and PDF/PNG/JPEG allowlist are enforced before scanning. Extraction can run only after a configured scanner returns a clean result with provider/version/time provenance and the extraction hash matches the scanned document. The production scanner and extractor still require approval.

## Secrets and logging

- `.env*`, `.dev.vars`, credentials, PDFs, source archives, and customer artifacts are ignored by Git.
- Cloudflare deployment declares required secrets and uses encrypted Worker secrets. Public Supabase URL and anonymous key are build configuration, not privileged credentials.
- Logs are structured and must contain request id, service, operation, duration, result, and non-sensitive entity ids. Never log access tokens, connector credentials, document content, raw import rows, contact email, or financial evidence payloads.
- Audit events are append-only and separate from operational logs.

## Browser and provider boundaries

- Worker responses set CSP, frame denial, MIME sniffing denial, opener/resource isolation, referrer and permissions policies, HSTS on HTTPS, request correlation, and `no-store` for HTML, API, and error responses.
- The CSP admits only the application origin, the configured HTTPS/WSS Supabase origin, data/blob image needs, and the local development websocket. TanStack hydration currently requires inline script/style allowance; removing that requires a request nonce propagated through the framework renderer.
- REST connectors never follow redirects, reject endpoint-embedded credentials and unsafe transport headers, and enforce byte/record/time/retry limits before mapping.
- Notification destinations are resolved from identity at delivery time. Outbox template data rejects destination and credential fields, while delivery results omit addresses and provider error text.

## Pending production decisions

MFA policy, enterprise SSO, data region/residency, malware scanner, retention duration, formal control mapping, penetration testing, and customer security questionnaires require customer or account-level decisions. No formal compliance claim is made.

Staging verification through migration `202608270001` reports RLS enabled on all 74 public tables, 138 public policies, one reviewed security-advisor warning for the bounded invitation RPC, and 85/85 transactional repository pgTAP assertions covering tenant, lifecycle, accounting, ingestion, and application-spine controls. These checks are representative controls, not a claim of exhaustive security proof.
