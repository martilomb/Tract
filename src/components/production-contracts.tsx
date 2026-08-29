import {
  ArrowLeft,
  Download,
  FileCheck2,
  FileWarning,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseProductionRecoveryWorkspace,
  type ProductionRecoveryAgreement,
  type ProductionRecoveryWorkspace,
} from "@/domain/production-contracts";
import { isApplicationSession, type ApplicationSession } from "@/domain/application-session";

type AuthenticatedSession = Extract<ApplicationSession, { status: "authenticated" }>;

type DraftFormState = {
  agreementId: string;
  agreementNumber: string;
  title: string;
  recoverableCost: string;
  settlementCurrency: string;
  eligibleVolumeBasis:
    "part_shipments" | "vehicle_production" | "invoiced_units" | "manual_approved";
  effectiveFrom: string;
  effectiveTo: string;
  expiresOn: string;
  contractualLimitAmount: string;
  forecastAssumptionsVersion: string;
  forecastBasis: string;
  annualGrowthPercent: string;
  scenario: string;
  evidenceReviewed: boolean;
  evidenceReference: string;
  evidenceSummary: string;
  programId: string;
  modelYearId: string;
  partId: string;
  partRevisionId: string;
  dcrId: string;
};

type RateState = {
  effectiveFrom: string;
  effectiveTo: string;
  perUnitRate: string;
};

