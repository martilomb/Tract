# Security model

## Authorization

Organization membership is necessary but not sufficient for scoped resources. Administrators can manage configuration and permissions. Full-view users may read the organization but cannot manage permissions. Members receive additive department, technical-team, program, or part grants with explicit read, write, or approve permissions.

RLS helper functions are `security definer`, live outside the exposed schemas, pin `search_path` to an empty value, and fully qualify referenced objects. This follows Supabase's current RLS hardening guidance. Service credentials are server-only and never shipped to the browser.

## Data and documents

- Tenant ids cannot be reassigned after creation.
- Cross-tenant entity references are rejected at the database layer.
- The document bucket is private and has no authenticated `storage.objects` read policy.
- A server operation may issue a short-lived signed URL only after an organization/scope check.
- Document versions record size, MIME type, path, SHA-256, actor, and timestamp.
- Original ingestion objects are private and tenant-prefixed. Raw records, posted vehicle/ERP records, document-term postings, and economic-event postings are immutable.
- Connector activation stores opaque credential references only. IHS/AFS approval additionally requires documentation, samples, and a license reference.
- Mapped candidates cannot post until review and approval; organization-scoped economic-event uniqueness prevents a second source from posting the same event.
- A 25 MiB default limit is enforced. Malware scanning and permitted MIME policy must be selected before production activation.

## Secrets and logging

- `.env*`, `.dev.vars`, credentials, PDFs, source archives, and customer artifacts are ignored by Git.
- Cloudflare deployment declares required secrets and uses encrypted Worker secrets. Public Supabase URL and anonymous key are build configuration, not privileged credentials.
- Logs are structured and must contain request id, service, operation, duration, result, and non-sensitive entity ids. Never log access tokens, connector credentials, document content, raw import rows, contact email, or financial evidence payloads.
- Audit events are append-only and separate from operational logs.

## Pending production decisions

MFA policy, enterprise SSO, data region/residency, malware scanner, retention duration, formal control mapping, penetration testing, and customer security questionnaires require customer or account-level decisions. No formal compliance claim is made.
