import { describe, expect, it } from "vitest";

import {
  applyOperationsAction,
  initialSyntheticOperationsState,
  nextOperationsAction,
} from "@/domain/operations-workspace";

describe("synthetic Operations workspace lifecycle", () => {
  it("moves one safe synthetic run from draft through reconciliation with rejected-row traceability", () => {
    const actions = [
      "create_draft",
      "configure_transport",
      "configure_mapping",
      "validate_sample",
      "safe_test",
      "receive_raw",
      "stage",
      "validate",
      "map",
      "review",
      "approve",
      "post",
      "reconcile",
    ] as const;
    const result = actions.reduce(applyOperationsAction, initialSyntheticOperationsState);

    expect(result).toMatchObject({
      connection: "safe_tested",
      run: "reconciled",
      rawRows: 3,
      validRows: 2,
      rejectedRows: 1,
    });
    expect(result.audit).toHaveLength(actions.length);
    expect(nextOperationsAction(result)).toBeNull();
  });

  it("keeps retry and cancellation bounded and auditable", () => {
    const configured = (
      ["create_draft", "configure_transport", "configure_mapping", "validate_sample"] as const
    ).reduce(applyOperationsAction, initialSyntheticOperationsState);
    const failed = applyOperationsAction(configured, "simulate_retryable_failure");
    const retried = applyOperationsAction(failed, "retry");
    expect(retried).toMatchObject({ safeTestFailed: false, retryCount: 1 });

    const staged = (["safe_test", "receive_raw", "stage"] as const).reduce(
      applyOperationsAction,
      retried,
    );
    const cancelled = applyOperationsAction(staged, "cancel");
    expect(cancelled.run).toBe("cancelled");
    expect(cancelled.audit.at(-1)?.detail).toMatch(/raw evidence retained/i);
    expect(() => applyOperationsAction(cancelled, "post")).toThrow(/not available yet/i);
  });
});
