import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Download,
  FileClock,
  LineChart as LineChartIcon,
  Search,
  ShieldCheck,
  Table2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { StatCard, StatusPill } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_ANALYSIS_SCOPE,
  analysisCsv,
  buildAnalysisSnapshot,
  type AnalysisRecord,
  type AnalysisScope,
  type AnalysisSnapshot,
} from "@/domain/analytics";
import { buildBoundedTablePage } from "@/domain/bounded-table";
import { formatMoney, parts, programModelYears, programs, statusMeta } from "@/lib/demo-data";

type OverviewSearch = {
  dimension?: "program" | "part";
  oem?: string;
  programId?: string;
  modelYear?: string;
  partId?: string;
};

export const Route = createFileRoute("/")({
  component: Overview,
  validateSearch: (search: Record<string, unknown>): OverviewSearch => ({
    dimension: search.dimension === "part" ? "part" : undefined,
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear: typeof search.modelYear === "string" ? search.modelYear : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
  }),
});

type DetailKey = "total" | "recovered" | "forecast" | "under" | "over" | "my2026";
type ViewMode = "chart" | "table";
type SortKey = "label" | "recoveredToDate" | "totalRecoverableCost" | "status";
type SortDirection = "ascending" | "descending" | "none";

const PAGE_SIZE = 25;
const ANALYSIS_BOOK = { programs, parts, programModelYears };
const ORGANIZATION_SCOPE: AnalysisScope = DEFAULT_ANALYSIS_SCOPE;

