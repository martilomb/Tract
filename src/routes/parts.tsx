import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CreatePartRevisionDialog } from "@/components/create-part-revision-dialog";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { StatusPill } from "@/components/stat-card";
import {
  statusMeta,
  formatMoney,
  formatNumber,
  getDCR,
  type Part,
  type RecoveryStatus,
} from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Search,
  FileText,
  X,
  Printer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OemMark } from "@/components/oem-badge";
import { commodityImage } from "@/lib/part-images";
import { useCommodity } from "@/lib/commodity";
import { buildBoundedTablePage, type TableSortDirection } from "@/domain/bounded-table";

export const Route = createFileRoute("/parts")({
  component: PartsPage,
});

type PartSortKey =
  | "partNumber"
  | "description"
  | "programName"
  | "piecePrice"
  | "amortizedPerPiece"
  | "shippedVolume"
  | "recoveredToDate"
  | "breakEvenDate"
  | "status";
type SortDirection = TableSortDirection;
const PAGE_SIZE = 50;

function PartsPage() {
  const { parts, programs } = useDataset();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [oemFilter, setOemFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [minShipPct, setMinShipPct] = useState<number>(0);
  const [minAmort, setMinAmort] = useState<number>(0);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [dcrPart, setDcrPart] = useState<Part | null>(null);
  const [sortKey, setSortKey] = useState<PartSortKey>("partNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("ascending");
  const [page, setPage] = useState(1);
  const [hierarchy, setHierarchy] = useState<HierarchySelection>({
    oem: "all",
    programId: "all",
    modelYear: "all",
  });

  const oems = useMemo(() => Array.from(new Set(parts.map((p) => p.oem))).sort(), [parts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return parts.filter((p) => {
      const matches =
        !q ||
        p.partNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.programName.toLowerCase().includes(q) ||
        p.oem.toLowerCase().includes(q);
      const s = statusFilter === "all" || p.status === statusFilter;
      const o = oemFilter === "all" || p.oem === oemFilter;
      const pr = programFilter === "all" || p.programId === programFilter;
      const shipPct = (p.shippedVolume / p.contractedVolume) * 100;
      const shipOk = shipPct >= minShipPct;
      const amortOk = p.totalAmortized >= minAmort;
      return matches && s && o && pr && shipOk && amortOk;
    });
  }, [parts, query, statusFilter, oemFilter, programFilter, minShipPct, minAmort]);

  const tablePage = useMemo(
    () =>
      buildBoundedTablePage({
        rows: filtered,
        page,
        pageSize: PAGE_SIZE,
        direction: sortDirection,
        compare: (left, right) => {
          const a = left[sortKey];
          const b = right[sortKey];
          return typeof a === "number" && typeof b === "number"
            ? a - b
            : String(a).localeCompare(String(b));
        },
      }),
    [filtered, page, sortDirection, sortKey],
  );
  const pageCount = tablePage.pageCount;
  const visibleParts = tablePage.rows;

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, oemFilter, programFilter, minShipPct, minAmort]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const toggleSort = (key: PartSortKey) => {
    if (sortKey !== key || sortDirection === "none") {
      setSortKey(key);
      setSortDirection("ascending");
    } else if (sortDirection === "ascending") {
      setSortDirection("descending");
    } else {
      setSortDirection("none");
    }
    setPage(1);
  };

  const advancedActive =
    oemFilter !== "all" || programFilter !== "all" || minShipPct > 0 || minAmort > 0;

  const resetAdvanced = () => {
    setOemFilter("all");
    setProgramFilter("all");
    setMinShipPct(0);
    setMinAmort(0);
  };

  const exportCsv = () => {
    const header = [
      "Part Number",
      "Description",
      "Program",
      "OEM",
      "Piece Price",
      "Amortized Per Piece",
      "Contracted Volume",
      "Shipped Volume",
      "Forecast Volume",
      "Total Amortized",
      "Recovered To Date",
      "Break-even Date",
      "Status",
    ];
    const rows = filtered.map((p) => [
      p.partNumber,
      p.description,
      p.programName,
      p.oem,
      p.piecePrice.toFixed(2),
      p.amortizedPerPiece.toFixed(2),
      p.contractedVolume,
      p.shippedVolume,
      p.forecastVolume,
      p.totalAmortized,
      p.recoveredToDate,
      p.breakEvenDate,
      statusMeta[p.status].label,
    ]);
    const csv =
      [header, ...rows]
        .map((r) =>
          r
            .map((cell) => {
              const s = String(cell);
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(","),
        )
        .join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tract-parts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} parts to CSV`);
  };

  const statusCounts = useMemo(() => {
    const c: Record<RecoveryStatus, number> = {
      "on-track": 0,
      over: 0,
      under: 0,
      "at-risk": 0,
    };
    for (const p of parts) c[p.status] += 1;
    return c;
  }, [parts]);

  return (
    <AppShell
      title="Part Numbers"
      description={`Tracking ${parts.length} active part numbers across all OEM contracts.`}
      actions={
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-1.5 h-4 w-4" /> Advanced
                {advancedActive && (
                  <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                    •
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Advanced filters</div>
                <button
                  onClick={resetAdvanced}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">OEM</Label>
                  <Select value={oemFilter} onValueChange={setOemFilter}>
                    <SelectTrigger className="h-8" aria-label="Advanced OEM filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All OEMs</SelectItem>
                      {oems.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Program</Label>
                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger className="h-8" aria-label="Advanced program filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All programs</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Min shipped %</Label>
                    <span className="font-mono text-xs text-muted-foreground">{minShipPct}%</span>
                  </div>
                  <Slider
                    aria-label="Minimum shipped percentage"
                    value={[minShipPct]}
                    onValueChange={(v) => setMinShipPct(v[0])}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Min total amortized</Label>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatMoney(minAmort, { compact: true })}
                    </span>
                  </div>
                  <Slider
                    aria-label="Minimum total amortized"
                    value={[minAmort]}
                    onValueChange={(v) => setMinAmort(v[0])}
                    max={2_000_000}
                    step={50_000}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <CreatePartRevisionDialog trigger={<Button size="sm">Create part or revision</Button>} />
        </>
      }
    >
      <div className="mb-5 card-elevated p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          OEM → program / model → model year → part / revision
        </div>
        <HierarchicalProgramSelector
          programs={programs}
          parts={parts}
          value={hierarchy}
          showPart
          onChange={(selection) => {
            setHierarchy(selection);
            setOemFilter(selection.oem);
            setProgramFilter(selection.programId);
            if (selection.partId) {
              const part = parts.find((candidate) => candidate.id === selection.partId);
              if (part) setQuery(part.partNumber);
            }
            setPage(1);
          }}
        />
      </div>
      <CommodityHero />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search part #, description, program, OEM"
            className="h-9 pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {[
            { k: "all", label: `All (${parts.length})` },
            { k: "on-track", label: `On track (${statusCounts["on-track"]})` },
            { k: "over", label: `Over (${statusCounts.over})` },
            { k: "under", label: `Under (${statusCounts.under})` },
            { k: "at-risk", label: `At risk (${statusCounts["at-risk"]})` },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setStatusFilter(t.k)}
              className={
                "rounded-full border px-3 py-1 font-medium transition-colors " +
                (statusFilter === t.k
                  ? "border-brand bg-brand text-white"
                  : "border-border text-muted-foreground hover:bg-secondary")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {parts.length} parts
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-secondary/90 backdrop-blur text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <SortableHead
                  label="Part #"
                  sortKey="partNumber"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Description"
                  sortKey="description"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Program"
                  sortKey="programName"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <SortableHead
                  label="Piece $"
                  sortKey="piecePrice"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Amort/pc"
                  sortKey="amortizedPerPiece"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Shipped / Contract"
                  sortKey="shippedVolume"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Recovered"
                  sortKey="recoveredToDate"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Break-even"
                  sortKey="breakEvenDate"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHead
                  label="Status"
                  sortKey="status"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={toggleSort}
                />
                <th className="px-4 py-3 text-center font-medium">DCR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleParts.map((p) => {
                const shipPct = (p.shippedVolume / p.contractedVolume) * 100;
                return (
                  <tr key={p.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPart(p)}
                        className="font-mono text-xs font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View details for ${p.partNumber}`}
                      >
                        {p.partNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3">{p.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <OemMark oem={p.oem} size="sm" />
                        <div>
                          <div className="text-xs font-medium leading-tight">{p.programName}</div>
                          <div className="text-[11px] text-muted-foreground">{p.oem}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      ${p.piecePrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      ${p.amortizedPerPiece.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono text-xs">
                        {formatNumber(p.shippedVolume)}{" "}
                        <span className="text-muted-foreground">
                          / {formatNumber(p.contractedVolume)}
                        </span>
                      </div>
                      <div className="mt-1 ml-auto h-1 w-24 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={
                            "h-full rounded-full " +
                            (shipPct >= 100
                              ? "bg-success"
                              : shipPct >= 70
                                ? "bg-brand"
                                : "bg-warning")
                          }
                          style={{ width: `${Math.min(100, shipPct)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <div>{formatMoney(p.recoveredToDate, { compact: true })}</div>
                      <div className="text-[11px] text-muted-foreground">
                        of {formatMoney(p.totalAmortized, { compact: true })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.breakEvenDate.slice(0, 7)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill {...statusMeta[p.status]} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setDcrPart(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-brand hover:bg-brand/5 hover:text-brand"
                        title="View Design Change Request"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No parts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {tablePage.totalRows === 0 ? 0 : (tablePage.page - 1) * PAGE_SIZE + 1}–
            {Math.min(tablePage.page * PAGE_SIZE, tablePage.totalRows)} of {tablePage.totalRows}{" "}
            matching parts · maximum {PAGE_SIZE} rendered rows
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="font-mono">
              Page {tablePage.page} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <PartDetailDialog
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        onOpenDcr={(p) => {
          setSelectedPart(null);
          setDcrPart(p);
        }}
      />
      <DcrDialog part={dcrPart} onClose={() => setDcrPart(null)} />
    </AppShell>
  );
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: PartSortKey;
  activeKey: PartSortKey;
  direction: SortDirection;
  onSort: (key: PartSortKey) => void;
  align?: "left" | "right";
}) {
  const activeDirection = activeKey === sortKey ? direction : "none";
  const Icon =
    activeDirection === "ascending"
      ? ArrowUp
      : activeDirection === "descending"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <th
      className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}
      aria-sort={activeDirection}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${align === "right" ? "justify-end" : "justify-start"}`}
      >
        {label} <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function PartDetailDialog({
  part,
  onClose,
  onOpenDcr,
}: {
  part: Part | null;
  onClose: () => void;
  onOpenDcr: (p: Part) => void;
}) {
  return (
    <Dialog open={!!part} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {part && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <StatusPill {...statusMeta[part.status]} />
                <span className="text-xs text-muted-foreground">
                  {part.oem} · {part.programName}
                </span>
              </div>
              <DialogTitle className="mt-2 flex items-baseline gap-3">
                <span className="font-mono text-brand">{part.partNumber}</span>
              </DialogTitle>
              <DialogDescription>{part.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-sm font-semibold">Shipments toward contracted volume</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {((part.shippedVolume / part.contractedVolume) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-brand"
                    style={{
                      width: `${Math.min(100, (part.shippedVolume / part.contractedVolume) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <Metric
                    label="Shipped to date"
                    value={formatNumber(part.shippedVolume)}
                    hint="pieces"
                  />
                  <Metric
                    label="Contracted"
                    value={formatNumber(part.contractedVolume)}
                    hint="pieces"
                  />
                  <Metric
                    label="Remaining"
                    value={formatNumber(Math.max(0, part.contractedVolume - part.shippedVolume))}
                    hint="pieces"
                  />
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Forecast-scenario total shipments at EOP:{" "}
                  <span className="font-mono text-foreground">
                    {formatNumber(part.forecastVolume)}
                  </span>{" "}
                  ({((part.forecastVolume / part.contractedVolume) * 100).toFixed(0)}% of contract)
                </div>
              </section>

              <Separator />

              <section>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-sm font-semibold">Amortization recovery</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {((part.recoveredToDate / part.totalAmortized) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${Math.min(100, (part.recoveredToDate / part.totalAmortized) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                  <Metric
                    label="Recovered"
                    value={formatMoney(part.recoveredToDate, { compact: true })}
                  />
                  <Metric
                    label="Total to recover"
                    value={formatMoney(part.totalAmortized, { compact: true })}
                  />
                  <Metric label="Break-even" value={part.breakEvenDate.slice(0, 7)} />
                </div>
              </section>

              <Separator />

              <section className="grid grid-cols-2 gap-3 text-xs">
                <Metric label="Piece price" value={`$${part.piecePrice.toFixed(2)}`} />
                <Metric
                  label="Amortized per piece"
                  value={`$${part.amortizedPerPiece.toFixed(2)}`}
                />
              </section>

              <Separator />

              <section>
                <div className="text-sm font-semibold">Projection and provenance</div>
                <div className="mt-2 grid gap-3 text-xs sm:grid-cols-3">
                  <Metric
                    label="Actual recovery"
                    value={formatMoney(part.recoveredToDate, { compact: true })}
                  />
                  <Metric
                    label="Contract basis"
                    value={formatMoney(part.totalAmortized, { compact: true })}
                  />
                  <Metric
                    label="Forecast at EOP"
                    value={formatMoney(part.forecastVolume * part.amortizedPerPiece, {
                      compact: true,
                    })}
                  />
                  <Metric
                    label="Forecast variance"
                    value={formatMoney(
                      part.forecastVolume * part.amortizedPerPiece - part.totalAmortized,
                      { compact: true },
                    )}
                  />
                  <Metric label="Break-even" value={part.breakEvenDate.slice(0, 7)} />
                  <Metric label="Calculation" value="Development policy v1" />
                </div>
                <div className="mt-3 rounded-lg border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Source provenance:</strong> synthetic staged
                  shipments · approved-rate fixture v1 · deterministic calculation manifest ·
                  agreement evidence must be reviewed in the canonical Contracts workspace. No live
                  ERP or provider data is represented.
                </div>
              </section>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => onOpenDcr(part)}>
                <FileText className="mr-1.5 h-4 w-4" />
                Review DCR evidence
              </Button>
              <Button asChild variant="outline">
                <Link to="/contracts">Open linked agreements</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function DcrDialog({ part, onClose }: { part: Part | null; onClose: () => void }) {
  const dcr = part ? getDCR(part) : null;
  return (
    <Dialog open={!!part} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0" showCloseButton={false}>
        {part && dcr && (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur print:hidden">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Design Change Request
                </div>
                <div className="font-mono text-sm font-semibold text-brand">
                  {dcr.dcrNumber} · {part.partNumber}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print / Save PDF
                </Button>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>

            <div className="bg-white px-8 py-6 font-serif text-[13px] text-slate-900">
              <div className="mb-4 border-b-2 border-slate-900 pb-2">
                <h2 className="text-lg font-bold">Design Change Request (DCR)</h2>
              </div>

              <table className="mb-4 w-full border border-slate-400 text-xs">
                <tbody>
                  <DcrRow
                    left={["Program:", part.programName]}
                    right={["DCR Number:", dcr.dcrNumber]}
                  />
                  <DcrRow
                    left={["Initiator:", dcr.initiator]}
                    right={["Investigator:", dcr.investigator]}
                  />
                  <DcrRow
                    left={["Date Initiated:", dcr.dateInitiated]}
                    right={["Investigator's Org:", dcr.investigatorOrg]}
                  />
                  <DcrRow
                    left={["Module/Component:", dcr.moduleComponent]}
                    right={[
                      "Response Due:",
                      new Date(
                        new Date(dcr.dateInitiated).getTime() + 7 * 24 * 3600 * 1000,
                      ).toLocaleDateString(),
                    ]}
                  />
                  <DcrRow
                    left={["P/N Affected:", part.partNumber]}
                    right={["Response Complete:", "—"]}
                  />
                  <DcrRow
                    left={["Subject of Change:", dcr.subject]}
                    right={["Attachments:", "YES  x   4 total"]}
                  />
                </tbody>
              </table>

              <DcrSection title="Change Request Information">
                <div className="mb-2 text-xs font-semibold uppercase">Reason for change:</div>
                <ol className="mb-3 list-decimal space-y-0.5 pl-6 text-xs">
                  {dcr.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
                <div className="mb-2 text-xs font-semibold uppercase">Proposed changes:</div>
                <ol className="list-decimal space-y-0.5 pl-6 text-xs">
                  {dcr.proposedChanges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ol>
              </DcrSection>

              <DcrSection title="Impact of Change">
                <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-xs">
                  <div>
                    <span className="font-semibold">Hardware:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">PCB Layout:</span> —
                  </div>
                  <div>
                    <span className="font-semibold">EMC:</span> —
                  </div>
                  <div>
                    <span className="font-semibold">Software:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">Code Revision:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">Testing Time:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">Mechanical:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">Housing:</span> X
                  </div>
                  <div>
                    <span className="font-semibold">Connector:</span> —
                  </div>
                </div>
              </DcrSection>

              <DcrSection title="Notes / Communications">
                <p className="text-xs leading-relaxed">{dcr.notes}</p>
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Pricing Impact:</span> $
                  {dcr.edtCost.toLocaleString()} ED&amp;T; amortized into the piece price @ $
                  {dcr.piecePriceImpact.toFixed(2)} per part over {dcr.totalVolume.toLocaleString()}{" "}
                  total volume.
                </p>
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Timing:</span> {dcr.timing}
                </p>
              </DcrSection>

              <DcrSection title="Supplier Contacts">
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="py-1 pr-4 font-semibold">Salesman:</td>
                      <td className="py-1 pr-4">{dcr.supplierSalesman}</td>
                      <td className="py-1 pr-4 font-semibold">Email:</td>
                      <td className="py-1">{dcr.supplierSalesmanEmail}</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 font-semibold">Engineer:</td>
                      <td className="py-1 pr-4">{dcr.supplierEngineer}</td>
                      <td className="py-1 pr-4 font-semibold">Email:</td>
                      <td className="py-1">{dcr.supplierEngineerEmail}</td>
                    </tr>
                  </tbody>
                </table>
              </DcrSection>

              <DcrSection title="Authorization">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-400 text-left">
                      <th className="py-1 font-semibold"></th>
                      <th className="py-1 font-semibold">Name</th>
                      <th className="py-1 font-semibold">Signature</th>
                      <th className="py-1 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-2 font-semibold">Authorized to Investigate:</td>
                      <td className="py-1.5">{dcr.initiator}</td>
                      <td className="py-1.5 italic">{dcr.initiator}</td>
                      <td className="py-1.5">{dcr.dateInitiated}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-1.5 pr-2 font-semibold">PMT Reviewed &amp; Approved:</td>
                      <td className="py-1.5 text-slate-400">—</td>
                      <td className="py-1.5 text-slate-400">—</td>
                      <td className="py-1.5 text-slate-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-semibold">Authorize to Incorporate:</td>
                      <td className="py-1.5 text-slate-400">—</td>
                      <td className="py-1.5 text-slate-400">—</td>
                      <td className="py-1.5 text-slate-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </DcrSection>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DcrRow({ left, right }: { left: [string, string]; right: [string, string] }) {
  return (
    <tr className="border-b border-slate-300 last:border-b-0">
      <td className="w-[15%] border-r border-slate-300 px-2 py-1 font-semibold">{left[0]}</td>
      <td className="w-[35%] border-r border-slate-300 px-2 py-1">{left[1]}</td>
      <td className="w-[18%] border-r border-slate-300 px-2 py-1 font-semibold">{right[0]}</td>
      <td className="w-[32%] px-2 py-1">{right[1]}</td>
    </tr>
  );
}

function DcrSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border border-slate-400">
      <div className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-xs font-bold">
        {title}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function CommodityHero() {
  const { commodity } = useCommodity();
  if (commodity === "all") return null;
  const img = commodityImage(commodity);
  if (!img) return null;
  return (
    <div className="mb-4 overflow-hidden card-elevated">
      <div className="relative flex items-stretch gap-4 gradient-navy p-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex h-20 w-24 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
          <img src={img} alt={commodity} className="max-h-16 w-auto object-contain" />
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
            Commodity focus
          </div>
          <div className="mt-0.5 text-lg font-bold leading-tight text-white">{commodity}</div>
          <div className="mt-1 text-[11px] text-white/60">
            Filtered view — programs, part numbers, DCRs and recoveries scoped to this component
            family.
          </div>
        </div>
      </div>
    </div>
  );
}