export function ProductionContracts({
  session,
  initialAgreementId,
  onSignedOut,
}: {
  session: AuthenticatedSession;
  initialAgreementId?: string;
  onSignedOut: (session: ApplicationSession) => void;
}) {
  const [workspace, setWorkspace] = useState<ProductionRecoveryWorkspace>();
  const [selectedId, setSelectedId] = useState(initialAgreementId ?? "");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [setupOpen, setSetupOpen] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFormState>(() =>
    emptyDraft(session.selectedMembership.defaultCurrency),
  );
  const [rates, setRates] = useState<RateState[]>([
    { effectiveFrom: today(), effectiveTo: "", perUnitRate: "" },
  ]);
  const administrator = session.selectedMembership.role === "administrator";

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/contracts", { credentials: "same-origin" });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(payload));
      const nextWorkspace = parseProductionRecoveryWorkspace(payload);
      setWorkspace(nextWorkspace);
      setSelectedId((current) =>
        nextWorkspace.agreements.some((agreement) => agreement.id === current)
          ? current
          : (nextWorkspace.agreements[0]?.id ?? ""),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Recovery agreements could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = workspace?.agreements.find((agreement) => agreement.id === selectedId);
  const filteredModelYears = useMemo(
    () => workspace?.model_years.filter((year) => year.program_id === draft.programId) ?? [],
    [draft.programId, workspace],
  );
  const filteredParts = useMemo(
    () => workspace?.parts.filter((part) => part.program_id === draft.programId) ?? [],
    [draft.programId, workspace],
  );
  const filteredRevisions = useMemo(
    () => workspace?.revisions.filter((revision) => revision.part_id === draft.partId) ?? [],
    [draft.partId, workspace],
  );

  async function postAction(body: unknown): Promise<ProductionRecoveryWorkspace> {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/contracts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(payload));
      const nextWorkspace = parseProductionRecoveryWorkspace(payload);
      setWorkspace(nextWorkspace);
      return nextWorkspace;
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextWorkspace = await postAction({
        action: "save_draft",
        payload: {
          ...(draft.agreementId ? { agreementId: draft.agreementId } : {}),
          agreementNumber: draft.agreementNumber,
          title: draft.title,
          settlementCurrency: draft.settlementCurrency.toUpperCase(),
          recoverableCost: draft.recoverableCost,
          eligibleVolumeBasis: draft.eligibleVolumeBasis,
          ...(draft.effectiveFrom ? { effectiveFrom: draft.effectiveFrom } : {}),
          ...(draft.effectiveTo ? { effectiveTo: draft.effectiveTo } : {}),
          ...(draft.expiresOn ? { expiresOn: draft.expiresOn } : {}),
          roundingScale: 2,
          roundingMode: "half_even",
          ...(draft.contractualLimitAmount
            ? { contractualLimitAmount: draft.contractualLimitAmount }
            : {}),
          ...(draft.forecastAssumptionsVersion && draft.forecastBasis
            ? {
                forecastAssumptionsVersion: draft.forecastAssumptionsVersion,
                forecastAssumptions: {
                  basis: draft.forecastBasis,
                  annualGrowthPercent: draft.annualGrowthPercent || "0",
                  scenario: draft.scenario || "baseline",
                },
              }
            : {}),
          ...(draft.evidenceReviewed && draft.evidenceReference && draft.evidenceSummary
            ? {
                evidence: {
                  method: "manual_attestation",
                  reference: draft.evidenceReference,
                  summary: draft.evidenceSummary,
                },
              }
            : {}),
          ...(draft.programId ? { programId: draft.programId } : {}),
          ...(draft.modelYearId ? { modelYearId: draft.modelYearId } : {}),
          ...(draft.partId ? { partId: draft.partId } : {}),
          ...(draft.partRevisionId ? { partRevisionId: draft.partRevisionId } : {}),
          ...(draft.dcrId ? { dcrId: draft.dcrId } : {}),
          ratePeriods: rates
            .filter((rate) => rate.effectiveFrom && rate.perUnitRate)
            .map((rate) => ({
              effectiveFrom: rate.effectiveFrom,
              ...(rate.effectiveTo ? { effectiveTo: rate.effectiveTo } : {}),
              perUnitRate: rate.perUnitRate,
              currency: draft.settlementCurrency.toUpperCase(),
            })),
        },
      });
      const saved = nextWorkspace.agreements.find(
        (agreement) => agreement.agreement_number === draft.agreementNumber,
      );
      if (saved) {
        setSelectedAgreement(saved);
        editAgreement(saved);
      }
      setSetupOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The draft could not be saved.");
    }
  }

  async function activate(agreement: ProductionRecoveryAgreement) {
    try {
      const nextWorkspace = await postAction({
        action: "activate",
        payload: { agreementId: agreement.id },
      });
      const activated = nextWorkspace.agreements.find((candidate) => candidate.id === agreement.id);
      if (activated) setSelectedAgreement(activated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recovery activation was denied.");
    }
  }

  function editAgreement(agreement: ProductionRecoveryAgreement) {
    if (agreement.status !== "draft") return;
    const forecast = agreement.forecast_assumptions;
    setDraft({
      agreementId: agreement.id,
      agreementNumber: agreement.agreement_number,
      title: agreement.title,
      recoverableCost: agreement.recoverable_cost,
      settlementCurrency: agreement.settlement_currency,
      eligibleVolumeBasis: agreement.eligible_volume_basis as DraftFormState["eligibleVolumeBasis"],
      effectiveFrom: agreement.effective_from ?? "",
      effectiveTo: agreement.effective_to ?? "",
      expiresOn: agreement.expires_on ?? "",
      contractualLimitAmount: agreement.contractual_limit_amount ?? "",
      forecastAssumptionsVersion: agreement.forecast_assumptions_version ?? "",
      forecastBasis: typeof forecast.basis === "string" ? forecast.basis : "",
      annualGrowthPercent:
        typeof forecast.annual_growth_percent === "string" ? forecast.annual_growth_percent : "0",
      scenario: typeof forecast.scenario === "string" ? forecast.scenario : "baseline",
      evidenceReviewed: agreement.evidence_review_method === "manual_attestation",
      evidenceReference: agreement.evidence_reference ?? "",
      evidenceSummary: agreement.evidence_summary ?? "",
      programId: agreement.program_ids[0] ?? "",
      modelYearId: agreement.model_year_ids[0] ?? "",
      partId: agreement.part_links[0]?.part_id ?? "",
      partRevisionId: agreement.part_links[0]?.part_revision_id ?? "",
      dcrId: agreement.dcr_ids[0] ?? "",
    });
    setRates(
      agreement.rate_periods.length
        ? agreement.rate_periods.map((rate) => ({
            effectiveFrom: rate.effective_from,
            effectiveTo: rate.effective_to ?? "",
            perUnitRate: rate.per_unit_rate,
          }))
        : [
            {
              effectiveFrom: agreement.effective_from ?? today(),
              effectiveTo: "",
              perUnitRate: "",
            },
          ],
    );
    setSetupOpen(true);
  }

  function setSelectedAgreement(agreement: ProductionRecoveryAgreement) {
    setSelectedId(agreement.id);
    const url = new URL(window.location.href);
    url.searchParams.set("agreement", agreement.id);
    window.history.replaceState(null, "", url);
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <a
              href="/"
              className="inline-flex min-h-6 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Organization workspace
            </a>
            <h1 className="mt-1 text-2xl font-bold">Recovery Agreements and Contracts</h1>
            <p className="text-sm text-muted-foreground">
              {session.selectedMembership.organizationName} ·{" "}
              {session.selectedMembership.role.replace("_", " ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Refresh
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "same-origin",
                  });
                  const payload: unknown = await response.json();
                  if (!response.ok || !isApplicationSession(payload)) {
                    throw new Error("The session could not be closed safely.");
                  }
                  onSignedOut(payload);
                } catch (caught) {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "The session could not be closed safely.",
                  );
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <strong>Atomic recovery boundary.</strong> Drafts persist safely, but activation succeeds
          only when reviewed agreement evidence, exact linked master data, current rates, volume
          basis, rounding, and forecast assumptions all pass the tenant-scoped database transaction.
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {loading && !workspace ? (
          <div className="flex min-h-64 items-center justify-center gap-3" aria-busy>
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Loading authorized
            agreements…
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Agreement register</h2>
                  <p className="text-xs text-muted-foreground">
                    {workspace?.agreements.length ?? 0} authorized records
                  </p>
                </div>
                {administrator && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setDraft(emptyDraft(session.selectedMembership.defaultCurrency));
                      setRates([{ effectiveFrom: today(), effectiveTo: "", perUnitRate: "" }]);
                      setSetupOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" aria-hidden /> Set up
                  </Button>
                )}
              </div>
              <div className="mt-4 max-h-[65vh] space-y-2 overflow-y-auto pr-1">
                {workspace?.agreements.length ? (
                  workspace.agreements.map((agreement) => (
                    <button
                      key={agreement.id}
                      type="button"
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        agreement.id === selectedId
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedAgreement(agreement)}
                    >
                      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {agreement.status.replace("_", " ")}
                      </span>
                      <span className="mt-1 block font-semibold">{agreement.agreement_number}</span>
                      <span className="block text-sm text-muted-foreground">{agreement.title}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                    No agreement is visible in this organization. Administrators can retain an
                    incomplete draft with Set up.
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
              {setupOpen && administrator ? (
                <RecoverySetupForm
                  workspace={workspace!}
                  draft={draft}
                  setDraft={setDraft}
                  rates={rates}
                  setRates={setRates}
                  filteredModelYears={filteredModelYears}
                  filteredParts={filteredParts}
                  filteredRevisions={filteredRevisions}
                  submitting={submitting}
                  masterOpen={masterOpen}
                  setMasterOpen={setMasterOpen}
                  onCreateMasterData={async (payload) => {
                    try {
                      const next = await postAction({ action: "create_master_data", payload });
                      setMasterOpen(false);
                      setWorkspace(next);
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "Master data creation was denied.",
                      );
                    }
                  }}
                  onCancel={() => setSetupOpen(false)}
                  onSubmit={saveDraft}
                />
              ) : selected ? (
                <AgreementDetail
                  workspace={workspace!}
                  agreement={selected}
                  administrator={administrator}
                  submitting={submitting}
                  onEdit={() => editAgreement(selected)}
                  onActivate={() => void activate(selected)}
                />
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <FileCheck2 className="h-10 w-10 text-muted-foreground" aria-hidden />
                  <h2 className="mt-3 font-semibold">Select or create an agreement</h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Enabled production controls use only tenant-scoped Supabase persistence. No demo
                    agreement is substituted here.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function RecoverySetupForm({
  workspace,
  draft,
  setDraft,
  rates,
  setRates,
  filteredModelYears,
  filteredParts,
  filteredRevisions,
  submitting,
  masterOpen,
  setMasterOpen,
  onCreateMasterData,
  onCancel,
  onSubmit,
}: {
  workspace: ProductionRecoveryWorkspace;
  draft: DraftFormState;
  setDraft: React.Dispatch<React.SetStateAction<DraftFormState>>;
  rates: RateState[];
  setRates: React.Dispatch<React.SetStateAction<RateState[]>>;
  filteredModelYears: ProductionRecoveryWorkspace["model_years"];
  filteredParts: ProductionRecoveryWorkspace["parts"];
  filteredRevisions: ProductionRecoveryWorkspace["revisions"];
  submitting: boolean;
  masterOpen: boolean;
  setMasterOpen: (open: boolean) => void;
  onCreateMasterData: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const field = (name: keyof DraftFormState) => ({
    value: String(draft[name]),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setDraft((current) => ({ ...current, [name]: event.target.value })),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Set up / activate recovery</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save at any point. Incomplete work remains a draft; no active recovery is created.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Close setup
        </Button>
      </div>

      <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <FileWarning className="mr-2 inline h-4 w-4" aria-hidden />
        Private file upload and automated extraction are disabled until an approved malware scanner,
        retention policy, Storage signing flow, and extraction provider are configured. Manual
        review attestation records the commercial evidence without claiming a live provider.
      </div>

      <Button
        className="mt-4"
        type="button"
        variant="outline"
        onClick={() => setMasterOpen(!masterOpen)}
      >
        {masterOpen ? "Hide governed master-data form" : "Create governed program and part records"}
      </Button>
      {masterOpen && <MasterDataForm submitting={submitting} onSubmit={onCreateMasterData} />}

      <form className="mt-6 space-y-7" onSubmit={(event) => void onSubmit(event)}>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-semibold sm:col-span-2">1. Agreement</legend>
          <Field label="Agreement number">
            <Input {...field("agreementNumber")} required />
          </Field>
          <Field label="Title">
            <Input {...field("title")} required />
          </Field>
          <Field label="Recoverable cost">
            <Input inputMode="decimal" {...field("recoverableCost")} required />
          </Field>
          <Field label="Currency">
            <Input maxLength={3} {...field("settlementCurrency")} required />
          </Field>
          <Field label="Effective from">
            <Input type="date" {...field("effectiveFrom")} />
          </Field>
          <Field label="Effective to">
            <Input type="date" {...field("effectiveTo")} />
          </Field>
          <Field label="Expires on">
            <Input type="date" {...field("expiresOn")} />
          </Field>
          <Field label="Contractual limit (optional)">
            <Input inputMode="decimal" {...field("contractualLimitAmount")} />
          </Field>
          <Field label="Eligible-volume basis">
            <select className={selectClass} {...field("eligibleVolumeBasis")}>
              <option value="part_shipments">Approved part shipments</option>
              <option value="vehicle_production">
                Vehicle production with approved part rules
              </option>
              <option value="invoiced_units">Approved invoiced units</option>
              <option value="manual_approved">Manually approved eligible volume</option>
            </select>
          </Field>
          <Field label="Rounding">
            <Input value="Half to even · 2 decimal places" readOnly aria-readonly />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-semibold sm:col-span-2">2. Controlled links</legend>
          <Field label="Program / model">
            <select
              className={selectClass}
              value={draft.programId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  programId: event.target.value,
                  modelYearId: "",
                  partId: "",
                  partRevisionId: "",
                }))
              }
            >
              <option value="">Select program</option>
              {workspace.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} · {program.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Model year">
            <select className={selectClass} {...field("modelYearId")}>
              <option value="">Select model year</option>
              {filteredModelYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.model_year}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Part number">
            <select
              className={selectClass}
              value={draft.partId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  partId: event.target.value,
                  partRevisionId: "",
                }))
              }
            >
              <option value="">Select part</option>
              {filteredParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.part_number} · {part.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effective revision">
            <select className={selectClass} {...field("partRevisionId")}>
              <option value="">Select revision</option>
              {filteredRevisions.map((revision) => (
                <option key={revision.id} value={revision.id}>
                  {revision.revision_code} · effective {revision.effective_from}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Approved DCR (optional)">
            <select className={selectClass} {...field("dcrId")}>
              <option value="">DCR managed outside Tract</option>
              {workspace.dcrs.map((dcr) => (
                <option key={dcr.id} value={dcr.id}>
                  {dcr.dcr_number} · {dcr.title}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-semibold">3. Rate periods</legend>
          {rates.map((rate, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
              <Field label="From">
                <Input
                  type="date"
                  value={rate.effectiveFrom}
                  onChange={(event) =>
                    updateRate(setRates, index, "effectiveFrom", event.target.value)
                  }
                />
              </Field>
              <Field label="To (optional)">
                <Input
                  type="date"
                  value={rate.effectiveTo}
                  onChange={(event) =>
                    updateRate(setRates, index, "effectiveTo", event.target.value)
                  }
                />
              </Field>
              <Field label={`Per-unit rate (${draft.settlementCurrency})`}>
                <Input
                  inputMode="decimal"
                  value={rate.perUnitRate}
                  onChange={(event) =>
                    updateRate(setRates, index, "perUnitRate", event.target.value)
                  }
                />
              </Field>
              {rates.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setRates((current) => current.filter((_, candidate) => candidate !== index))
                  }
                >
                  Remove period
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRates((current) => [
                ...current,
                { effectiveFrom: draft.effectiveFrom || today(), effectiveTo: "", perUnitRate: "" },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden /> Add rate period
          </Button>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-semibold sm:col-span-2">4. Forecast assumptions</legend>
          <Field label="Assumptions version">
            <Input {...field("forecastAssumptionsVersion")} placeholder="e.g. baseline-2026-08" />
          </Field>
          <Field label="Scenario">
            <Input {...field("scenario")} />
          </Field>
          <Field label="Annual growth percent">
            <Input inputMode="decimal" {...field("annualGrowthPercent")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Eligible-volume forecast basis">
              <Textarea {...field("forecastBasis")} rows={3} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-semibold">5. Manual agreement evidence</legend>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={draft.evidenceReviewed}
              onChange={(event) =>
                setDraft((current) => ({ ...current, evidenceReviewed: event.target.checked }))
              }
            />
            <span>
              I am an authorized administrator and reviewed the executed agreement outside the
              inactive document provider.
            </span>
          </label>
          <Field label="Evidence reference">
            <Input
              {...field("evidenceReference")}
              placeholder="Controlled contract register reference"
            />
          </Field>
          <Field label="Review summary">
            <Textarea {...field("evidenceSummary")} rows={4} />
          </Field>
        </fieldset>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden />
            )}
            Save incomplete draft
          </Button>
        </div>
      </form>
    </div>
  );
}

function MasterDataForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void onSubmit({
          oemName: form.get("oemName"),
          oemCode: form.get("oemCode"),
          makeName: form.get("makeName"),
          modelCode: form.get("modelCode"),
          modelName: form.get("modelName"),
          programCode: form.get("programCode"),
          programName: form.get("programName"),
          modelYear: Number(form.get("modelYear")),
          partNumber: form.get("partNumber"),
          partDescription: form.get("partDescription"),
          revisionCode: form.get("revisionCode"),
          revisionDescription: form.get("revisionDescription"),
          effectiveFrom: form.get("effectiveFrom"),
          exceptionReason: form.get("exceptionReason"),
        });
      }}
    >
      <p className="text-sm text-muted-foreground sm:col-span-2">
        This administrator-reviewed exception creates a tenant-managed OEM, make, model, program,
        model year, part, and approved effective revision together. Case-insensitive duplicates are
        rejected; select an existing record instead.
      </p>
      {[
        ["oemName", "OEM"],
        ["oemCode", "OEM code"],
        ["makeName", "Make"],
        ["modelCode", "Model code"],
        ["modelName", "Model"],
        ["programCode", "Program code"],
        ["programName", "Program name"],
        ["modelYear", "Model year"],
        ["partNumber", "Part number"],
        ["partDescription", "Part description"],
        ["revisionCode", "Revision code"],
        ["revisionDescription", "Revision description"],
      ].map(([name, label]) => (
        <Field key={name} label={label}>
          <Input name={name} type={name === "modelYear" ? "number" : "text"} required />
        </Field>
      ))}
      <Field label="Effective from">
        <Input name="effectiveFrom" type="date" defaultValue={today()} required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Administrator-reviewed exception reason">
          <Textarea name="exceptionReason" rows={3} required />
        </Field>
      </div>
      <Button className="sm:col-span-2" type="submit" disabled={submitting}>
        Create controlled records
      </Button>
    </form>
  );
}

function AgreementDetail({
  workspace,
  agreement,
  administrator,
  submitting,
  onEdit,
  onActivate,
}: {
  workspace: ProductionRecoveryWorkspace;
  agreement: ProductionRecoveryAgreement;
  administrator: boolean;
  submitting: boolean;
  onEdit: () => void;
  onActivate: () => void;
}) {
  const program = workspace.programs.find((item) => item.id === agreement.program_ids[0]);
  const year = workspace.model_years.find((item) => item.id === agreement.model_year_ids[0]);
  const part = workspace.parts.find((item) => item.id === agreement.part_links[0]?.part_id);
  const revision = workspace.revisions.find(
    (item) => item.id === agreement.part_links[0]?.part_revision_id,
  );
  const dcr = workspace.dcrs.find((item) => item.id === agreement.dcr_ids[0]);
  const activeAccrual = agreement.accruals.find((accrual) => accrual.active);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {agreement.status.replace("_", " ")}
          </span>
          <h2 className="mt-1 text-2xl font-bold">{agreement.agreement_number}</h2>
          <p className="text-muted-foreground">{agreement.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/contracts?format=csv&agreement=${encodeURIComponent(agreement.id)}`}>
              <Download className="mr-2 h-4 w-4" aria-hidden /> Download scoped evidence
            </a>
          </Button>
          {administrator && agreement.status === "draft" && (
            <Button variant="outline" onClick={onEdit}>
              Edit draft
            </Button>
          )}
          {administrator && agreement.status === "draft" && (
            <Button onClick={onActivate} disabled={submitting}>
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden /> Review and activate atomically
            </Button>
          )}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Recoverable cost"
          value={`${agreement.settlement_currency} ${agreement.recoverable_cost}`}
        />
        <Metric
          label="Contractual limit"
          value={
            agreement.contractual_limit_amount
              ? `${agreement.settlement_currency} ${agreement.contractual_limit_amount}`
              : "No separate limit"
          }
        />
        <Metric
          label="Eligible volume"
          value={agreement.eligible_volume_basis.replaceAll("_", " ")}
        />
        <Metric
          label="Effective period"
          value={`${agreement.effective_from ?? "Not set"} → ${agreement.effective_to ?? "Open"}`}
        />
        <Metric label="Expiry" value={agreement.expires_on ?? "No separate expiry"} />
        <Metric
          label="Rounding"
          value={`${agreement.rounding_mode.replaceAll("_", " ")} · ${agreement.rounding_scale} decimals`}
        />
      </dl>

      <section>
        <h3 className="font-semibold">Linked controlled records</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Metric
            label="Program / model"
            value={program ? `${program.code} · ${program.name}` : "Missing"}
          />
          <Metric label="Model year" value={year ? String(year.model_year) : "Missing"} />
          <Metric
            label="Part number"
            value={part ? `${part.part_number} · ${part.description ?? ""}` : "Missing"}
          />
          <Metric
            label="Revision"
            value={
              revision
                ? `${revision.revision_code} · effective ${revision.effective_from}`
                : "Missing"
            }
          />
          <Metric
            label="DCR"
            value={dcr ? `${dcr.dcr_number} · ${dcr.title}` : "Managed outside Tract"}
          />
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Rate periods</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Per-unit rate</th>
                <th className="p-3">Currency</th>
              </tr>
            </thead>
            <tbody>
              {agreement.rate_periods.map((rate) => (
                <tr key={rate.id} className="border-t">
                  <td className="p-3">{rate.effective_from}</td>
                  <td className="p-3">{rate.effective_to ?? "Open"}</td>
                  <td className="p-3 font-mono">{rate.per_unit_rate}</td>
                  <td className="p-3">{rate.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Evidence and assumptions</h3>
          <p className="mt-3 text-sm">
            <strong>Evidence:</strong>{" "}
            {agreement.evidence_review_method === "manual_attestation"
              ? "Manual authorized review"
              : (agreement.evidence_review_method ?? "Not reviewed")}
          </p>
          <p className="mt-1 text-sm">
            <strong>Reference:</strong> {agreement.evidence_reference ?? "Not recorded"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {agreement.evidence_summary ?? "No review summary."}
          </p>
          <p className="mt-3 text-sm">
            <strong>Forecast version:</strong>{" "}
            {agreement.forecast_assumptions_version ?? "Not recorded"}
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(agreement.forecast_assumptions, null, 2)}
          </pre>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Activation and provenance</h3>
          <p className="mt-3 text-sm">
            <strong>Recovery:</strong>{" "}
            {activeAccrual ? `Active · ${activeAccrual.id}` : "No active accrual"}
          </p>
          <p className="mt-1 text-sm">
            <strong>Source:</strong> {workspace.source}
          </p>
          <p className="mt-1 text-sm">
            <strong>Calculation version:</strong> {workspace.calculation_version}
          </p>
          <p className="mt-1 text-sm">
            <strong>As of:</strong> {workspace.as_of}
          </p>
          <p className="mt-3 text-sm">
            <strong>Approval:</strong>{" "}
            {agreement.approvals.length
              ? agreement.approvals
                  .map(
                    (approval) =>
                      `${approval.stage} · ${approval.decision}${approval.decided_at ? ` · ${approval.decided_at}` : ""}`,
                  )
                  .join("; ")
              : "No approval decision recorded"}
          </p>
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Audit history</h3>
        <div className="mt-3 space-y-2">
          {agreement.audit.length ? (
            agreement.audit.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>
                  {event.action} · {event.entity_type}
                </span>
                <time dateTime={event.occurred_at}>{event.occurred_at}</time>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No authorized audit event is visible.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function updateRate(
  setRates: React.Dispatch<React.SetStateAction<RateState[]>>,
  index: number,
  field: keyof RateState,
  value: string,
) {
  setRates((current) =>
    current.map((rate, candidate) => (candidate === index ? { ...rate, [field]: value } : rate)),
  );
}

function emptyDraft(currency: string): DraftFormState {
  return {
    agreementId: "",
    agreementNumber: "",
    title: "",
    recoverableCost: "",
    settlementCurrency: currency,
    eligibleVolumeBasis: "part_shipments",
    effectiveFrom: today(),
    effectiveTo: "",
    expiresOn: "",
    contractualLimitAmount: "",
    forecastAssumptionsVersion: "",
    forecastBasis: "",
    annualGrowthPercent: "0",
    scenario: "baseline",
    evidenceReviewed: false,
    evidenceReference: "",
    evidenceSummary: "",
    programId: "",
    modelYearId: "",
    partId: "",
    partRevisionId: "",
    dcrId: "",
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function responseMessage(value: unknown): string {
  return value && typeof value === "object" && "message" in value
    ? String(value.message)
    : "The recovery workspace request failed.";
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
