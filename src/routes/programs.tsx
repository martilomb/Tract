import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, ExternalLink, Table2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { Button } from "@/components/ui/button";
import { formatMoney, programModelYears } from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import {
  analysisCsv,
  buildAnalysisSnapshot,
  DEFAULT_ANALYSIS_SCOPE,
  type AnalysisSnapshot,
} from "@/domain/analytics";

type ProgramSearch = {
  oem?: string;
  programId?: string;
  modelYear?: number;
  partId?: string;
  view?: "chart" | "table";
};

export const Route = createFileRoute("/programs")({
  component: ProgramsPage,
  validateSearch: (search: Record<string, unknown>): ProgramSearch => ({
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear:
      Number.isInteger(Number(search.modelYear)) && Number(search.modelYear) >= 1900
        ? Number(search.modelYear)
        : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
    view: search.view === "table" ? "table" : search.view === "chart" ? "chart" : undefined,
  }),
});

function download(snapshot: AnalysisSnapshot) {
  const url = URL.createObjectURL(
    new Blob([analysisCsv(snapshot)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tract-programs-analysis.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function ProgramsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { programs, parts } = useDataset();
  const [selection, setSelection] = useState<HierarchySelection>({
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: search.modelYear === undefined ? "all" : String(search.modelYear),
    partId: !search.partId || search.partId === "all" ? undefined : search.partId,
  });
  const snapshot = useMemo(
    () =>
      buildAnalysisSnapshot(
        { programs, parts, programModelYears },
        {
          ...DEFAULT_ANALYSIS_SCOPE,
          dimension: "program",
          oem: selection.oem,
          programId: selection.programId,
          modelYear: selection.modelYear === "all" ? "all" : Number(selection.modelYear),
          partId: selection.partId ?? "all",
        },
      ),
    [programs, parts, selection],
  );
  const updateScope = (next: HierarchySelection) => {
    setSelection(next);
    void navigate({
      search: {
        ...search,
        oem: next.oem,
        programId: next.programId,
        modelYear: next.modelYear === "all" ? undefined : Number(next.modelYear),
        partId: next.partId ?? "all",
      },
    });
  };

  return (
    <AppShell
      title="Vehicle Programs"
      description="Analytical recovery position for controlled OEM programs. Program master data is maintained by authorized administrators or integrations."
      actions={
        <>
          <Button asChild size="sm">
            <Link to="/contracts">Set up / activate recovery</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/settings" hash="master-data">
              Admin master data
            </Link>
          </Button>
        </>
      }
    >
      <section className="card-elevated mb-5 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Analysis scope · OEM → program / model → model year → part number
        </div>
        <HierarchicalProgramSelector
          programs={programs}
          parts={parts}
          showPart
          value={selection}
          onChange={updateScope}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {snapshot.scopeLabel}. Values are deterministic synthetic fixtures, reconciled by the
          shared calculation layer; no live provider data is represented.
        </p>
      </section>
      <Summary snapshot={snapshot} />
      <section className="card-elevated mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Recovery curve</h2>
            <p className="text-xs text-muted-foreground">
              Actual, contractual curve and forecast at completion for the selected scope.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={search.view === "chart" ? "default" : "outline"}
              onClick={() => void navigate({ search: { ...search, view: "chart" } })}
            >
              Chart
            </Button>
            <Button
              size="sm"
              variant={search.view === "table" ? "default" : "outline"}
              onClick={() => void navigate({ search: { ...search, view: "table" } })}
            >
              <Table2 className="mr-1 h-4 w-4" /> Table
            </Button>
            <Button size="sm" variant="outline" onClick={() => download(snapshot)}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
        {search.view === "chart" ? (
          <SeriesChart snapshot={snapshot} />
        ) : (
          <SeriesTable snapshot={snapshot} />
        )}
        <Provenance snapshot={snapshot} />
      </section>
      <section className="mt-5 card-elevated overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Programs in scope</h2>
          <p className="text-xs text-muted-foreground">
            Select a program for financial detail, linked parts, evidence and agreement context.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Program / model</th>
                <th className="px-4 py-3">OEM</th>
                <th className="px-4 py-3 text-right">Recoverable</th>
                <th className="px-4 py-3 text-right">Recovered</th>
                <th className="px-4 py-3 text-right">Forecast variance</th>
                <th className="px-4 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {snapshot.programRecords.map((record) => (
                <tr key={record.id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-brand hover:underline"
                      to="/forecasts"
                      search={{ programId: record.programId }}
                    >
                      {record.label}
                      <ExternalLink className="ml-1 inline h-3 w-3" />
                    </Link>
                    <div className="text-xs text-muted-foreground">{record.secondaryLabel}</div>
                  </td>
                  <td className="px-4 py-3">{record.oem}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(record.totalRecoverableCost, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(record.recoveredToDate, { compact: true })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(record.projectedVariance, { compact: true })}
                  </td>
                  <td className="px-4 py-3">
                    <Link className="text-brand hover:underline" to="/contracts">
                      {record.evidenceIds.length} sources
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Summary({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const values = [
    ["Total recoverable", snapshot.metrics.totalRecoverableCost],
    ["Recovered to date", snapshot.metrics.recoveredToDate],
    ["Forecast at completion", snapshot.metrics.forecastAtCompletion],
    ["Projected variance", snapshot.metrics.projectedVariance],
    ["Remaining recovery", snapshot.metrics.remainingRecovery],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {values.map(([label, value]) => (
        <div key={label} className="card-elevated p-4">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 font-mono text-lg font-bold">
            {formatMoney(Number(value), { compact: true })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeriesChart({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="mt-5 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={snapshot.series}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatMoney(Number(v), { compact: true })}
          />
          <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} />
          <Line
            dataKey="contract"
            name="Contract curve"
            stroke="oklch(0.55 0.03 260)"
            strokeDasharray="4 4"
            dot={false}
          />
          <Area
            dataKey="actual"
            name="Actual"
            stroke="oklch(0.58 0.22 258)"
            fill="oklch(0.58 0.22 258 / .18)"
            connectNulls
          />
          <Line
            dataKey="forecast"
            name="Forecast"
            stroke="oklch(0.75 0.15 75)"
            strokeDasharray="5 3"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SeriesTable({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="mt-5 max-h-80 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background text-left">
          <tr>
            <th>Period</th>
            <th>Actual</th>
            <th>Contract</th>
            <th>Forecast</th>
            <th>Variance</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.series.map((p) => (
            <tr key={p.period} className="border-t">
              <td className="py-2">{p.period}</td>
              <td>{p.actual === null ? "—" : formatMoney(p.actual, { compact: true })}</td>
              <td>{formatMoney(p.contract, { compact: true })}</td>
              <td>{formatMoney(p.forecast, { compact: true })}</td>
              <td>{formatMoney(p.variance, { compact: true })}</td>
              <td>{formatMoney(p.remainingRecovery, { compact: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Provenance({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const p = snapshot.provenance;
  return (
    <div className="mt-4 rounded border bg-secondary/30 p-3 text-xs text-muted-foreground">
      As of {new Date(p.asOf).toLocaleString()} · {p.currency} · calculation {p.calculationVersion}{" "}
      · forecast {p.forecastVersion} · source {p.sourceVersion}.{" "}
      <Link className="text-brand hover:underline" to="/contracts">
        Review linked agreement evidence
      </Link>
      .
    </div>
  );
}
