import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatCard, StatusPill } from "@/components/stat-card";
import { NewProgramDialog } from "@/components/new-program-dialog";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  FileClock,
  ArrowRight,
  Download,
  Plus,
  ShieldCheck,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatMoney,
  formatNumber,
  statusMeta,
  programs as _allPrograms,
  type Program,
} from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OemMark } from "@/components/oem-badge";
import { vehicleImage } from "@/lib/vehicle-images";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: Overview,
});

// ---- Per-program chart series: actual → forecast to reach total → over-recovery projection ----
function buildProgramSeries(p: (typeof _allPrograms)[number]) {
  const sop = new Date(p.sop);
  const eop = new Date(p.eop);
  const monthsTotal = Math.max(
    12,
    Math.round((eop.getTime() - sop.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  const contractedMonthly = p.totalAmortized / monthsTotal;
  const now = new Date();
  const elapsed = Math.max(
    1,
    Math.min(
      monthsTotal - 2,
      Math.round((now.getTime() - sop.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    ),
  );
  const actualRate = p.recoveredToDate / elapsed;
  const forecastRate =
    (p.forecastRecovery - p.recoveredToDate) / Math.max(1, monthsTotal - elapsed);

  const data: {
    month: string;
    actual: number | null;
    forecast: number | null;
    over: number | null;
    contracted: number;
  }[] = [];

  let actualCum = 0;
  let forecastCum = 0;

  for (let i = 0; i < monthsTotal; i++) {
    const d = new Date(sop.getFullYear(), sop.getMonth() + i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const contractedCum = contractedMonthly * (i + 1);

    if (i < elapsed) {
      actualCum += actualRate;
      forecastCum = actualCum;
      data.push({
        month: label,
        actual: actualCum,
        forecast: actualCum,
        over: null,
        contracted: contractedCum,
      });
    } else {
      forecastCum += forecastRate;
      const reached = forecastCum >= p.totalAmortized;
      data.push({
        month: label,
        actual: null,
        forecast: reached ? p.totalAmortized : forecastCum,
        over: reached ? forecastCum : null,
        contracted: contractedCum,
      });
    }
  }
  const breakEvenIdx = data.findIndex((d) => (d.forecast ?? 0) >= p.totalAmortized);
  return { data, breakEvenMonth: breakEvenIdx >= 0 ? data[breakEvenIdx].month : null };
}

// ---- Aggregates derived from the (commodity-filtered) dataset ----
// Target aggregates for the overview KPIs. The synthetic supplier book
// contains ~200 programs which raw-sum to tens of billions — for a
// realistic Tier-1 electronics commodity story we normalize the overview
// totals to these anchors and scale per-program contributions proportionally.
const TARGET_TOTAL_AMORTIZED = 462_000_000;
const TARGET_OVER_POOL = 18_000_000;
const TARGET_UNDER_EXPOSURE = 3_000_000;

function useAggregates() {
  const ds = useDataset();
  const { programs } = ds;
  const rawTotal = programs.reduce((s, p) => s + p.totalAmortized, 0);
  const rawRecovered = programs.reduce((s, p) => s + p.recoveredToDate, 0);
  const underPrograms = programs.filter((p) => p.forecastRecovery < p.totalAmortized);
  const overPrograms = programs.filter((p) => p.forecastRecovery > p.totalAmortized);
  const rawUnder = underPrograms.reduce((s, p) => s + (p.totalAmortized - p.forecastRecovery), 0);
  const rawOver = overPrograms.reduce((s, p) => s + (p.forecastRecovery - p.totalAmortized), 0);

  const scaleTotal = rawTotal ? TARGET_TOTAL_AMORTIZED / rawTotal : 0;
  const scaleOver = rawOver ? TARGET_OVER_POOL / rawOver : 0;
  const scaleUnder = rawUnder ? TARGET_UNDER_EXPOSURE / rawUnder : 0;

  const totalContracted = TARGET_TOTAL_AMORTIZED;
  const totalRecovered = rawRecovered * scaleTotal;
  const overPool = TARGET_OVER_POOL;
  const underExposure = TARGET_UNDER_EXPOSURE;
  const totalForecast = totalContracted + overPool - underExposure;
  const annualizedRecovery = totalRecovered / 1.9;
  const forecastVsContractPct = totalContracted
    ? ((totalForecast - totalContracted) / totalContracted) * 100
    : 0;

  const scaleProgramAmortized = (p: Program) => p.totalAmortized * scaleTotal;
  const scaleProgramRecovered = (p: Program) => p.recoveredToDate * scaleTotal;
  const scaleProgramForecast = (p: Program) => {
    const base = p.totalAmortized * scaleTotal;
    const delta = p.forecastRecovery - p.totalAmortized;
    const scaledDelta = delta > 0 ? delta * scaleOver : delta * scaleUnder;
    return base + scaledDelta;
  };

  return {
    ...ds,
    totalContracted,
    totalRecovered,
    totalForecast,
    underPrograms,
    overPrograms,
    underExposure,
    overPool,
    annualizedRecovery,
    forecastVsContractPct,
    scaleTotal,
    scaleOver,
    scaleUnder,
    scaleProgramAmortized,
    scaleProgramRecovered,
    scaleProgramForecast,
  };
}

// ---- KPI detail dialog contents ----
type DetailKey = "amortized" | "recovered" | "forecast" | "under" | "over" | null;

function KpiDetailDialog({
  open,
  onOpenChange,
  which,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  which: DetailKey;
}) {
  const {
    programs,
    overRecoveryBreakdown,
    underPrograms,
    overPrograms,
    totalRecovered,
    totalContracted,
    totalForecast,
    forecastVsContractPct,
    annualizedRecovery,
    scaleOver,
    scaleUnder,
    scaleProgramAmortized,
    scaleProgramRecovered,
    scaleProgramForecast,
  } = useAggregates();
  if (!which) return null;

  const content: Record<Exclude<DetailKey, null>, { title: string; body: React.ReactNode }> = {
    amortized: {
      title: "Total amortized cost — breakdown by program",
      body: (
        <ProgramBreakdownTable
          rows={programs.map((p) => ({
            program: p,
            primary: scaleProgramAmortized(p),
            secondary: p.partsCount,
            secondaryLabel: "parts",
          }))}
          primaryLabel="Amortized"
        />
      ),
    },
    recovered: {
      title: "Annualized recovery run-rate",
      body: (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Annualized rate
            </div>
            <div className="mt-1 font-display text-3xl font-bold">
              {formatMoney(annualizedRecovery, { compact: true })}
              <span className="ml-1 text-base font-medium text-muted-foreground">/ yr</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on {formatMoney(totalRecovered, { compact: true })} recovered across 1.9 avg
              program-years of shipments (weighted by SOP).
            </p>
          </div>
          <ProgramBreakdownTable
            rows={programs.map((p) => ({
              program: p,
              primary: scaleProgramRecovered(p) / 1.9,
              secondary: scaleProgramRecovered(p),
              secondaryLabel: "to-date",
              secondaryFormat: "money",
            }))}
            primaryLabel="Annualized"
          />
        </div>
      ),
    },
    forecast: {
      title: "Forecast-scenario total recovery",
      body: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The selected development scenario projects{" "}
            {forecastVsContractPct >= 0 ? "over" : "under"}-recovery of{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(Math.abs(totalForecast - totalContracted), { compact: true })}
            </span>{" "}
            ({forecastVsContractPct.toFixed(1)}%) versus contracted amortization by EOP.
          </p>
          <ProgramBreakdownTable
            rows={programs.map((p) => ({
              program: p,
              primary: scaleProgramForecast(p),
              secondary: (scaleProgramForecast(p) / scaleProgramAmortized(p)) * 100,
              secondaryLabel: "% of contract",
              secondaryFormat: "pct",
            }))}
            primaryLabel="Forecast scenario"
          />
        </div>
      ),
    },
    under: {
      title: "Under-recovery exposure — claim opportunities",
      body: (
        <div className="space-y-4">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
            <div className="font-medium text-foreground">
              {underPrograms.length} programs projected to miss contracted volume.
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Contract review is required before treating any shortfall as a recoverable claim. No
              minimum-volume or take-or-pay right is inferred by Tract.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Program</th>
                  <th className="px-3 py-2 text-right font-medium">Contracted</th>
                  <th className="px-3 py-2 text-right font-medium">Forecast scenario</th>
                  <th className="px-3 py-2 text-right font-medium">Shortfall</th>
                  <th className="px-3 py-2 text-right font-medium">Vol gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {underPrograms.map((p) => {
                  const gap = (p.totalAmortized - p.forecastRecovery) * scaleUnder;
                  const volGap =
                    ((p.contractedVolume - p.forecastVolume) / p.contractedVolume) * 100;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.oem} · {p.code}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatMoney(scaleProgramAmortized(p), { compact: true })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatMoney(scaleProgramForecast(p), { compact: true })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-destructive">
                        −{formatMoney(gap, { compact: true })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        −{volGap.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    over: {
      title: "Over-recovery balance — disposition review",
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {overRecoveryBreakdown.map((b) => {
              const tone =
                b.key === "at-risk"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : b.key === "pending"
                    ? "border-warning/30 bg-warning/5 text-warning"
                    : "border-success/30 bg-success/5 text-success";
              return (
                <div key={b.key} className={`rounded-lg border p-3 ${tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider">
                    {b.label}
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold text-foreground">
                    {formatMoney(b.amount, { compact: true })}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{b.description}</p>
                </div>
              );
            })}
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Program</th>
                  <th className="px-3 py-2 text-right font-medium">Over-recovery</th>
                  <th className="px-3 py-2 text-right font-medium">% over</th>
                  <th className="px-3 py-2 text-right font-medium">Vol upside</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overPrograms.map((p) => {
                  const over = (p.forecastRecovery - p.totalAmortized) * scaleOver;
                  const pct = (over / scaleProgramAmortized(p)) * 100;
                  const volUp =
                    ((p.forecastVolume - p.contractedVolume) / p.contractedVolume) * 100;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.oem} · {p.code}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-success">
                        +{formatMoney(over, { compact: true })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">+{pct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                        +{volUp.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  };

  const { title, body } = content[which];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drill-down across all vehicle programs. Click a row on the parent tables to see
            part-level detail.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function ProgramBreakdownTable({
  rows,
  primaryLabel,
}: {
  rows: {
    program: (typeof _allPrograms)[number];
    primary: number;
    secondary: number;
    secondaryLabel: string;
    secondaryFormat?: "money" | "pct" | "number";
  }[];
  primaryLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Program</th>
            <th className="px-3 py-2 text-right font-medium">{primaryLabel}</th>
            <th className="px-3 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows
            .sort((a, b) => b.primary - a.primary)
            .map((row) => {
              const s =
                row.secondaryFormat === "money"
                  ? formatMoney(row.secondary, { compact: true })
                  : row.secondaryFormat === "pct"
                    ? `${row.secondary.toFixed(0)}%`
                    : formatNumber(row.secondary);
              return (
                <tr key={row.program.id} className="hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.program.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.program.oem} · {s} {row.secondaryLabel}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatMoney(row.primary, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <StatusPill {...statusMeta[row.program.status]} />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

function Overview() {
  const {
    programs,
    oemSummary,
    scenarioInsights,
    overRecoveryBreakdown,
    overRecoveryTimeline,
    totalContracted,
    totalForecast,
    underPrograms,
    underExposure,
    overPool,
    annualizedRecovery,
    forecastVsContractPct,
  } = useAggregates();
  const [detail, setDetail] = useState<DetailKey>(null);
  const fallbackProgramId = programs[0]?.id ?? _allPrograms[0].id;
  const [selectedProgramId, setSelectedProgramId] = useState<string>(fallbackProgramId);
  const selectedProgram = useMemo(() => {
    const source = programs.length ? programs : _allPrograms;
    return source.find((p) => p.id === selectedProgramId) ?? source[0];
  }, [selectedProgramId, programs]);
  const { data: programSeries, breakEvenMonth: programBreakEven } = useMemo(
    () => buildProgramSeries(selectedProgram),
    [selectedProgram],
  );
  const projectedOver = selectedProgram.forecastRecovery - selectedProgram.totalAmortized;

  const OVER_COLORS: Record<string, string> = {
    "at-risk": "oklch(0.62 0.22 25)",
    pending: "oklch(0.75 0.15 75)",
    available: "oklch(0.62 0.15 155)",
  };

  return (
    <AppShell
      title="Recovery Overview"
      description="All vehicle programs, part numbers, and OEM amortizations in one place."
      actions={
        <>
          <Button variant="outline" size="sm" disabled title="Connect production data to export">
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <NewProgramDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New program
              </Button>
            }
          />
        </>
      }
    >
      {/* KPI row — clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ClickableKpi onClick={() => setDetail("amortized")}>
          <StatCard
            label="Total amortized"
            value={formatMoney(totalContracted, { compact: true })}
            delta={2.4}
            deltaLabel="vs. last quarter"
            icon={<DollarSign className="h-5 w-5" />}
            accent="brand"
          />
        </ClickableKpi>
        <ClickableKpi onClick={() => setDetail("recovered")}>
          <StatCard
            label="Annualized recovery"
            value={`${formatMoney(annualizedRecovery, { compact: true })}/yr`}
            delta={12.8}
            deltaLabel="YoY growth"
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
        </ClickableKpi>
        <ClickableKpi onClick={() => setDetail("forecast")}>
          <StatCard
            label="Forecast-scenario recovery"
            value={formatMoney(totalForecast, { compact: true })}
            delta={forecastVsContractPct}
            deltaLabel="vs. contract"
            icon={<FileClock className="h-5 w-5" />}
            accent="brand"
          />
        </ClickableKpi>
        <ClickableKpi onClick={() => setDetail("under")}>
          <StatCard
            label="Under-recovery exposure"
            value={formatMoney(underExposure, { compact: true })}
            delta={-8.4}
            deltaLabel={`${underPrograms.length} programs`}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="destructive"
          />
        </ClickableKpi>
        <ClickableKpi onClick={() => setDetail("over")}>
          <StatCard
            label="Over-recovery pool"
            value={formatMoney(overPool, { compact: true })}
            delta={14.6}
            deltaLabel="requires review"
            icon={<ShieldCheck className="h-5 w-5" />}
            accent="success"
          />
        </ClickableKpi>
        <ClickableKpi onClick={() => setDetail("over")}>
          <StatCard
            label="MY 2026 · disposition pending"
            value={formatMoney(
              (overRecoveryBreakdown.find((b) => b.key === "available")?.amount ?? 0) * 0.62,
              { compact: true },
            )}
            delta={9.2}
            deltaLabel="audit-cleared"
            icon={<Banknote className="h-5 w-5" />}
            accent="success"
          />
        </ClickableKpi>
      </div>

      {/* Main chart + insights */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-elevated lg:col-span-2 flex flex-col overflow-hidden">
          <div className="relative gradient-navy px-5 pb-3 pt-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <OemMark oem={selectedProgram.oem} size="lg" />
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
                    {selectedProgram.oem} · {selectedProgram.platform}
                  </div>
                  <h2 className="text-lg font-bold leading-tight text-white">
                    {selectedProgram.name}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    Cumulative recovery · staged actual, forecast scenario to break-even, projected
                    over-recovery.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger className="h-8 w-[220px] border-white/20 bg-white/10 text-xs text-white [&>span]:text-white">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} · {p.oem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StatusPill {...statusMeta[selectedProgram.status]} />
              </div>
            </div>
            <div className="pointer-events-none relative mt-1 flex h-20 items-end justify-end pr-2">
              <img
                src={vehicleImage(selectedProgram.id, selectedProgram.name)}
                alt=""
                className="max-h-[130%] w-auto object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
          <div className="p-5 pt-4">
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat
                label="Recovered to date"
                value={formatMoney(selectedProgram.recoveredToDate, { compact: true })}
                tone="neutral"
              />
              <MiniStat label="Forecast break-even" value={programBreakEven ?? "—"} tone="brand" />
              <MiniStat
                label={projectedOver >= 0 ? "Projected over-recovery" : "Projected shortfall"}
                value={`${projectedOver >= 0 ? "+" : "−"}${formatMoney(Math.abs(projectedOver), { compact: true })}`}
                tone={projectedOver >= 0 ? "success" : "danger"}
              />
            </div>

            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={programSeries} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.58 0.22 258)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.75 0.15 75)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="oklch(0.75 0.15 75)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOver" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.15 155)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.62 0.15 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.9 0.01 250)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="oklch(0.6 0.03 260)"
                    interval={5}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="oklch(0.6 0.03 260)"
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid oklch(0.92 0.012 255)",
                      fontSize: 12,
                    }}
                    formatter={(value) =>
                      value == null ? "—" : formatMoney(Number(value), { compact: true })
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={selectedProgram.totalAmortized}
                    stroke="oklch(0.55 0.03 260)"
                    strokeDasharray="4 4"
                    label={{
                      value: `Total to recover · ${formatMoney(selectedProgram.totalAmortized, { compact: true })}`,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "oklch(0.45 0.03 260)",
                    }}
                  />
                  {programBreakEven && (
                    <ReferenceLine
                      x={programBreakEven}
                      stroke="oklch(0.62 0.15 155)"
                      strokeDasharray="3 3"
                      label={{
                        value: `Break-even · ${programBreakEven}`,
                        position: "top",
                        fontSize: 10,
                        fill: "oklch(0.45 0.15 155)",
                      }}
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="contracted"
                    name="Contracted curve"
                    stroke="oklch(0.55 0.03 260)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke="oklch(0.58 0.22 258)"
                    fill="url(#gActual)"
                    strokeWidth={2.5}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast scenario to total"
                    stroke="oklch(0.75 0.15 75)"
                    strokeDasharray="5 3"
                    fill="url(#gForecast)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="over"
                    name="Over-recovery forecast"
                    stroke="oklch(0.62 0.15 155)"
                    strokeDasharray="2 2"
                    fill="url(#gOver)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand">
                <FileClock className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold">Scenario exceptions</h2>
            </div>
            <span className="text-xs text-muted-foreground">Synthetic development rules</span>
          </div>
          <div className="mt-4 space-y-3">
            {scenarioInsights.map((i) => (
              <div
                key={i.id}
                className="rounded-lg border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={
                      "mt-1 h-2 w-2 shrink-0 rounded-full " +
                      (i.severity === "high"
                        ? "bg-destructive"
                        : i.severity === "medium"
                          ? "bg-warning"
                          : "bg-success")
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{i.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={
                          "font-mono text-xs font-semibold " +
                          (i.delta < 0 ? "text-destructive" : "text-success")
                        }
                      >
                        {i.delta < 0 ? "−" : "+"}
                        {formatMoney(Math.abs(i.delta), { compact: true })}
                      </span>
                      <Link
                        to="/programs"
                        className="inline-flex items-center text-xs font-medium text-brand hover:underline"
                      >
                        Review <ArrowRight className="ml-0.5 h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Over-recovery detail row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-elevated p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Over-recovery pool</h2>
              <p className="text-xs text-muted-foreground">By contractual disposition</p>
            </div>
            <button
              onClick={() => setDetail("over")}
              className="text-xs font-medium text-brand hover:underline inline-flex items-center"
            >
              Details <ArrowRight className="ml-0.5 h-3 w-3" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overRecoveryBreakdown}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={38}
                    outerRadius={68}
                    stroke="none"
                  >
                    {overRecoveryBreakdown.map((b) => (
                      <Cell key={b.key} fill={OVER_COLORS[b.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value ?? 0), { compact: true })}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {overRecoveryBreakdown.map((b) => {
                const pct = (b.amount / overPool) * 100;
                return (
                  <div key={b.key} className="text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: OVER_COLORS[b.key] }}
                        />
                        <span className="font-medium">{b.label}</span>
                      </div>
                      <span className="font-mono text-xs">
                        {formatMoney(b.amount, { compact: true })}
                      </span>
                    </div>
                    <div className="ml-4 mt-0.5 text-[11px] text-muted-foreground">
                      {pct.toFixed(0)}% of pool
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2026 over-recovery review box */}
        {(() => {
          const available = overRecoveryBreakdown.find((b) => b.key === "available")?.amount ?? 0;
          const my2026 = available * 0.62;
          const programs2026 = 14;
          const pctOfPool = (my2026 / overPool) * 100;
          return (
            <div className="card-elevated relative overflow-hidden p-5">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                  background:
                    "radial-gradient(circle at 85% 15%, hsl(var(--success)) 0%, transparent 55%)",
                }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 items-center rounded-md bg-success/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-success">
                      MY 2026
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Review required
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold">Disposition not determined</h2>
                  <p className="text-xs text-muted-foreground">
                    2026 over-recoveries awaiting contract and accounting review
                  </p>
                </div>
                <Link
                  to="/recoveries"
                  className="text-xs font-medium text-brand hover:underline inline-flex items-center"
                >
                  Review <ArrowRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>

              <div className="relative mt-4">
                <div className="font-mono text-3xl font-semibold text-success">
                  +{formatMoney(my2026, { compact: true })}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {pctOfPool.toFixed(0)}% of over-recovery pool · {programs2026} programs
                </div>
              </div>

              <div className="relative mt-4 space-y-2 border-t border-border/60 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Evidence present</span>
                  <span className="font-mono">{formatMoney(my2026 * 0.78, { compact: true })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Additional review</span>
                  <span className="font-mono">{formatMoney(my2026 * 0.22, { compact: true })}</span>
                </div>
              </div>

              <button
                onClick={() => setDetail("over")}
                className="relative mt-4 inline-flex w-full items-center justify-center rounded-md bg-success/10 px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/15"
              >
                Open review details
              </button>
            </div>
          );
        })()}

        <div className="card-elevated p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Over-recovery review queue — quarterly</h2>
              <p className="text-xs text-muted-foreground">
                Synthetic over-recovery balances added to the accounting review queue.
              </p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="text-right">
                <div className="text-muted-foreground">All-time</div>
                <div className="font-mono font-semibold text-success">
                  +{formatMoney(45_400_000, { compact: true })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">This year</div>
                <div className="font-mono font-semibold text-success">
                  +{formatMoney(28_900_000, { compact: true })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground">This quarter</div>
                <div className="font-mono font-semibold text-success">
                  +{formatMoney(11_400_000, { compact: true })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overRecoveryTimeline} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.01 250)"
                  vertical={false}
                />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => `$${Number(value ?? 0).toFixed(1)}M`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="quarter"
                  name="Quarterly balance"
                  fill="oklch(0.62 0.15 155)"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative"
                  stroke="oklch(0.58 0.22 258)"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* OEM breakdown + programs table */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-5">
          <h2 className="text-base font-semibold">Recovery by OEM ($M)</h2>
          <p className="text-xs text-muted-foreground">
            Recovered vs. forecast scenario vs. total contracted.
          </p>
          <div className="mt-4 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oemSummary} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.01 250)"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="oem" tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="recovered"
                  name="Recovered"
                  fill="oklch(0.62 0.15 155)"
                  radius={[0, 3, 3, 0]}
                />
                <Bar
                  dataKey="forecast"
                  name="Forecast"
                  fill="oklch(0.58 0.22 258)"
                  radius={[0, 3, 3, 0]}
                />
                <Bar
                  dataKey="contracted"
                  name="Contracted"
                  fill="oklch(0.85 0.02 255)"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Active programs</h2>
              <p className="text-xs text-muted-foreground">
                {programs.length} programs · {programs.reduce((s, p) => s + p.partsCount, 0)} part
                numbers
              </p>
            </div>
            <Link
              to="/programs"
              className="text-xs font-medium text-brand hover:underline inline-flex items-center"
            >
              View all <ArrowRight className="ml-0.5 h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 max-h-[380px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-secondary/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Program</th>
                  <th className="px-3 py-2 text-right font-medium">Recovered</th>
                  <th className="px-3 py-2 text-right font-medium">Contract</th>
                  <th className="px-3 py-2 text-left font-medium">Progress</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {programs.map((p) => {
                  const pct = Math.min(100, (p.recoveredToDate / p.totalAmortized) * 100);
                  const fpct = Math.min(120, (p.forecastRecovery / p.totalAmortized) * 100);
                  return (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy text-[10px] font-bold text-white">
                            {p.oem.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium leading-tight">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.oem} · {p.code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {formatMoney(p.recoveredToDate, { compact: true })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatMoney(p.totalAmortized, { compact: true })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative h-2 w-32 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand/30"
                            style={{ width: `${Math.min(100, fpct)}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-brand"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {pct.toFixed(0)}% · fcst {fpct.toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill {...statusMeta[p.status]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> {programs.reduce((s, p) => s + p.partsCount, 0)}{" "}
              parts tracked
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Synthetic staged volume
            </div>
          </div>
        </div>
      </div>

      <KpiDetailDialog
        open={detail !== null}
        onOpenChange={(v) => !v && setDetail(null)}
        which={detail}
      />
    </AppShell>
  );
}

function ClickableKpi({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
    >
      {children}
    </button>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "brand" | "success" | "danger";
}) {
  const toneClass =
    tone === "brand"
      ? "text-brand"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-destructive"
          : "text-foreground";
  const Icon = tone === "success" ? ArrowUpRight : tone === "brand" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-0.5 flex items-center gap-1 font-display text-lg font-bold ${toneClass}`}>
        {tone !== "neutral" && <Icon className="h-4 w-4" />}
        {value}
      </div>
    </div>
  );
}
