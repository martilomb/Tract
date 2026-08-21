# Operations runbook

## Health and logs

`GET /api/health` returns `200 ready` only when the required Supabase configuration is valid; otherwise it returns `503 degraded`. It never tests with or returns secret material. Cloudflare observability is configured at 10% head sampling for the initial pilot; adjust sampling against traffic and cost after measuring.

Alert on sustained 5xx rate, repeated authorization denial spikes, failed calculation/import/extraction jobs, ingestion batches stalled in one lifecycle state, open material revisions/source conflicts, reconciliation count differences, duplicate-posting attempts, outbox retry exhaustion, and database/storage quota thresholds. Preserve request ids across Worker, Supabase, connector, and outbox operations.

## Backup and recovery

Before production activation:

1. Select the Supabase plan and region.
2. Confirm backup and point-in-time recovery features against the required RPO/RTO.
3. Perform a restore into an isolated project.
4. Verify migration level, tenant counts, latest audit id, document object counts, calculation hashes, and a sample signed document URL.
5. Record evidence and repeat at the agreed cadence.

Backups are not considered proven until a restore test passes. Customer retention and deletion schedules remain pending; legal holds must override ordinary deletion.

## Incident response

1. Triage severity and stop the affected connector/job without deleting evidence.
2. Rotate exposed credentials through the provider secret store.
3. Preserve structured logs, audit ids, calculation/input hashes, and source fingerprints.
4. Identify organizations and scopes affected without disclosing another tenant's data.
5. Restore or append corrective events; never rewrite financial or audit history.
6. Notify stakeholders under the approved incident and contractual policy.
7. Complete a corrective-action review and add regression tests.

## Release rollback

Application deployments are versioned and may roll back to the last verified Worker version. Database migrations are forward-only: every migration needs a reviewed corrective migration rather than destructive rollback. Feature activation stays behind configuration state until migrations, RLS tests, smoke tests, and backup evidence pass.
