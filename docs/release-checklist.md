# Release checklist

- [ ] Product owner supplies or approves the Git remote; no remote is connected yet.
- [x] Local `pnpm install --frozen-lockfile` and `pnpm check` pass.
- [x] Dependency review has no known production vulnerabilities.
- [ ] Supabase migrations apply cleanly to a fresh local database.
- [ ] `supabase db lint` and `supabase test db` pass, including anonymous and cross-tenant denial.
- [ ] Generated database types are committed and server queries use them.
- [ ] Authentication, invitation, password reset, MFA policy, session expiry, and multi-organization switching pass browser tests.
- [ ] Private document upload, scan, signed read, expiry, replacement, and denial pass.
- [ ] Calculation replay produces the same input hash, lines, exact values, and policy version.
- [ ] Import duplicate, partial failure, retry, cancellation, and reconciliation pass.
- [ ] Full keyboard, screen-reader, contrast, and supported-browser certification passes; the 390 x 844 responsive shell and primary navigation have passed locally.
- [ ] Backup restore evidence satisfies the approved RPO/RTO.
- [ ] Structured logs, alerts, incident ownership, spend limits, and retention are configured.
- [x] Production builds fail closed when the required connection is absent; demonstration mode requires an explicit build-time flag and is visibly labelled.
- [x] No unsupported integration, compliance, accounting, or predictive claim is presented as an active capability.
