import { createFileRoute } from "@tanstack/react-router";
import { Download, FileClock, Table2, TrendingUp } from "lucide-react";
import { useState } from "react";
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
import { AppShell } from "@/components/app-shell";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/hooks/use-analysis";
import {
  analysisCsv,
  DEFAULT_ANALYSIS_SCOPE,
  type AnalysisDimension,
  type AnalysisScope,
  type AnalysisSnapshot,
} from "@/domain/analytics";
import { formatMoney } from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";

type ForecastSearch = {
  dimension?: "program" | "part";
  oem?: string;
  programId?: string;
  modelYear?: number;
  partId?: string;
};

export const Route = createFileRoute("/forecasts")({
  component: ForecastsPage,
  validateSearch: (search: Record<string, unknown>): ForecastSearch => ({
    dimension: search.dimension === "part" ? "part" : undefined,
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear:
      Number.isInteger(Number(search.modelYear)) && Number(search.modelYear) >= 1900
        ? Number(search.modelYear)
        : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
  }),
});

function scopeFromSearch(search: ForecastSearch): AnalysisScope {
  const year = search.modelYear ?? Number.NaN;
  return {
    ...DEFAULT_ANALYSIS_SCOPE,
    dimension: search.dimension ?? "program",
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: Number.isInteger(year) ? year : "all",
    partId: search.partId ?? "all",
  };
}

function downloadCsv(snapshot: AnalysisSnapshot) {
  const blob = new Blob([analysisCsv(snapshot)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tract-forecast-${snapshot.scope.dimension}-${snapshot.provenance.asOf.slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ForecastsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { programs, parts } = useDataset();
  const scope = scopeFromSearch(search);
  const snapshot = useAnalysis(scope);
  const [view, setView] = useState<"chart" | "table">("chart");
  const selection: HierarchySelection = {
    oem: scope.oem,
    programId: scope.programId,
    modelYear: scope.modelYear === "all" ? "all" : String(scope.modelYear),
    partId: scope.partId === "all" ? undefined : scope.partId,
  };
  const updateScope = (next: HierarchySelection) =>
    void navigate({
      search: {
        dimension: scope.dimension === "part" ? "part" : undefined,
        oem: next.oem === "all" ? undefined : next.oem,
        programId: next.programId === "all" ? undefined : next.programId,
        modelYear: next.modelYear === "all" ? undefined : Number(next.modelYear),
        partId: next.partId,
      },
      replace: true,
    });
  const setDimension = (dimension: AnalysisDimension) =>
    void navigate({
      search: { ...search, dimension: dimension === "part" ? "part" : undefined },
      replace: true,
    });

  return (
    <AppShell
      title="Forecasts"
      description="Scoped recovery scenarios with transparent provenance."
    >
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
        <strong>Synthetic demonstration data.</strong> This development scenario is not an approved
        forecast, live provider result, or predictive-model claim.
      </div>
      <section className="mt-5 card-elevated p-4" aria-labelledby="forecast-scope-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="forecast-scope-heading" className="font-semibold">
              Forecast analysis scope
            </h2>
            <p className="text-xs text-muted-foreground">
              Select OEM, program, model year, and part without losing the URL scope.
            </p>
          </div>
          <div className="flex gap-2" aria-label="Forecast analysis dimension">
            <Button
              size="sm"
              variant={scope.dimension === "program" ? "default" : "outline"}
              onClick={() => setDimension("program")}
            >
              By program
            </Button>
            <Button
              size="sm"
              variant={scope.dimension === "part" ? "default" : "outline"}
              onClick={() => setDimension("part")}
            >
              By part
            </Button>
          </div>
        </div>
        <HierarchicalProgramSelector
          programs={programs}
          parts={parts}
          value={selection}
          onChange={updateScope}
          showPart
        />
      </section>
      <section className="mt-5 card-elevated p-5" aria-labelledby="forecast-summary-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="forecast-summary-heading" className="text-lg font-semibold">
              {snapshot.scopeLabel}
            </h2>
            <p className="text-xs text-muted-foreground">
              {snapshot.provenance.organization} · as of{" "}
              {new Date(snapshot.provenance.asOf).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })}{" "}
              UTC
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(snapshot)}>
            <Download className="mr-2 h-4 w-4" />
            Export scoped CSV
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Recoverable cost"
            value={formatMoney(snapshot.metrics.totalRecoverableCost, { compact: true })}
          />
          <Metric
            label="Recovered to date"
            value={formatMoney(snapshot.metrics.recoveredToDate, { compact: true })}
          />
          <Metric
            label="Forecast at completion"
            value={formatMoney(snapshot.metrics.forecastAtCompletion, { compact: true })}
            accent="brand"
          />
          <Metric
            label="Projected variance"
            value={formatMoney(snapshot.metrics.projectedVariance, { compact: true })}
            accent={snapshot.metrics.projectedVariance >= 0 ? "success" : "destructive"}
          />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileClock className="h-4 w-4" />
            Forecast {snapshot.provenance.forecastVersion} · calculation{" "}
            {snapshot.provenance.calculationVersion} · {snapshot.provenance.currency}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === "chart" ? "default" : "outline"}
              onClick={() => setView("chart")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Chart
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              <Table2 className="mr-2 h-4 w-4" />
              Table
            </Button>
          </div>
        </div>
        {view === "chart" ? (
          <ForecastChart snapshot={snapshot} />
        ) : (
          <ForecastTable snapshot={snapshot} />
        )}
        <RecordBreakdown snapshot={snapshot} />
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Break-even:{" "}
            <strong className="text-foreground">
              {snapshot.breakEvenPeriod ?? "Not reached in scenario"}
            </strong>
          </span>
          <span>
            Remaining recovery:{" "}
            <strong className="text-foreground">
              {formatMoney(snapshot.metrics.remainingRecovery, { compact: true })}
            </strong>
          </span>
          <span>
            Source: {snapshot.provenance.sourceLabel} · {snapshot.provenance.sourceVersion}
          </span>
        </div>
      </section>
    </AppShell>
  );
}

