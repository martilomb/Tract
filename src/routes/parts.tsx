import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
import { Download, FileText, Search, Table2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney, formatNumber, programModelYears, type Part } from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import {
  analysisCsv,
  buildAnalysisSnapshot,
  DEFAULT_ANALYSIS_SCOPE,
  type AnalysisRecord,
  type AnalysisSnapshot,
} from "@/domain/analytics";
import { buildBoundedTablePage } from "@/domain/bounded-table";

type PartSearch = {
  oem?: string;
  programId?: string;
  modelYear?: number;
  partId?: string;
  query?: string;
  view?: "chart" | "table";
};

export const Route = createFileRoute("/parts")({
  component: PartsPage,
  validateSearch: (search: Record<string, unknown>): PartSearch => ({
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear:
      Number.isInteger(Number(search.modelYear)) && Number(search.modelYear) >= 1900
        ? Number(search.modelYear)
        : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
    query: typeof search.query === "string" ? search.query : undefined,
    view: search.view === "table" ? "table" : search.view === "chart" ? "chart" : undefined,
  }),
});

function PartsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { programs, parts } = useDataset();
  const [selection, setSelection] = useState<HierarchySelection>({
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: search.modelYear === undefined ? "all" : String(search.modelYear),
    partId: !search.partId || search.partId === "all" ? undefined : search.partId,
  });
  const [query, setQuery] = useState(search.query ?? "");
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const snapshot = useMemo(
    () =>
      buildAnalysisSnapshot(
        { programs, parts, programModelYears },
        {
          ...DEFAULT_ANALYSIS_SCOPE,
          dimension: "part",
          oem: selection.oem,
          programId: selection.programId,
          modelYear: selection.modelYear === "all" ? "all" : Number(selection.modelYear),
          partId: selection.partId ?? "all",
        },
      ),
    [programs, parts, selection],
  );
  const records = useMemo(
    () =>
      snapshot.partRecords.filter((record) =>
        `${record.label} ${record.secondaryLabel} ${record.oem}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [snapshot, query],
  );
  const page = useMemo(
    () =>
      buildBoundedTablePage({
        rows: records,
        page: 1,
        pageSize: 100,
        direction: "ascending",
        compare: (a, b) => a.label.localeCompare(b.label),
      }),
    [records],
  );
  const setScope = (next: HierarchySelection) => {
    setSelection(next);
    void navigate({
      search: {
        ...search,
        oem: next.oem,
        programId: next.programId,
        modelYear: next.modelYear === "all" ? undefined : Number(next.modelYear),
        partId: next.partId ?? "all",
        query,
      },
    });
  };
  const setQueryAndUrl = (value: string) => {
    setQuery(value);
    void navigate({ search: { ...search, query: value } });
  };
  const exportScope = () => {
    const url = URL.createObjectURL(
      new Blob([analysisCsv(snapshot)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tract-part-numbers-analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const closePartDetail = () => {
    setSelected(null);
    window.setTimeout(() => selectedTriggerRef.current?.focus(), 0);
  };
  return (
    <AppShell
      title="Part Numbers"
      description="Controlled part and revision analysis. Use guided recovery setup for normal work; authorized administrators and integrations maintain master data."
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
          onChange={setScope}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {snapshot.scopeLabel}. This synthetic workspace reconciles charts, detail and export to
          the same calculation version.
        </p>
      </section>
      <Summary snapshot={snapshot} />
      <section className="card-elevated mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Selected part recovery curve</h2>
            <p className="text-xs text-muted-foreground">
              Month-by-month actual, contractual curve, forecast, variance, cumulative and remaining
              recovery.
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
              <Table2 className="mr-1 h-4 w-4" />
              Table
            </Button>
            <Button size="sm" variant="outline" onClick={exportScope}>
              <Download className="mr-1 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        {search.view === "chart" ? <Series snapshot={snapshot} /> : <Periods snapshot={snapshot} />}
        <Provenance snapshot={snapshot} />
      </section>
      <section className="mt-5 card-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Part numbers in scope</h2>
            <p className="text-xs text-muted-foreground">
              Bounded results; select a record for drill-down, evidence and linked agreement review.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 pr-8"
              value={query}
              onChange={(e) => setQueryAndUrl(e.target.value)}
              placeholder="Search part number, program, OEM"
            />
            {query && (
              <button
                aria-label="Clear part search"
                className="absolute right-2 top-2.5 text-muted-foreground"
                onClick={() => setQueryAndUrl("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Part number</th>
                <th className="px-4 py-3">Program / OEM</th>
                <th className="px-4 py-3 text-right">Recoverable</th>
                <th className="px-4 py-3 text-right">Recovered</th>
                <th className="px-4 py-3 text-right">Forecast variance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {page.rows.map((record) => (
                <tr key={record.id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <button
                      className="font-mono font-semibold text-brand hover:underline"
                      onClick={(event) => {
                        selectedTriggerRef.current = event.currentTarget;
                        setSelected(record);
                      }}
                    >
                      {record.label}
                    </button>
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
                  <td className="px-4 py-3 capitalize">{record.status.replace("-", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Showing {page.rows.length} of {page.totalRows} matching part numbers; at most 100 rows
          rendered.
        </div>
      </section>
      <PartDetail
        part={selected}
        fixture={selected ? (parts.find((p) => p.id === selected.partId) ?? null) : null}
        snapshot={snapshot}
        onClose={closePartDetail}
      />
    </AppShell>
  );
}

function Summary({ snapshot }: { snapshot: AnalysisSnapshot }) {
  const rows = [
    ["Total recoverable", snapshot.metrics.totalRecoverableCost],
    ["Recovered to date", snapshot.metrics.recoveredToDate],
    ["Forecast at completion", snapshot.metrics.forecastAtCompletion],
    ["Projected variance", snapshot.metrics.projectedVariance],
    ["Remaining recovery", snapshot.metrics.remainingRecovery],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {rows.map(([label, value]) => (
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
function Series({ snapshot }: { snapshot: AnalysisSnapshot }) {
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
function Periods({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="mt-5 max-h-80 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background">
          <tr>
            <th>Period</th>
            <th>Actual</th>
            <th>Contract</th>
            <th>Forecast</th>
            <th>Variance</th>
            <th>Cumulative</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.series.map((row) => (
            <tr key={row.period} className="border-t">
              <td className="py-2">{row.period}</td>
              <td>{row.actual === null ? "—" : formatMoney(row.actual, { compact: true })}</td>
              <td>{formatMoney(row.contract, { compact: true })}</td>
              <td>{formatMoney(row.forecast, { compact: true })}</td>
              <td>{formatMoney(row.variance, { compact: true })}</td>
              <td>{formatMoney(row.cumulativeRecovery, { compact: true })}</td>
              <td>{formatMoney(row.remainingRecovery, { compact: true })}</td>
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
      · forecast {p.forecastVersion} · source {p.sourceVersion}. Synthetic data only;{" "}
      <Link to="/contracts" className="text-brand hover:underline">
        review linked agreement evidence
      </Link>
      .
    </div>
  );
}
function PartDetail({
  part,
  fixture,
  snapshot,
  onClose,
}: {
  part: AnalysisRecord | null;
  fixture: Part | null;
  snapshot: AnalysisSnapshot;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!part} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        {part && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-brand">{part.label}</DialogTitle>
              <DialogDescription>
                {part.secondaryLabel} · {part.oem}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Recoverable cost"
                  value={formatMoney(part.totalRecoverableCost, { compact: true })}
                />
                <Metric
                  label="Recovered to date"
                  value={formatMoney(part.recoveredToDate, { compact: true })}
                />
                <Metric
                  label="Remaining recovery"
                  value={formatMoney(part.remainingRecovery, { compact: true })}
                />
                <Metric
                  label="Forecast at completion"
                  value={formatMoney(part.forecastAtCompletion, { compact: true })}
                />
                <Metric
                  label="Forecast variance"
                  value={formatMoney(part.projectedVariance, { compact: true })}
                />
                <Metric
                  label="Break-even"
                  value={
                    fixture?.breakEvenDate.slice(0, 7) ?? snapshot.breakEvenPeriod ?? "Not reached"
                  }
                />
              </div>
              <div className="rounded border bg-secondary/30 p-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Provenance and evidence:</strong>{" "}
                {part.evidenceIds.join(" · ")}. This record is derived from the same scoped
                calculation series shown on this page; no live ERP, provider, or customer evidence
                is represented.
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Actual units" value={formatNumber(part.actualUnits)} />
                <Metric label="Contracted units" value={formatNumber(part.contractedUnits)} />
                <Metric label="Forecast units" value={formatNumber(part.forecastUnits)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button asChild variant="outline">
                <Link to="/contracts">
                  <FileText className="mr-1 h-4 w-4" />
                  View evidence
                </Link>
              </Button>
              <Button asChild>
                <Link to="/contracts">Set up / activate recovery</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-secondary/30 p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
