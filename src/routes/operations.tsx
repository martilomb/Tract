import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Cable,
  FileSearch,
  FileSpreadsheet,
  History,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { DEFAULT_MATERIALITY_RULES } from "@/domain/analytics";
import { DataConnectionsWorkspace } from "@/components/operations/data-connections-workspace";
import {
  applyOperationsAction,
  initialSyntheticOperationsState,
  nextOperationsAction,
  type OperationsAction,
  type SyntheticOperationsState,
} from "@/domain/operations-workspace";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  ["connections", "Data connections"],
  ["imports", "Imports & runs"],
  ["documents", "Document review"],
  ["exceptions", "Exceptions & reconciliation"],
  ["rules", "Rules & policies"],
  ["audit", "Audit/monitoring"],
] as const;
type OperationsTab = (typeof tabs)[number][0];
type OperationsSearch = { tab?: OperationsTab };

export const Route = createFileRoute("/operations")({
  component: OperationsPage,
  validateSearch: (search: Record<string, unknown>): OperationsSearch => ({
    tab: tabs.some(([value]) => value === search.tab) ? (search.tab as OperationsTab) : undefined,
  }),
});
const runStages = [
  ["raw_received", "Immutable raw"],
  ["staged", "Stage"],
  ["validated", "Validate / reject"],
  ["mapped", "Map"],
  ["reviewed", "Review"],
  ["approved", "Approve"],
  ["posted", "Post"],
  ["reconciled", "Reconcile"],
] as const;
const syntheticLifecycleStorageKey = "tract.synthetic-operations-lifecycle.v1";
const actionLabels: Record<OperationsAction, string> = {
  create_draft: "Create connection draft",
  configure_transport: "Set transport and opaque authentication reference",
  configure_mapping: "Save declarative mapping v1",
  validate_sample: "Validate representative sample",
  safe_test: "Run safe synthetic test",
  receive_raw: "Receive immutable raw source",
  stage: "Stage raw rows",
  validate: "Validate rows and retain rejects",
  map: "Map validated candidates",
  review: "Complete named review",
  approve: "Record approval",
  post: "Post protected candidates",
  reconcile: "Reconcile counts",
  simulate_retryable_failure: "Record synthetic transient failure",
  retry: "Retry safe test",
  cancel: "Cancel run and retain evidence",
};

function OperationsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeTab = search.tab ?? "connections";
  const [state, setState] = useState<SyntheticOperationsState>(loadSyntheticOperationsState);
  const [documentReviewed, setDocumentReviewed] = useState(false);
  const [policyDraft, setPolicyDraft] = useState(false);
  const next = nextOperationsAction(state);
  useEffect(() => {
    window.sessionStorage.setItem(syntheticLifecycleStorageKey, JSON.stringify(state));
  }, [state]);
  const selectTab = (tab: OperationsTab) => {
    void navigate({ search: { tab: tab === "connections" ? undefined : tab }, replace: true });
  };
  const run = (action: OperationsAction) => {
    try {
      const nextState = applyOperationsAction(state, action);
      setState(nextState);
      toast.success(actionLabels[action], { description: nextState.audit.at(-1)?.detail });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation could not continue");
    }
  };
  const continueRun = () => {
    if (!next) return;
    run(next);
    selectTab(
      [
        "create_draft",
        "configure_transport",
        "configure_mapping",
        "validate_sample",
        "safe_test",
      ].includes(next)
        ? "connections"
        : "imports",
    );
  };
  const completeConnectionWizard = () => {
    setState((current) => {
      let updated = current;
      while (
        [
          "create_draft",
          "configure_transport",
          "configure_mapping",
          "validate_sample",
          "safe_test",
        ].includes(nextOperationsAction(updated) ?? "")
      ) {
        updated = applyOperationsAction(updated, nextOperationsAction(updated)!);
      }
      return updated;
    });
    toast.success("Connection draft available for the synthetic run", {
      description:
        "Configuration, representative sample validation, and the safe test are recorded locally.",
    });
  };
  return (
    <AppShell
      title="Operations"
      description="One controlled workspace for data connections, imports, review, reconciliation, rules, and monitoring."
      actions={
        <Button size="sm" onClick={continueRun} disabled={!next}>
          <PlayCircle className="mr-1.5 h-4 w-4" />{" "}
          {next ? actionLabels[next] : "Lifecycle complete"}
        </Button>
      }
    >
      <Card className="mb-5 border-blue-200 bg-blue-50/50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <strong>Synthetic demonstration run.</strong> It writes no records, resolves no
            credentials, and contacts no SAP, ERP, IHS, or AFS provider.
          </div>
          <Badge variant={state.run === "reconciled" ? "secondary" : "outline"}>
            Next: {next ? actionLabels[next] : "No further action"}
          </Badge>
        </CardContent>
      </Card>
      <Tabs value={activeTab} onValueChange={(value) => selectTab(value as OperationsTab)}>
        <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto rounded-lg bg-secondary p-1">
          {tabs.map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="shrink-0">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="connections" className="mt-0">
          <DataConnectionsWorkspace
            onOpenImports={() => selectTab("imports")}
            onValidatedDraft={completeConnectionWizard}
          />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cable className="h-4 w-4" /> Connection draft
                </CardTitle>
                <CardDescription>
                  Provider-neutral, tenant-scoped setup. Credentials use a masked runtime-only
                  reference.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ConnectionStep
                  label="Draft connection"
                  complete={state.connection !== "not_started"}
                  detail="SAP / ERP boundary; staging; owner: Enterprise IT administrator."
                />
                <ConnectionStep
                  label="Transport and authentication"
                  complete={[
                    "transport_configured",
                    "mapping_configured",
                    "sample_validated",
                    "safe_tested",
                  ].includes(state.connection)}
                  detail="HTTPS exact-host allowlist; OAuth 2; secret://••••/customer-erp. No token is stored or displayed."
                />
                <ConnectionStep
                  label="Declarative mapping"
                  complete={["mapping_configured", "sample_validated", "safe_tested"].includes(
                    state.connection,
                  )}
                  detail="Mapping v1 permits approved copy, trim, date, decimal, and constant operations only."
                />
                <ConnectionStep
                  label="Representative sample validation"
                  complete={["sample_validated", "safe_tested"].includes(state.connection)}
                  detail="Five synthetic records checked for required fields and reconciliation shape."
                />
                <ConnectionStep
                  label="Safe test"
                  complete={state.connection === "safe_tested"}
                  detail="Configuration-only test; live tests fail closed until approved specifications and runtime credentials exist."
                />
                {state.connection === "sample_validated" && !state.safeTestFailed && (
                  <Button variant="outline" onClick={() => run("simulate_retryable_failure")}>
                    <ShieldAlert className="mr-1.5 h-4 w-4" /> Demonstrate bounded retry
                  </Button>
                )}
                {state.safeTestFailed && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <span className="text-sm">
                      Synthetic timeout recorded. No provider was contacted.
                    </span>
                    <Button size="sm" onClick={() => run("retry")}>
                      <RotateCcw className="mr-1.5 h-4 w-4" /> Retry safe test
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <StatusCard state={state} />
          </div>
        </TabsContent>
        <TabsContent value="imports" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" /> Import run RUN-SYN-001
              </CardTitle>
              <CardDescription>
                Raw source objects and rows remain separate from mapped candidates and postings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {runStages.map(([key, label]) => (
                  <ConnectionStep
                    key={key}
                    label={label}
                    complete={isComplete(key, state.run)}
                    detail={runDetail(key, state)}
                  />
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={continueRun}
                  disabled={!next || state.connection !== "safe_tested"}
                >
                  {next ? actionLabels[next] : "Run complete"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!canCancel(state.run)}
                  onClick={() => run("cancel")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" /> Cancel run
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="h-4 w-4" /> Evidence-backed document review
              </CardTitle>
              <CardDescription>
                Original documents begin in Contracts. This queue handles candidate corrections and
                evidence review only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                Synthetic field candidate: recovery rate 0.125. A page reference, source excerpt,
                correction reason, and named reviewer are required before approval.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setDocumentReviewed(true);
                    toast.success("Synthetic document candidate reviewed", {
                      description: "No original was uploaded and no canonical record was written.",
                    });
                  }}
                  disabled={documentReviewed}
                >
                  <BadgeCheck className="mr-1.5 h-4 w-4" />{" "}
                  {documentReviewed ? "Review recorded" : "Record reviewed synthetic evidence"}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contracts">Open Contracts for originals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="exceptions" className="mt-0">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rejected-row traceability</CardTitle>
                <CardDescription>
                  Validation never mutates immutable raw source rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <Badge variant={state.rejectedRows ? "destructive" : "outline"}>
                  {state.rejectedRows} rejected
                </Badge>
                <p className="mt-3 text-muted-foreground">
                  Row 3: units must be a decimal number. Corrected data returns to Staged through a
                  new controlled attempt; it cannot silently change raw evidence.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reconciliation</CardTitle>
                <CardDescription>
                  Before approval, source, duplicate, candidate, exception, and posting totals must
                  be comparable.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <Badge variant={state.run === "reconciled" ? "secondary" : "outline"}>
                  {state.run === "reconciled" ? "0 variance" : "Awaiting reconciliation"}
                </Badge>
                <p className="mt-3 text-muted-foreground">
                  Synthetic result: 3 source rows · 2 candidates · 1 exception · 2 postings. No live
                  financial result is asserted.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="rules" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Versioned materiality rules</CardTitle>
              <CardDescription>
                Recovery alerts use approved, effective-dated rules. Overrides are bounded to a
                program or agreement and retain owner and audit evidence; there is no arbitrary DCR
                configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="p-2">Metric</th>
                      <th className="p-2">Threshold</th>
                      <th className="p-2">Effective</th>
                      <th className="p-2">Version / owner</th>
                      <th className="p-2">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_MATERIALITY_RULES.map((rule) => (
                      <tr key={rule.id} className="border-b">
                        <td className="p-2">{rule.metric}</td>
                        <td className="p-2">
                          USD {rule.absoluteAmount?.toLocaleString()} · {rule.percentage}%
                        </td>
                        <td className="p-2">{rule.effectiveFrom}</td>
                        <td className="p-2">
                          v{rule.version} · {rule.owner}
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary">{rule.approvalState}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
                <div className="flex-1">
                  <strong>
                    {policyDraft ? "v2 override draft prepared" : "No pending override draft"}
                  </strong>
                  <p className="mt-1 text-muted-foreground">
                    {policyDraft
                      ? "Effective 2026-09-01 · owner Finance controls · scope restricted to one selected program/agreement · activation requires organization-administrator permission."
                      : "Only an organization administrator may prepare a bounded synthetic override draft."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPolicyDraft(true)}
                  disabled={policyDraft}
                >
                  {policyDraft ? "Draft prepared" : "Prepare bounded override draft"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Audit and monitoring
              </CardTitle>
              <CardDescription>
                Sanitized synthetic evidence only. No raw customer rows, provider response bodies,
                or credential values are shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {state.audit.length === 0 ? (
                <p className="text-muted-foreground">
                  No controlled action has been taken. Start with the connection draft.
                </p>
              ) : (
                state.audit
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={entry.action + "-" + index}
                      className="border-l-2 border-primary/40 pl-3"
                    >
                      <div className="font-medium">{actionLabels[entry.action]}</div>
                      <div className="text-muted-foreground">{entry.detail}</div>
                    </div>
                  ))
              )}
              <div className="rounded-lg border bg-secondary/30 p-3">
                Monitoring state: safe synthetic test retries {state.retryCount}; live provider
                monitoring remains unavailable until activation inputs are approved.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
function ConnectionStep({
  label,
  complete,
  detail,
}: {
  label: string;
  complete: boolean;
  detail: string;
}) {
  return (
    <div
      className={
        "rounded-lg border p-3 " + (complete ? "border-emerald-200 bg-emerald-50/60" : "bg-card")
      }
    >
      <div className="flex items-center gap-2 font-medium">
        {complete ? (
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        )}
        {label}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
function StatusCard({ state }: { state: SyntheticOperationsState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connection boundary</CardTitle>
        <CardDescription>Provider status is explicit and fail-closed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground">System</div>
          <div className="font-medium">SAP / ERP extension boundary</div>
        </div>
        <div>
          <div className="text-muted-foreground">Live test</div>
          <Badge variant="outline">
            Blocked — approved interface specification and runtime secret resolution required
          </Badge>
        </div>
        <div>
          <div className="text-muted-foreground">Connection state</div>
          <div className="font-medium">{state.connection.replaceAll("_", " ")}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Run state</div>
          <div className="font-medium">{state.run.replaceAll("_", " ")}</div>
        </div>
      </CardContent>
    </Card>
  );
}
function canCancel(stage: string) {
  return !["not_started", "posted", "reconciled", "cancelled"].includes(stage);
}
function isComplete(stage: string, current: string) {
  return (
    runStages.findIndex(([key]) => key === current) >= runStages.findIndex(([key]) => key === stage)
  );
}
function runDetail(stage: string, state: SyntheticOperationsState) {
  if (stage === "raw_received") return String(state.rawRows) + " immutable source rows";
  if (stage === "validated")
    return String(state.validRows) + " valid · " + String(state.rejectedRows) + " rejected";
  if (stage === "reconciled")
    return state.run === "reconciled"
      ? "0 variance across source and posting totals"
      : "Awaiting controlled reconciliation";
  return "Controlled lifecycle evidence retained";
}

function loadSyntheticOperationsState(): SyntheticOperationsState {
  if (typeof window === "undefined") return initialSyntheticOperationsState;
  try {
    const stored = window.sessionStorage.getItem(syntheticLifecycleStorageKey);
    if (!stored) return initialSyntheticOperationsState;
    const parsed = JSON.parse(stored) as Partial<SyntheticOperationsState>;
    if (
      !Array.isArray(parsed.audit) ||
      typeof parsed.connection !== "string" ||
      typeof parsed.run !== "string"
    ) {
      return initialSyntheticOperationsState;
    }
    return { ...initialSyntheticOperationsState, ...parsed, audit: parsed.audit };
  } catch {
    return initialSyntheticOperationsState;
  }
}
