# Recovery accounting policy

The initial policy is version 1 and follows the approved default:

```text
recovered = sum(signed eligible units × effective approved per-unit rate)
remaining = approved recoverable cost + approved adjustments − recovered
under-recovery = max(remaining, 0)
over-recovery = max(-remaining, 0)
```

## Processing rules

- An eligible event must match exactly one approved rate period on its event date.
- Approved rate periods for an accrual cannot overlap.
- Returns and corrections are new signed events. Historical source events are never rewritten.
- Duplicate event identifiers within an organization and source are rejected.
- The initial policy includes actual, correction, and return events. Forecast events are included only in a versioned projection, not actual recovery.
- Every new eligible volume event references an effective approved eligible-volume policy. Its basis is contract/accrual controlled: part shipments, vehicle production, invoiced units, or explicit manual approval.
- Vehicle-production values remain source units. Conversion to part units requires an approved effective parts-per-vehicle, take-rate, and allocation rule; only actual data can create an actual-volume candidate.
- SAP/ERP costs and quantities preserve their source classification and do not become recoverable merely because the customer exposed them.
- Approved contract documents and human-confirmed structured terms define contractual rules. Extraction output alone is never an accounting source of truth.
- IHS/AFS, SAP/ERP, and contract sources remain independent and reconcile rather than overwrite. The posting registry rejects a second posting for the same economic-event key.
- One ISO 4217 settlement currency is used per accrual. The schema leaves room for versioned FX rates, but no conversion occurs until the rules are approved.
- Calculations retain exact decimal precision. Half-even rounding to two decimals is the default settlement/report boundary and is policy-controlled.
- A policy change requires a new version and effective date. Recalculation produces a visible new run and never silently replaces an earlier result.
- Dashboard under- and over-recovery exposures are gross sums by selected record and do not net opposing program or part positions. Projected variance remains the net identity `forecast at completion − total recoverable cost`.
- Forecast alerts use approved, versioned materiality rules with explicit absolute/percentage bases and documented program/agreement overrides. These rules are not contractual caps and do not authorize claims, remedies, clawbacks, releases, or postings.
- Recovery activation is all-or-nothing. An approved effective agreement, reviewed document/version evidence, controlled program/model-year/part links, compatible currency and rate periods, and every linked draft accrual must validate in one transaction. An optional DCR must be Approved or Active; customers that govern DCRs elsewhere may omit it. A failure leaves the agreement and all accruals inactive, and direct Active-state updates are denied.
- The synthetic Contracts journey applies the same prerequisites before it returns a local Active agreement: one compatible program/model-year/part link, reviewed evidence, non-overlapping settlement-currency rate periods, confirmed eligible-volume basis, half-even 0.01 boundary, and versioned forecast assumptions. It produces no accounting posting and clearly labels its state as demonstration-only.

The TypeScript calculation is in `src/domain/recovery.ts`; source qualification is in `src/domain/ingestion.ts`. Database storage and constraints are in migrations `202608210002_product.sql`, `202608210003_ingestion_domains.sql`, and the additive Milestone 10 migrations through `202608240003_milestone10_acceptance_controls.sql`.
