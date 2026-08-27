import { invariant } from "./errors";

export type OperationsConnectionState =
  | "not_started"
  | "draft"
  | "transport_configured"
  | "mapping_configured"
  | "sample_validated"
  | "safe_tested";

export type OperationsRunStage =
  | "not_started"
  | "raw_received"
  | "staged"
  | "validated"
  | "mapped"
  | "reviewed"
  | "approved"
  | "posted"
  | "reconciled"
  | "cancelled";

export type OperationsAction =
  | "create_draft"
  | "configure_transport"
  | "configure_mapping"
  | "validate_sample"
  | "safe_test"
  | "receive_raw"
  | "stage"
  | "validate"
  | "map"
  | "review"
  | "approve"
  | "post"
  | "reconcile"
  | "simulate_retryable_failure"
  | "retry"
  | "cancel";

export interface OperationsAuditEntry {
  readonly action: OperationsAction;
  readonly detail: string;
}

export interface SyntheticOperationsState {
  readonly connection: OperationsConnectionState;
  readonly run: OperationsRunStage;
  readonly safeTestFailed: boolean;
  readonly retryCount: number;
  readonly rawRows: number;
  readonly validRows: number;
  readonly rejectedRows: number;
  readonly audit: readonly OperationsAuditEntry[];
}

export const initialSyntheticOperationsState: SyntheticOperationsState = Object.freeze({
  connection: "not_started",
  run: "not_started",
  safeTestFailed: false,
  retryCount: 0,
  rawRows: 0,
  validRows: 0,
  rejectedRows: 0,
  audit: Object.freeze([]),
});

function record(
  state: SyntheticOperationsState,
  action: OperationsAction,
  detail: string,
  changes: Partial<SyntheticOperationsState>,
): SyntheticOperationsState {
  return Object.freeze({
    ...state,
    ...changes,
    audit: Object.freeze([...state.audit, Object.freeze({ action, detail })]),
  });
}

export function nextOperationsAction(state: SyntheticOperationsState): OperationsAction | null {
  if (state.run === "cancelled" || state.run === "reconciled") return null;
  if (state.connection === "not_started") return "create_draft";
  if (state.connection === "draft") return "configure_transport";
  if (state.connection === "transport_configured") return "configure_mapping";
  if (state.connection === "mapping_configured") return "validate_sample";
  if (state.connection === "sample_validated") return "safe_test";
  if (state.run === "not_started") return "receive_raw";
  if (state.run === "raw_received") return "stage";
  if (state.run === "staged") return "validate";
  if (state.run === "validated") return "map";
  if (state.run === "mapped") return "review";
  if (state.run === "reviewed") return "approve";
  if (state.run === "approved") return "post";
  if (state.run === "posted") return "reconcile";
  return null;
}

export function applyOperationsAction(
  state: SyntheticOperationsState,
  action: OperationsAction,
): SyntheticOperationsState {
  if (action === "retry") {
    invariant(
      state.safeTestFailed,
      "Only a failed safe test can be retried",
      "operations_retry_denied",
    );
    return record(state, action, "Retry scheduled after the bounded synthetic failure.", {
      safeTestFailed: false,
      retryCount: state.retryCount + 1,
    });
  }
  if (action === "simulate_retryable_failure") {
    invariant(
      state.connection === "sample_validated",
      "Validate a representative sample first",
      "operations_test_denied",
    );
    return record(state, action, "Synthetic timeout recorded without contacting a provider.", {
      safeTestFailed: true,
    });
  }
  if (action === "cancel") {
    invariant(
      state.run !== "not_started" && !["posted", "reconciled", "cancelled"].includes(state.run),
      "Only a non-terminal import may be cancelled",
      "operations_cancel_denied",
    );
    return record(state, action, "Run cancelled with raw evidence retained for audit.", {
      run: "cancelled",
    });
  }

  const expected = nextOperationsAction(state);
  invariant(
    action === expected,
    "This action is not available yet",
    "operations_transition_denied",
  );
  switch (action) {
    case "create_draft":
      return record(state, action, "Provider-neutral connection draft created for this tenant.", {
        connection: "draft",
      });
    case "configure_transport":
      return record(
        state,
        action,
        "HTTPS transport and opaque runtime-only secret reference recorded.",
        { connection: "transport_configured" },
      );
    case "configure_mapping":
      return record(
        state,
        action,
        "Declarative mapping v1 saved; executable expressions remain unavailable.",
        { connection: "mapping_configured" },
      );
    case "validate_sample":
      return record(
        state,
        action,
        "Five representative synthetic rows passed mapping validation.",
        { connection: "sample_validated" },
      );
    case "safe_test":
      invariant(
        !state.safeTestFailed,
        "Retry the failed safe test before continuing",
        "operations_test_retry_required",
      );
      return record(
        state,
        action,
        "Safe synthetic test passed; no credential or provider request was used.",
        { connection: "safe_tested" },
      );
    case "receive_raw":
      return record(
        state,
        action,
        "Immutable synthetic source object and three raw rows received.",
        { run: "raw_received", rawRows: 3 },
      );
    case "stage":
      return record(state, action, "Raw rows staged separately from canonical business records.", {
        run: "staged",
      });
    case "validate":
      return record(
        state,
        action,
        "Two rows validated; one rejected row remains traceable for correction.",
        { run: "validated", validRows: 2, rejectedRows: 1 },
      );
    case "map":
      return record(state, action, "Two validated rows mapped with declarative mapping v1.", {
        run: "mapped",
      });
    case "review":
      return record(
        state,
        action,
        "Named reviewer confirmed the mapped sample and exception evidence.",
        { run: "reviewed" },
      );
    case "approve":
      return record(
        state,
        action,
        "Approval recorded; candidates are immutable except for posting.",
        { run: "approved" },
      );
    case "post":
      return record(
        state,
        action,
        "Two synthetic candidates posted with unique economic-event keys.",
        { run: "posted" },
      );
    case "reconcile":
      return record(
        state,
        action,
        "Source, candidate, exception, and posting counts reconciled with zero variance.",
        { run: "reconciled" },
      );
    default:
      return state;
  }
}
