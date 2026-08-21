# Import and connector contract

## Commit pipeline

1. Upload or fetch source bytes and record source metadata.
2. Compute a SHA-256 fingerprint over organization, connector, and content.
3. Reject a previously committed fingerprint unless an administrator explicitly creates a new versioned run.
4. Parse CSV or the first Excel worksheet.
5. Apply a versioned declarative column mapping.
6. Stage every row with source data, normalized data, validation status, and errors.
7. Require zero rejected rows or an explicit approved partial-commit policy.
8. Insert immutable volume events using organization/source/external-id uniqueness.
9. Reconcile staged, committed, duplicate, and rejected counts and retain the run history.

CSV parsing, validation, and fingerprinting live in `src/domain/imports.ts`. Excel parsing is server-only in `src/server/excel-import.server.ts`. Spreadsheet exports neutralize formula prefixes.

## REST adapter

The REST mapping contract accepts property-name paths only. It requires HTTPS, a host allowlist, opaque credential reference, 1–30 second timeout, at most five retries, scalar mapped values, idempotency, and bounded response size. Redirects to a different host must be rejected by the runtime adapter.

## SAP adapter

The SAP boundary supports an approved OData, REST, or file-drop transport. It requires interface specifications, customer-approved network access, secret-store references, stable reconciliation keys, cadence, volume semantics, and test data. The presence of the adapter contract is not a claim that SAP is connected.

No connector configuration may contain scripts, expressions, SQL, templates with evaluation, or arbitrary outbound headers.
