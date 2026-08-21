# Ingestion and connector contract

## Confirmed source domains

Tract has three primary ingestion domains:

1. **Vehicle volume:** IHS, AFS, or both may supply external vehicle-production actuals, forecasts, revisions, and scenarios through files or APIs. Provider adapters are replaceable. No live integration is represented until documentation, licensing, approved samples, and credentials exist.
2. **Contract and DCR documents:** approved PDFs and configured formats provide contractual, engineering, tooling, amortization, rate, date, currency, volume-basis, adjustment, and approval terms. Extracted values are candidates only; document evidence plus human approval makes structured terms authoritative.
3. **SAP and ERP:** customer systems may supply shipments, purchase orders, invoices, material documents, costs, corrections, reversals, and returns. Original values, currencies, source fields, transaction ids, timestamps, and mapping versions remain intact. Availability never implies recoverability.

Development uses staged CSV/Excel, deterministic document fields, and manual review. The connector registry keeps IHS, AFS, and SAP disabled until their provider-specific activation evidence is supplied.

## Shared lifecycle

`Received → Staged → Validated → Mapped → Reviewed → Approved → Posted`

Rejected and failed records remain traceable and can return to Staged after correction. Review, approval, and posting are separate permission gates. Every transition retains actor, time, reason where required, mapping version, and audit history.

The persistence layers are deliberately separate:

- `ingestion_batches` records the stored original object, SHA-256, provider, transport, metadata, counts, and lifecycle.
- `raw_ingestion_records` preserves every source record immutably, including duplicates and revisions.
- `ingestion_candidates` stores version-mapped canonical candidates and validation results without changing raw payloads.
- `ingestion_exceptions` and `reconciliation_runs` retain missing mappings, duplicates, conflicts, revisions, and count differences.
- `ingestion_postings` admits only approved candidates and has an organization-scoped unique economic-event key, preventing the same event from posting twice.

## Vehicle volume mapping

Source rows retain provider ids, hashes, period, kind, and original production units. Versioned mappings resolve OEM, vehicle program, vehicle model, plant, region, and relevant Tract parts. Forecasts are immutable versions and are never overwritten.

External vehicle production is not automatically eligible recovery volume. An accrual has an approved effective-dated basis: part shipments, vehicle production, invoiced units, or explicit manual approval. Vehicle-production conversion additionally requires an approved effective part rule containing decimal-safe parts-per-vehicle, take rate, and allocation. Forecast, revised, and scenario records cannot post as actual eligible units.

## Document ingestion

Original documents are private, hashed, and versioned. An extraction provider returns text blocks, tables, candidate fields, confidence, warnings, and page/table evidence. A populated candidate cannot be approved without evidence. Corrections require a reason, evidence, reviewer identity, and timestamp. Only approved field candidates can create a destination posting for a contract, DCR, part, program, supplier, rate, or accrual.

The deterministic development adapter performs no content interpretation or external request. A production extraction provider and malware scanner remain activation-gated.

## SAP and ERP mapping

The common SAP/ERP adapter supports REST, OData, and approved file drops, plus manual or scheduled runs. Customer-specific objects remain declarative mapping configuration rather than executable code. The canonical transaction preserves shipment quantities/dates, plant/supplier/customer/program/model/part identifiers, transaction references, original cost value, currency, source field, source timestamp, and mapping version. Corrections, reversals, returns, duplicates, and reconciliation remain explicit.

## Connector controls

- Files use organization-and-connector SHA-256 fingerprints; API snapshots are also stored as original source objects.
- REST requires HTTPS, an allowlist, bounded timeouts/retries/responses, and scalar property-path mappings.
- Credentials are opaque secret-store references, never values in configuration.
- Scheduled and manual runs share the same validation, idempotency, reconciliation, history, and monitoring.
- Redirects to a different host are rejected by the runtime adapter.
- No configuration may contain scripts, expressions, SQL, evaluated templates, arbitrary headers, or customer-supplied executable code.

Domain rules live in `src/domain/ingestion.ts`, file staging in `src/domain/imports.ts`, provider contracts in `src/domain/connectors.ts`, and the canonical schema in `supabase/migrations/202608210003_ingestion_domains.sql`.
