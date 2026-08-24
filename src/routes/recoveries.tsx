import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Paperclip, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { StatCard, StatusPill } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney } from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import { useAnalysis } from "@/hooks/use-analysis";
import {
  DEFAULT_ANALYSIS_SCOPE,
  type AnalysisRecord,
  type AnalysisSnapshot,
} from "@/domain/analytics";
import { createEvidenceManifest, toCsv } from "@/domain/reports";

type RecoverySearch = {
  oem?: string;
  programId?: string;
  modelYear?: number;
  partId?: string;
};

export const Route = createFileRoute("/recoveries")({
  component: RecoveriesPage,
  validateSearch: (search: Record<string, unknown>): RecoverySearch => ({
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear:
      Number.isInteger(Number(search.modelYear)) && Number(search.modelYear) >= 1900
        ? Number(search.modelYear)
        : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
  }),
});
const DISPLAY_LIMIT = 40;

function RecoveriesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { programs, parts } = useDataset();
  const [selection, setSelection] = useState<HierarchySelection>({
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: search.modelYear === undefined ? "all" : String(search.modelYear),
    partId: search.partId ?? "all",
  });
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [evidenceRecord, setEvidenceRecord] = useState<AnalysisRecord | null>(null);
  const snapshot = useAnalysis({
    ...DEFAULT_ANALYSIS_SCOPE,
    dimension: "part",
    oem: selection.oem,
    programId: selection.programId,
    modelYear: selection.modelYear === "all" ? "all" : Number(selection.modelYear),
    partId: selection.partId ?? "all",
  });
  const under = useMemo(
    () => snapshot.partRecords.filter((row) => row.projectedVariance < 0).sort(byMagnitude),
    [snapshot.partRecords],
  );
  const over = useMemo(
    () => snapshot.partRecords.filter((row) => row.projectedVariance > 0).sort(byMagnitude),
    [snapshot.partRecords],
  );
  const selected = over.filter((record) => selectedIds[record.id]);
  const display = [...under, ...over].sort(byMagnitude).slice(0, DISPLAY_LIMIT);
  const updateScope = (next: HierarchySelection) => {
    setSelection(next);
    void navigate({
      search: {
        oem: next.oem === "all" ? undefined : next.oem,
        programId: next.programId === "all" ? undefined : next.programId,
        modelYear: next.modelYear === "all" ? undefined : Number(next.modelYear),
        partId: !next.partId || next.partId === "all" ? undefined : next.partId,
      },
    });
  };
  const exportScope = () =>
    download(
      `tract-recovery-scope-${snapshot.provenance.asOf.slice(0, 10)}.csv`,
      toCsv(snapshot.partRecords.map((record) => csvRow(snapshot, record))),
    );
  const exportPackage = () => {
    if (!selected.length) return;
    const manifest = createEvidenceManifest({
      organizationId: snapshot.provenance.organization,
      reportType: "over-recovery-evidence-review",
      generatedAt: snapshot.provenance.asOf,
      generatedBy: "Synthetic demonstration user",
      policyVersions: [snapshot.provenance.calculationVersion, snapshot.provenance.forecastVersion],
      calculationRunIds: [snapshot.provenance.sourceVersion],
      documentHashes: selected.flatMap((record) => record.evidenceIds),
    });
    const body = selected.map((record) => ({
      ...csvRow(snapshot, record),
      "Review outcome": "Unreviewed — no remedy or posting inferred",
    }));
    download(
      `tract-over-recovery-review-${snapshot.provenance.asOf.slice(0, 10)}.csv`,
      `Evidence manifest\r\n${JSON.stringify(manifest)}\r\n\r\n${toCsv(body)}\r\n`,
    );
  };
  return (
    <AppShell
      title="Recovery Reviews"
      description="Evidence-first review of under- and over-recovery. Amounts are deterministic synthetic calculations, not financial postings."
      actions={
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <FileText className="mr-1.5 h-4 w-4" /> Print current scope
        </Button>
      }
    >
      <section className="card-elevated p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Analytical scope · OEM → program / model → model year → part number
        </h2>
        <div className="mt-3">
          <HierarchicalProgramSelector
            programs={programs}
            parts={parts}
            showPart
            value={selection}
            onChange={updateScope}
          />
        </div>
        <Provenance snapshot={snapshot} />
      </section>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Projected under-recovery"
          value={formatMoney(snapshot.metrics.underRecovery, { compact: true })}
          delta={0}
          deltaLabel="evidence review required"
          icon={<TrendingDown className="h-5 w-5" />}
          accent="destructive"
        />
        <StatCard
          label="Projected over-recovery"
          value={formatMoney(snapshot.metrics.overRecovery, { compact: true })}
          delta={0}
          deltaLabel="evidence review required"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Net projected variance"
          value={formatMoney(snapshot.metrics.projectedVariance, { compact: true })}
          delta={0}
          deltaLabel={`${snapshot.partRecords.length} matching part records`}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="brand"
        />
      </div>
      <section className="mt-6 card-elevated p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Projected variance by part number</h2>
            <p className="text-xs text-muted-foreground">
              Top {Math.min(DISPLAY_LIMIT, snapshot.partRecords.length)} material records from the
              same unpaginated scope; exports retain the full scope.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportScope}>
            <Download className="mr-1.5 h-4 w-4" /> Export current scope
          </Button>
        </div>
        <div className="mt-4 h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={display} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatMoney(Number(value), { compact: true })}
              />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              <Bar dataKey="projectedVariance" name="Projected variance" radius={[0, 4, 4, 0]}>
                {display.map((record) => (
                  <Cell
                    key={record.id}
                    fill={
                      record.projectedVariance >= 0 ? "oklch(0.62 0.15 155)" : "oklch(0.6 0.22 27)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReviewQueue
          title="Under-recovery review queue"
          records={under}
          tone="under"
          onEvidence={setEvidenceRecord}
        />
        <ReviewQueue
          title="Over-recovery review queue"
          records={over}
          tone="over"
          selectable
          selected={selectedIds}
          onSelect={(id, checked) => setSelectedIds((current) => ({ ...current, [id]: checked }))}
          onEvidence={setEvidenceRecord}
        />
      </div>
      <section className="mt-6 card-elevated overflow-hidden">
        <div className="gradient-navy px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            Download selected over-recovery review package
          </h2>
          <p className="mt-1 text-xs text-white/70">
            Selection produces a deterministic, scoped CSV evidence package. It does not post,
            release profit, issue a claim, or prescribe a remedy.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="text-sm">
            <strong>{selected.length}</strong> selected ·{" "}
            <strong>
              {formatMoney(
                selected.reduce((total, record) => total + record.projectedVariance, 0),
                { compact: true },
              )}
            </strong>{" "}
            projected over-recovery
          </div>
          <Button disabled={!selected.length} onClick={exportPackage}>
            <Download className="mr-1.5 h-4 w-4" /> Download review package
          </Button>
        </div>
      </section>
      {evidenceRecord && (
        <section className="mt-6 card-elevated p-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Evidence and calculation provenance · {evidenceRecord.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {evidenceRecord.secondaryLabel} · {formatMoney(evidenceRecord.projectedVariance)}{" "}
                projected variance
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEvidenceRecord(null)}>
              Close evidence
            </Button>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {evidenceRecord.evidenceIds.map((id) => (
              <li key={id} className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                {id}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Private agreement originals require permission-checked access in Contracts. This
            synthetic fixture lists references only.
          </p>
        </section>
      )}
    </AppShell>
  );
}
function byMagnitude(left: AnalysisRecord, right: AnalysisRecord) {
  return Math.abs(right.projectedVariance) - Math.abs(left.projectedVariance);
}
function csvRow(snapshot: AnalysisSnapshot, record: AnalysisRecord) {
  return {
    "Demo data": "Synthetic — not persisted or live",
    Organization: snapshot.provenance.organization,
    Scope: snapshot.scopeLabel,
    "As of": snapshot.provenance.asOf,
    Currency: snapshot.provenance.currency,
    "Calculation version": snapshot.provenance.calculationVersion,
    "Forecast version": snapshot.provenance.forecastVersion,
    Record: record.label,
    Context: record.secondaryLabel,
    "Recoverable cost": record.totalRecoverableCost.toFixed(2),
    "Recovered to date": record.recoveredToDate.toFixed(2),
    "Forecast at completion": record.forecastAtCompletion.toFixed(2),
    "Projected variance": record.projectedVariance.toFixed(2),
    "Evidence references": record.evidenceIds.join(" | "),
  };
}
function Provenance({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {snapshot.scopeLabel} · As of {new Date(snapshot.provenance.asOf).toLocaleString()} ·{" "}
      {snapshot.provenance.currency} · Calculation {snapshot.provenance.calculationVersion} ·
      Forecast {snapshot.provenance.forecastVersion} · Synthetic demonstration data
    </p>
  );
}
function ReviewQueue({
  title,
  records,
  tone,
  selectable = false,
  selected = {},
  onSelect,
  onEvidence,
}: {
  title: string;
  records: AnalysisRecord[];
  tone: "under" | "over";
  selectable?: boolean;
  selected?: Record<string, boolean>;
  onSelect?: (id: string, checked: boolean) => void;
  onEvidence: (record: AnalysisRecord) => void;
}) {
  const rows = records.slice(0, 12);
  return (
    <section className="card-elevated p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">
        {records.length} matching records · neutral evidence review; no accounting treatment is
        inferred.
      </p>
      <div className="mt-4 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
        {rows.map((record) => (
          <div key={record.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start gap-3">
              {selectable && (
                <Checkbox
                  aria-label={`Select ${record.label} for review-package download`}
                  checked={Boolean(selected[record.id])}
                  onCheckedChange={(checked) => onSelect?.(record.id, Boolean(checked))}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{record.label}</div>
                    <div className="text-xs text-muted-foreground">{record.secondaryLabel}</div>
                  </div>
                  <div
                    className={
                      tone === "under"
                        ? "font-mono text-sm font-semibold text-destructive"
                        : "font-mono text-sm font-semibold text-success"
                    }
                  >
                    {record.projectedVariance > 0 ? "+" : ""}
                    {formatMoney(record.projectedVariance, { compact: true })}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <StatusPill {...{ label: record.status, className: "", dot: "" }} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onEvidence(record)}
                  >
                    <Paperclip className="mr-1 h-3 w-3" /> View evidence
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!rows.length && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No matching records require this review.
          </div>
        )}
      </div>
      {records.length > rows.length && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the first {rows.length} by variance magnitude. Export retains all {records.length}{" "}
          records in scope.
        </p>
      )}
    </section>
  );
}
function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
