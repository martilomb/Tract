import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  monthlyRecoverySeries,
  formatMoney,
  statusMeta,
  programs as _allPrograms,
} from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import { StatusPill } from "@/components/stat-card";
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
import { Activity, CalendarClock, Database, FileClock } from "lucide-react";
import { useState } from "react";
import { ModelYearBadges, YearlyStatusRow } from "@/components/model-year-status";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";

export const Route = createFileRoute("/forecasts")({
  component: ForecastsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    programId: typeof search.programId === "string" ? search.programId : undefined,
  }),
});

function ForecastsPage() {
  const search = Route.useSearch();
  const { programs } = useDataset();
  const pool = programs.length ? programs : _allPrograms;
  const [selection, setSelection] = useState<HierarchySelection>({
    oem: "all",
    programId: pool.some((program) => program.id === search.programId)
      ? search.programId!
      : pool[0].id,
    modelYear: "all",
  });
  const program = pool.find((p) => p.id === selection.programId) ?? pool[0];
  const series = monthlyRecoverySeries(program.id);

  return (
    <AppShell
      title="Forecasts"
      description="Versioned volume scenarios with provenance and recovery projections."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card-elevated flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <FileClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Scenario</div>
            <div className="text-sm font-semibold">Development baseline · v1</div>
          </div>
        </div>
        <div className="card-elevated flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-semibold">Draft · not approved</div>
          </div>
        </div>
        <div className="card-elevated flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Source</div>
            <div className="text-sm font-semibold">Synthetic staged volume</div>
          </div>
        </div>
        <div className="card-elevated flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-brand">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">As of</div>
            <div className="text-sm font-semibold">21 Aug 2026</div>
          </div>
        </div>
      </div>

      <div className="mt-6 card-elevated p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          OEM → program / model → model year
        </div>
        <HierarchicalProgramSelector programs={pool} value={selection} onChange={setSelection} />
      </div>

      <div className="mt-6 card-elevated p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{program.name}</h2>
              <ModelYearBadges program={program} tone="light" />
            </div>
            <p className="text-xs text-muted-foreground">
              Cumulative recovery — solid = staged actual, dashed = versioned scenario to EOP.
            </p>
          </div>
          <StatusPill {...statusMeta[program.status]} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recovery by model year
          </div>
          <YearlyStatusRow program={program} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Contract" value={formatMoney(program.totalAmortized, { compact: true })} />
          <Metric
            label="Recovered"
            value={formatMoney(program.recoveredToDate, { compact: true })}
          />
          <Metric
            label="Forecast (EOP)"
            value={formatMoney(program.forecastRecovery, { compact: true })}
            accent="brand"
          />
          <Metric
            label="Projected delta"
            value={formatMoney(program.forecastRecovery - program.totalAmortized, {
              compact: true,
            })}
            accent={program.forecastRecovery >= program.totalAmortized ? "success" : "destructive"}
          />
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.15 75)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.75 0.15 75)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.01 250)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value) => formatMoney(Number(value ?? 0))}
              />
              <Line
                type="monotone"
                dataKey="contracted"
                stroke="oklch(0.55 0.03 260)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="Contracted"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="oklch(0.58 0.22 258)"
                fill="url(#ga)"
                strokeWidth={2.5}
                name="Actual"
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="oklch(0.75 0.15 75)"
                strokeDasharray="5 3"
                fill="url(#gf)"
                strokeWidth={2}
                name="Forecast scenario"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
          <div className="flex items-start gap-3">
            <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <div className="text-sm">
              <span className="font-semibold text-brand">Scenario note — </span>
              <span className="text-foreground">
                The deterministic development scenario projects {program.name} will{" "}
                {program.forecastRecovery >= program.totalAmortized
                  ? "over-recover contract amortization by "
                  : "under-recover by "}
                <strong>
                  {formatMoney(Math.abs(program.forecastRecovery - program.totalAmortized), {
                    compact: true,
                  })}
                </strong>{" "}
                by end of production. The illustrative break-even period is{" "}
                {series[Math.min(series.length - 1, 22)].month}. This scenario is not an approved
                forecast or a predictive-model claim.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
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
      <div className={"mt-1 font-mono text-lg font-bold " + color}>{value}</div>
    </div>
  );
}