function ForecastChart({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="mt-5 h-80" aria-label="Forecast actual, contract, and forecast recovery chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={snapshot.series}>
          <defs>
            <linearGradient id="forecastActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.01 250)" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `$${(Number(value) / 1_000_000).toFixed(1)}M`}
          />
          <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
          <Line
            type="monotone"
            dataKey="contract"
            stroke="oklch(0.55 0.03 260)"
            strokeDasharray="4 4"
            dot={false}
            name="Contract curve"
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="oklch(0.58 0.22 258)"
            fill="url(#forecastActual)"
            strokeWidth={2.5}
            name="Actual"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="oklch(0.75 0.15 75)"
            strokeDasharray="5 3"
            dot={false}
            name="Forecast"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ForecastTable({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Monthly actual, contract curve, forecast, variance, and remaining recovery
        </caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-2">Period</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Contract</th>
            <th className="px-3 py-2">Forecast</th>
            <th className="px-3 py-2">Variance</th>
            <th className="px-3 py-2">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.series.map((row) => (
            <tr key={row.period} className="border-b border-border/60">
              <td className="px-3 py-2 font-medium">{row.period}</td>
              <td className="px-3 py-2">{row.actual === null ? "—" : formatMoney(row.actual)}</td>
              <td className="px-3 py-2">{formatMoney(row.contract)}</td>
              <td className="px-3 py-2">{formatMoney(row.forecast)}</td>
              <td className="px-3 py-2">{formatMoney(row.variance)}</td>
              <td className="px-3 py-2">{formatMoney(row.remainingRecovery)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordBreakdown({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const records = snapshot.records.slice(0, 8);
  return (
    <div className="mt-5 rounded-lg border border-border p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Linked records and evidence
      </div>
      <div className="divide-y divide-border">
        {records.length ? (
          records.map((record) => (
            <div
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <div>
                <a
                  className="font-medium text-brand underline-offset-2 hover:underline"
                  href={
                    record.partId
                      ? `/parts?partId=${encodeURIComponent(record.partId)}`
                      : `/programs?programId=${encodeURIComponent(record.programId)}`
                  }
                >
                  {record.label}
                </a>
                <span className="ml-2 text-xs text-muted-foreground">{record.secondaryLabel}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Evidence: {record.evidenceIds.slice(0, 2).join(", ")}
              </span>
            </div>
          ))
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No records match this forecast scope.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "brand" | "success" | "destructive";
}) {
  const color =
    accent === "brand"
      ? "text-brand"
      : accent === "success"
        ? "text-success"
        : accent === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
