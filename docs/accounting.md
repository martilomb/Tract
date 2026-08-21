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
- One ISO 4217 settlement currency is used per accrual. The schema leaves room for versioned FX rates, but no conversion occurs until the rules are approved.
- Calculations retain exact decimal precision. Half-even rounding to two decimals is the default settlement/report boundary and is policy-controlled.
- A policy change requires a new version and effective date. Recalculation produces a visible new run and never silently replaces an earlier result.

The TypeScript implementation is in `src/domain/recovery.ts`; database storage and constraints are in `supabase/migrations/202608210002_product.sql`.