function downloadCsv(snapshot: AnalysisSnapshot) {
  const blob = new Blob([analysisCsv(snapshot)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `tract-recovery-${snapshot.scope.dimension}-${snapshot.provenance.asOf.slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getScope(search: OverviewSearch): AnalysisScope {
  const modelYear = search.modelYear ? Number(search.modelYear) : Number.NaN;
  return {
    ...DEFAULT_ANALYSIS_SCOPE,
    dimension: search.dimension ?? "program",
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: Number.isInteger(modelYear) ? modelYear : "all",
    partId: search.partId ?? "all",
  };
}

function Overview() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const scope = useMemo(() => getScope(search), [search]);
  const organization = useMemo(() => buildAnalysisSnapshot(ANALYSIS_BOOK, ORGANIZATION_SCOPE), []);
  const my2026 = useMemo(
    () =>
      buildAnalysisSnapshot(ANALYSIS_BOOK, {
        ...ORGANIZATION_SCOPE,
        modelYear: 2026,
      }),
    [],
  );
  const scoped = useMemo(() => buildAnalysisSnapshot(ANALYSIS_BOOK, scope), [scope]);
  const [detail, setDetail] = useState<DetailKey | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalRecoverableCost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");
  const [page, setPage] = useState(1);

  const selection: HierarchySelection = {
    oem: scope.oem,
    programId: scope.programId,
    modelYear: scope.modelYear === "all" ? "all" : String(scope.modelYear),
    partId: scope.partId === "all" ? undefined : scope.partId,
  };

  const updateScope = (next: HierarchySelection) => {
    void navigate({
      search: {
        dimension: scope.dimension === "part" ? "part" : undefined,
        oem: next.oem === "all" ? undefined : next.oem,
        programId: next.programId === "all" ? undefined : next.programId,
        modelYear: next.modelYear === "all" ? undefined : next.modelYear,
        partId: next.partId,
      },
      replace: true,
    });
    setPage(1);
  };

  const setDimension = (dimension: "program" | "part") => {
    void navigate({
      search: { ...search, dimension: dimension === "part" ? "part" : undefined },
      replace: true,
    });
    setPage(1);
  };

  const visiblePrograms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = scoped.programRecords.filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!normalized ||
          `${record.label} ${record.secondaryLabel}`.toLowerCase().includes(normalized)),
    );
    if (sortDirection === "none") return rows;
    return [...rows].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [query, scoped.programRecords, sortDirection, sortKey, status]);

  const pageCount = Math.max(1, Math.ceil(visiblePrograms.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = visiblePrograms.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (next: SortKey) => {
    if (sortKey !== next) {
      setSortKey(next);
      setSortDirection("ascending");
    } else {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : current === "descending" ? "none" : "ascending",
      );
    }
    setPage(1);
  };

  const quarterly = useMemo(() => {
    let prior = 0;
    return organization.series
      .filter((_, index) => (index + 1) % 3 === 0)
      .map((period) => {
        const cumulative = Math.max(period.variance, 0);
        const added = Math.max(cumulative - prior, 0);
        prior = cumulative;
        return { period: period.period, added, cumulative };
      });
  }, [organization.series]);

  const prioritizedAlerts = [...organization.alerts]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);

  const openDetail = (next: DetailKey) => {
    detailTrigger.current = document.activeElement as HTMLElement | null;
    setDetail(next);
  };

  return (
    <AppShell
      title="Recovery Overview"
      description="Organization-wide recovery position and a separate drill-down scope for programs and parts."
      actions={
        <Button variant="outline" size="sm" onClick={() => downloadCsv(organization)}>
          <Download className="mr-1.5 h-4 w-4" /> Export organization view
        </Button>
      }
    >
      <section aria-labelledby="organization-headline-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="organization-headline-title" className="text-base font-semibold">
              Organization-wide headline information
            </h2>
            <p className="text-xs text-muted-foreground">
              These six tiles are not affected by the analytical selector below. Every value is a
              direct calculation from the same synthetic source book.
            </p>
          </div>
          <ProvenanceLine snapshot={organization} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiButton onClick={() => openDetail("total")}>
            <StatCard
              label="Total recoverable cost"
              value={formatMoney(organization.metrics.totalRecoverableCost, { compact: true })}
              icon={<WalletCards className="h-5 w-5" />}
              accent="brand"
            />
          </KpiButton>
          <KpiButton onClick={() => openDetail("recovered")}>
            <StatCard
              label="Recovered to date"
              value={formatMoney(organization.metrics.recoveredToDate, { compact: true })}
              icon={<TrendingUp className="h-5 w-5" />}
              accent="success"
            />
          </KpiButton>
          <KpiButton onClick={() => openDetail("forecast")}>
            <StatCard
              label="Forecast at completion"
              value={formatMoney(organization.metrics.forecastAtCompletion, { compact: true })}
              icon={<FileClock className="h-5 w-5" />}
              accent="brand"
            />
          </KpiButton>
          <KpiButton onClick={() => openDetail("under")}>
            <StatCard
              label="Under-recovery exposure"
              value={formatMoney(organization.metrics.underRecovery, { compact: true })}
              icon={<AlertTriangle className="h-5 w-5" />}
              accent="destructive"
            />
          </KpiButton>
          <KpiButton onClick={() => openDetail("over")}>
            <StatCard
              label="Over-recovery review"
              value={formatMoney(organization.metrics.overRecovery, { compact: true })}
              icon={<ShieldCheck className="h-5 w-5" />}
              accent="success"
            />
          </KpiButton>
          <KpiButton onClick={() => openDetail("my2026")}>
            <StatCard
              label="MY 2026 over-recovery review"
              value={formatMoney(my2026.metrics.overRecovery, { compact: true })}
              icon={<Banknote className="h-5 w-5" />}
              accent="success"
            />
          </KpiButton>
        </div>
      </section>

      <section className="mt-6 card-elevated p-5" aria-labelledby="risks-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="risks-title" className="text-base font-semibold">
              Forecast risks and variances
            </h2>
            <p className="text-xs text-muted-foreground">
              Organization-wide items exceeding approved materiality rule v1. Evidence review is
              required before any business outcome.
            </p>
          </div>
          <Link to="/settings" className="text-xs font-medium text-brand hover:underline">
            Review materiality rules
          </Link>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {prioritizedAlerts.map((alert) => (
            <Link
              key={alert.id}
              to="/forecasts"
              search={{ programId: alert.programId }}
              className="rounded-lg border border-border p-3 transition hover:border-brand/50 hover:bg-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${alert.metric === "under-recovery" ? "text-destructive" : "text-success"}`}
                >
                  {alert.metric === "under-recovery" ? "Under" : "Over"} ·{" "}
                  {alert.percentage.toFixed(1)}%
                </span>
                <span className="font-mono text-xs font-semibold">
                  {formatMoney(alert.amount, { compact: true })}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium leading-snug">{alert.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{alert.reason}</p>
              <div className="mt-2 text-[10px] text-brand">Open calculation and evidence →</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card-elevated p-5" aria-labelledby="quarterly-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="quarterly-title" className="text-base font-semibold">
                Over-recovery review queue — quarterly
              </h2>
              <p className="text-xs text-muted-foreground">
                What gross positive variance entered organization-wide evidence review each quarter?
              </p>
            </div>
            <Link to="/recoveries" className="text-xs font-medium text-brand hover:underline">
              Review evidence
            </Link>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterly} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => moneyAxis(Number(value))}
                />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="added" name="Added to review" fill="oklch(0.62 0.15 155)" />
                <Line
                  dataKey="cumulative"
                  name="Cumulative review balance"
                  stroke="oklch(0.58 0.22 258)"
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-elevated p-5" aria-labelledby="oem-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="oem-title" className="text-base font-semibold">
                Recovery by OEM
              </h2>
              <p className="text-xs text-muted-foreground">
                Which OEM portfolios drive the organization-wide recovery position?
              </p>
            </div>
            <span className="text-xs text-muted-foreground">USD · direct totals</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={organization.oemRecords.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={moneyAxis} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={76} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="recoveredToDate" name="Recovered" fill="oklch(0.62 0.15 155)" />
                <Bar
                  dataKey="forecastAtCompletion"
                  name="Forecast at completion"
                  fill="oklch(0.58 0.22 258)"
                />
                <Bar
                  dataKey="totalRecoverableCost"
                  name="Recoverable cost"
                  fill="oklch(0.85 0.02 255)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
            {organization.oemRecords.slice(0, 10).map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() =>
                  updateScope({ oem: record.label, programId: "all", modelYear: "all" })
                }
                className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-brand hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Analyze {record.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="analysis-title">
        <div className="rounded-xl border-2 border-brand/20 bg-brand/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                Analytical section starts here
              </div>
              <h2 id="analysis-title" className="mt-1 text-lg font-semibold">
                Select a program or part recovery scope
              </h2>
              <p className="text-xs text-muted-foreground">
                This selector changes only the graph, table, export, and Active Programs below. It
                does not change the organization-wide content above.
              </p>
            </div>
            <div
              className="inline-flex rounded-lg border border-border bg-background p-1"
              aria-label="Analyze by"
            >
              <Button
                size="sm"
                variant={scope.dimension === "program" ? "default" : "ghost"}
                onClick={() => setDimension("program")}
              >
                Analyze by Program
              </Button>
              <Button
                size="sm"
                variant={scope.dimension === "part" ? "default" : "ghost"}
                onClick={() => setDimension("part")}
              >
                Analyze by Part
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <HierarchicalProgramSelector
              programs={programs}
              parts={parts}
              value={selection}
              onChange={updateScope}
              showPart
            />
          </div>
        </div>

        <div className="mt-5 card-elevated overflow-hidden">
          <div className="gradient-navy px-5 py-4 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  Exact selected scope
                </div>
                <h3 className="mt-1 text-lg font-semibold">{scoped.scopeLabel}</h3>
                <div className="mt-1 text-xs text-white/65">
                  {scoped.records.length} {scope.dimension} records · {scoped.lines.length}{" "}
                  model-year allocations
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex rounded-md bg-white/10 p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      viewMode === "chart"
                        ? "bg-white text-navy hover:bg-white"
                        : "text-white hover:bg-white/10"
                    }
                    onClick={() => setViewMode("chart")}
                  >
                    <LineChartIcon className="mr-1.5 h-4 w-4" /> Chart
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={
                      viewMode === "table"
                        ? "bg-white text-navy hover:bg-white"
                        : "text-white hover:bg-white/10"
                    }
                    onClick={() => setViewMode("table")}
                  >
                    <Table2 className="mr-1.5 h-4 w-4" /> Table
                  </Button>
                </div>
                <Button size="sm" variant="secondary" onClick={() => downloadCsv(scoped)}>
                  <Download className="mr-1.5 h-4 w-4" /> Export this scope
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniMetric label="Recoverable cost" value={scoped.metrics.totalRecoverableCost} />
              <MiniMetric label="Recovered" value={scoped.metrics.recoveredToDate} />
              <MiniMetric
                label="Forecast at completion"
                value={scoped.metrics.forecastAtCompletion}
              />
              <MiniMetric
                label="Projected variance"
                value={scoped.metrics.projectedVariance}
                signed
              />
            </div>
          </div>
          <div className="p-5">
            <ProvenanceLine snapshot={scoped} detailed />
            {viewMode === "chart" ? (
              <div className="mt-4 h-96" data-analysis-series="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoped.series}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={moneyAxis} />
                    <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="linear"
                      dataKey="contract"
                      name="Contract curve"
                      stroke="oklch(0.55 0.03 260)"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Area
                      type="linear"
                      dataKey="actual"
                      name="Actual recovery"
                      stroke="oklch(0.62 0.15 155)"
                      fill="oklch(0.62 0.15 155 / 0.18)"
                      isAnimationActive={false}
                    />
                    <Line
                      type="linear"
                      dataKey="forecast"
                      name="Forecast"
                      stroke="oklch(0.58 0.22 258)"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <SeriesTable snapshot={scoped} />
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                Break-even: {scoped.breakEvenPeriod ?? "not reached in selected forecast"}
              </span>
              <span>Remaining to recover: {formatMoney(scoped.metrics.remainingRecovery)}</span>
              <span>
                Evidence: {new Set(scoped.lines.flatMap((line) => line.evidenceIds)).size}{" "}
                references
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 card-elevated p-5" aria-labelledby="active-programs-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="active-programs-title" className="text-base font-semibold">
              Active programs in selected analytical scope
            </h2>
            <p className="text-xs text-muted-foreground">
              {visiblePrograms.length} matching programs · every row opens program detail.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search active programs"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search program, OEM, or code"
                className="h-9 w-64 pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter program recovery status" className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="on-track">On track</SelectItem>
                <SelectItem value="over">Over-recovering</SelectItem>
                <SelectItem value="under">Under-recovering</SelectItem>
                <SelectItem value="at-risk">At risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-secondary/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <SortHead
                  label="Program"
                  value="label"
                  active={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortHead
                  label="Recovered"
                  value="recoveredToDate"
                  active={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortHead
                  label="Recoverable cost"
                  value="totalRecoverableCost"
                  active={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <th className="px-3 py-2 text-right font-medium">Forecast</th>
                <th className="px-3 py-2 text-right font-medium">Variance</th>
                <SortHead
                  label="Status"
                  value="status"
                  active={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((record) => (
                <tr
                  key={record.id}
                  role="link"
                  tabIndex={0}
                  onClick={() =>
                    void navigate({ to: "/programs", search: { programId: record.programId } })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void navigate({
                        to: "/programs",
                        search: { programId: record.programId },
                      });
                    }
                  }}
                  className="cursor-pointer hover:bg-secondary/40 focus:bg-secondary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                  aria-label={`Open ${record.label} program detail`}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{record.label}</div>
                    <div className="text-xs text-muted-foreground">{record.secondaryLabel}</div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {formatMoney(record.recoveredToDate, { compact: true })}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {formatMoney(record.totalRecoverableCost, { compact: true })}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">
                    {formatMoney(record.forecastAtCompletion, { compact: true })}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-mono text-xs ${record.projectedVariance < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {record.projectedVariance > 0 ? "+" : ""}
                    {formatMoney(record.projectedVariance, { compact: true })}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill {...statusMeta[record.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {visiblePrograms.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}–
            {Math.min(safePage * PAGE_SIZE, visiblePrograms.length)} of {visiblePrograms.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="font-mono">
              Page {safePage} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <KpiDetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            requestAnimationFrame(() => detailTrigger.current?.focus());
          }
        }}
        organization={organization}
        my2026={my2026}
      />
    </AppShell>
  );
}

function KpiButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {children}
    </button>
  );
}

function KpiDetailDialog({
  detail,
  onOpenChange,
  organization,
  my2026,
}: {
  detail: DetailKey | null;
  onOpenChange: (open: boolean) => void;
  organization: AnalysisSnapshot;
  my2026: AnalysisSnapshot;
}) {
  const [page, setPage] = useState(1);
  if (!detail) return null;
  const config: Record<
    DetailKey,
    {
      title: string;
      description: string;
      snapshot: AnalysisSnapshot;
      filter: (record: AnalysisRecord) => boolean;
      sort: (record: AnalysisRecord) => number;
    }
  > = {
    total: {
      title: "Total recoverable cost — program breakdown",
      description: "Direct approved-cost fixture values grouped from parts to programs and OEMs.",
      snapshot: organization,
      filter: () => true,
      sort: (record) => record.totalRecoverableCost,
    },
    recovered: {
      title: "Recovered to date — program breakdown",
      description: "Direct recovered values from the same canonical part-level source.",
      snapshot: organization,
      filter: () => true,
      sort: (record) => record.recoveredToDate,
    },
    forecast: {
      title: "Forecast at completion — program breakdown",
      description: "Versioned development forecast; not an approved production provider forecast.",
      snapshot: organization,
      filter: () => true,
      sort: (record) => record.forecastAtCompletion,
    },
    under: {
      title: "Under-recovery exposure — evidence review",
      description: "Gross negative program variances. Tract does not infer a claim or remedy.",
      snapshot: organization,
      filter: (record) => record.projectedVariance < 0,
      sort: (record) => Math.max(-record.projectedVariance, 0),
    },
    over: {
      title: "Over-recovery balance — evidence review",
      description:
        "Gross positive program variances. Accounting treatment remains customer-controlled.",
      snapshot: organization,
      filter: (record) => record.projectedVariance > 0,
      sort: (record) => Math.max(record.projectedVariance, 0),
    },
    my2026: {
      title: "Model year 2026 over-recovery review",
      description:
        "Direct MY 2026 synthetic allocations with the model-year filter recorded in provenance.",
      snapshot: my2026,
      filter: (record) => record.projectedVariance > 0,
      sort: (record) => Math.max(record.projectedVariance, 0),
    },
  };
  const selected = config[detail];
  const rows = selected.snapshot.programRecords
    .filter(selected.filter)
    .sort((left, right) => selected.sort(right) - selected.sort(left));
  const renderedRows = buildBoundedTablePage({
    rows,
    page,
    pageSize: 50,
    direction: "none",
    compare: () => 0,
  });
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" data-kpi-detail={detail}>
        <DialogHeader>
          <DialogTitle>{selected.title}</DialogTitle>
          <DialogDescription>{selected.description}</DialogDescription>
        </DialogHeader>
        <ProvenanceLine snapshot={selected.snapshot} detailed />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Program</th>
                <th className="px-3 py-2 text-right font-medium">Recoverable cost</th>
                <th className="px-3 py-2 text-right font-medium">Recovered</th>
                <th className="px-3 py-2 text-right font-medium">Forecast</th>
                <th className="px-3 py-2 text-right font-medium">Variance</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border" data-overlay-render-limit="50">
              {renderedRows.rows.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2">
                    <Link
                      to="/programs"
                      search={{ programId: record.programId }}
                      className="font-medium text-brand hover:underline"
                    >
                      {record.label}
                    </Link>
                    <div className="text-xs text-muted-foreground">{record.secondaryLabel}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatMoney(record.totalRecoverableCost, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatMoney(record.recoveredToDate, { compact: true })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatMoney(record.forecastAtCompletion, { compact: true })}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono text-xs ${record.projectedVariance < 0 ? "text-destructive" : "text-success"}`}
                  >
                    {record.projectedVariance > 0 ? "+" : ""}
                    {formatMoney(record.projectedVariance, { compact: true })}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill {...statusMeta[record.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 bg-background pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {renderedRows.rows.length} of {renderedRows.totalRows} programs; at most 50 rows
            render at once.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={renderedRows.page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {renderedRows.page} of {renderedRows.pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={renderedRows.page === renderedRows.pageCount}
              onClick={() => setPage((current) => Math.min(renderedRows.pageCount, current + 1))}
            >
              Next
            </Button>
          </div>
          <Button variant="outline" onClick={() => downloadCsv(selected.snapshot)}>
            <Download className="mr-1.5 h-4 w-4" /> Download this breakdown
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SeriesTable({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div
      className="mt-4 max-h-96 overflow-auto rounded-lg border border-border"
      data-analysis-series="table"
    >
      <table className="w-full min-w-[820px] text-sm">
        <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Month</th>
            <th className="px-3 py-2 text-right">Actual</th>
            <th className="px-3 py-2 text-right">Contract curve</th>
            <th className="px-3 py-2 text-right">Forecast</th>
            <th className="px-3 py-2 text-right">Variance</th>
            <th className="px-3 py-2 text-right">Cumulative recovery</th>
            <th className="px-3 py-2 text-right">Remaining recovery</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {snapshot.series.map((period) => (
            <tr key={period.period}>
              <td className="px-3 py-2 font-medium">{period.period}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {period.actual === null ? "—" : formatMoney(period.actual)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {formatMoney(period.contract)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {formatMoney(period.forecast)}
              </td>
              <td
                className={`px-3 py-2 text-right font-mono text-xs ${period.variance < 0 ? "text-destructive" : "text-success"}`}
              >
                {formatMoney(period.variance)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {formatMoney(period.cumulativeRecovery)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {formatMoney(period.remainingRecovery)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProvenanceLine({
  snapshot,
  detailed = false,
}: {
  snapshot: AnalysisSnapshot;
  detailed?: boolean;
}) {
  return (
    <div
      className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground"
      data-analysis-provenance
    >
      <span>As of {new Date(snapshot.provenance.asOf).toLocaleString()}</span>
      <span>{snapshot.provenance.currency}</span>
      <span>Calculation {snapshot.provenance.calculationVersion}</span>
      {detailed && <span>Forecast {snapshot.provenance.forecastVersion}</span>}
      {detailed && <span>Source {snapshot.provenance.sourceVersion}</span>}
      <span>Synthetic demonstration data</span>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  signed = false,
}: {
  label: string;
  value: number;
  signed?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">
        {signed && value > 0 ? "+" : ""}
        {formatMoney(value, { compact: true })}
      </div>
    </div>
  );
}

function SortHead({
  label,
  value,
  active,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  value: SortKey;
  active: SortKey;
  direction: SortDirection;
  onSort: (value: SortKey) => void;
  align?: "left" | "right";
}) {
  const current = active === value ? direction : "none";
  const Icon =
    current === "ascending" ? ArrowUp : current === "descending" ? ArrowDown : ArrowUpDown;
  return (
    <th
      className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}
      aria-sort={current}
    >
      <button
        type="button"
        onClick={() => onSort(value)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label} <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function moneyAxis(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (absolute >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
