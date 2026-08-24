import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/stat-card";
import {
  statusMeta,
  formatMoney,
  formatNumber,
  programModelYears,
  type Program,
} from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ChevronRight, ArrowLeft } from "lucide-react";
import { OemMark } from "@/components/oem-badge";
import { CreateProgramDialog } from "@/components/create-program-dialog";

export const Route = createFileRoute("/programs")({
  component: ProgramsPage,
});

interface OemGroup {
  oem: string;
  programs: Program[];
  totalAmortized: number;
  recoveredToDate: number;
  forecastRecovery: number;
  partsCount: number;
  modelYearEntries: number;
  statusCounts: Record<string, number>;
}

function groupByOem(programs: Program[]): OemGroup[] {
  const map = new Map<string, OemGroup>();
  for (const p of programs) {
    const years = programModelYears[p.id] ?? [new Date(p.sop).getFullYear()];
    if (!map.has(p.oem)) {
      map.set(p.oem, {
        oem: p.oem,
        programs: [],
        totalAmortized: 0,
        recoveredToDate: 0,
        forecastRecovery: 0,
        partsCount: 0,
        modelYearEntries: 0,
        statusCounts: {},
      });
    }
    const g = map.get(p.oem)!;
    g.programs.push(p);
    g.totalAmortized += p.totalAmortized;
    g.recoveredToDate += p.recoveredToDate;
    g.forecastRecovery += p.forecastRecovery;
    g.partsCount += p.partsCount;
    g.modelYearEntries += years.length;
    g.statusCounts[p.status] = (g.statusCounts[p.status] ?? 0) + 1;
  }
  return [...map.values()].sort((a, b) => b.totalAmortized - a.totalAmortized);
}

function ProgramsPage() {
  const { programs } = useDataset();
  const [selectedOem, setSelectedOem] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupByOem(programs), [programs]);

  if (!selectedOem) {
    const filtered = query
      ? groups.filter((g) => g.oem.toLowerCase().includes(query.toLowerCase()))
      : groups;
    return (
      <AppShell
        title="Vehicle Programs"
        description="Synthetic OEM, carline, and model-year fixtures for recovery workflow review."
        actions={
          <CreateProgramDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New program
              </Button>
            }
          />
        }
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search OEMs"
              className="h-9 pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {groups.length} OEMs · {groups.reduce((n, g) => n + g.programs.length, 0)} carlines ·{" "}
            {groups.reduce((n, g) => n + g.modelYearEntries, 0)} model years
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => {
            const pct = (g.recoveredToDate / g.totalAmortized) * 100;
            const fpct = (g.forecastRecovery / g.totalAmortized) * 100;
            const previews = g.programs.slice(0, 3);
            return (
              <button
                key={g.oem}
                onClick={() => setSelectedOem(g.oem)}
                className="card-elevated group overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative overflow-hidden gradient-navy px-5 pb-3 pt-4">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                      backgroundSize: "22px 22px",
                    }}
                  />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <OemMark oem={g.oem} size="lg" />
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                          Original Equipment Manufacturer
                        </div>
                        <div className="text-lg font-bold leading-tight text-white">{g.oem}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white/80" />
                  </div>

                  <div className="relative mt-4 grid grid-cols-3 gap-2 pb-2">
                    {previews.length ? (
                      previews.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-center"
                        >
                          <div className="truncate text-[10px] font-medium text-white/85">
                            {p.name}
                          </div>
                          <div className="mt-1 font-mono text-[9px] text-white/50">{p.code}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-white/40">{g.programs.length} programs</div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-secondary/40 p-2">
                      <div className="font-mono text-sm font-bold">{g.programs.length}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Carlines</div>
                    </div>
                    <div className="rounded-md bg-secondary/40 p-2">
                      <div className="font-mono text-sm font-bold">{g.modelYearEntries}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Model years</div>
                    </div>
                    <div className="rounded-md bg-secondary/40 p-2">
                      <div className="font-mono text-sm font-bold">
                        {formatNumber(g.partsCount)}
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">Parts</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Recovery progress</span>
                      <span className="font-mono font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-brand/25"
                        style={{ width: `${Math.min(100, fpct)}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-brand"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                      <span>{formatMoney(g.recoveredToDate, { compact: true })} recovered</span>
                      <span>of {formatMoney(g.totalAmortized, { compact: true })}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(["over", "on-track", "under", "at-risk"] as const).map((s) =>
                      g.statusCounts[s] ? (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          <span className={"h-1.5 w-1.5 rounded-full " + statusMeta[s].dot} />
                          {g.statusCounts[s]} {statusMeta[s].label}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </AppShell>
    );
  }

  // ---- OEM detail view ----
  const oemPrograms = programs.filter((p) => p.oem === selectedOem);
  // Expand each program into one entry per model year.
  const entries = oemPrograms.flatMap((p) => {
    const years = programModelYears[p.id] ?? [new Date(p.sop).getFullYear()];
    return years.map((year) => ({ program: p, year }));
  });
  const filteredEntries = query
    ? entries.filter(
        (e) =>
          `${e.year} ${e.program.name}`.toLowerCase().includes(query.toLowerCase()) ||
          e.program.code.toLowerCase().includes(query.toLowerCase()) ||
          e.program.platform.toLowerCase().includes(query.toLowerCase()),
      )
    : entries;

  return (
    <AppShell
      title={`${selectedOem} programs`}
      description={`${oemPrograms.length} carlines · ${entries.length} model years shipping`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setSelectedOem(null)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All OEMs
          </Button>
          <CreateProgramDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> New program
              </Button>
            }
          />
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setSelectedOem(null)} className="hover:text-foreground">
          Programs
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <div className="flex items-center gap-1.5 text-foreground">
          <OemMark oem={selectedOem} size="sm" />
          <span className="font-medium">{selectedOem}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${selectedOem} carlines`}
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEntries.map(({ program: p, year }) => {
          const pct = (p.recoveredToDate / p.totalAmortized) * 100;
          const fpct = (p.forecastRecovery / p.totalAmortized) * 100;
          const volPct = (p.actualVolume / p.contractedVolume) * 100;
          return (
            <div
              key={`${p.id}-${year}`}
              className="card-elevated group overflow-hidden transition-shadow hover:shadow-lg"
            >
              <div className="relative overflow-hidden gradient-navy px-5 pb-2 pt-4">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <OemMark oem={p.oem} size="md" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">
                          {p.oem} · {p.platform}
                        </div>
                        <div className="truncate text-[15px] font-bold leading-tight text-white">
                          <span className="font-mono text-white/70">{year}</span>{" "}
                          {p.name.replace(
                            /^(Ford|Chevrolet|GMC|Cadillac|Ram|Dodge|Jeep|Chrysler|Toyota|Honda|Rivian|Volkswagen|Hyundai|Nissan|Tesla)\s+/i,
                            "",
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                        {p.code}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
                        MY{year}
                      </span>
                    </div>
                  </div>
                  <StatusPill {...statusMeta[p.status]} />
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2 pb-2 text-[10px] text-white/70">
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <div className="uppercase tracking-wide text-white/45">Program</div>
                    <div className="mt-1 font-mono font-semibold text-white/85">{p.code}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                    <div className="uppercase tracking-wide text-white/45">Platform</div>
                    <div className="mt-1 font-semibold text-white/85">{p.platform}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Recovery progress</span>
                    <span className="font-mono font-semibold">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand/25"
                      style={{ width: `${Math.min(100, fpct)}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatMoney(p.recoveredToDate, { compact: true })} recovered</span>
                    <span>of {formatMoney(p.totalAmortized, { compact: true })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/40 p-3 text-center">
                  <div>
                    <div className="font-mono text-sm font-bold">
                      {formatNumber(p.actualVolume)}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">Shipped</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-brand">
                      {formatNumber(p.forecastVolume)}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">Forecast</div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-muted-foreground">
                      {formatNumber(p.contractedVolume)}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">Contract</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Volume attainment · </span>
                    <span
                      className={
                        "font-mono font-semibold " +
                        (volPct >= 100
                          ? "text-success"
                          : volPct >= 80
                            ? "text-foreground"
                            : "text-destructive")
                      }
                    >
                      {volPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {p.partsCount} parts · SOP {p.sop.slice(0, 7)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 border-t pt-3 text-xs">
                  <Link to="/contracts" className="font-medium text-brand hover:underline">
                    Linked recovery agreements
                  </Link>
                  <Link
                    to="/forecasts"
                    search={{ programId: p.id }}
                    className="font-medium text-brand hover:underline"
                  >
                    Calculation and provenance
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
