import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { formatMoney, getYearlyStatus, yearBucketMeta, type Program } from "@/lib/demo-data";
import { useDataset } from "@/lib/commodity";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  ShieldCheck,
  Send,
  CheckCircle2,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { YearlyStatusRow } from "@/components/model-year-status";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OemMark } from "@/components/oem-badge";

export const Route = createFileRoute("/recoveries")({
  component: RecoveriesPage,
});

interface OverRecoveryReviewRow {
  program: Program;
  amount: number;
  observedThrough: string;
  evidence: string[];
}

function buildReviewCandidates(programs: Program[]): OverRecoveryReviewRow[] {
  return programs
    .filter((p) => p.forecastRecovery > p.totalAmortized)
    .map((p) => {
      const totalOver = p.forecastRecovery - p.totalAmortized;
      return {
        program: p,
        amount: totalOver,
        observedThrough: "Development scenario",
        evidence: [
          "Staged volume-event ledger",
          "Contract evidence placeholder",
          "Recovery calculation manifest",
          "Versioned scenario provenance",
        ],
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function RecoveriesPage() {
  const { programs } = useDataset();
  const rows = programs.map((p) => ({
    name: p.name,
    delta: p.forecastRecovery - p.totalAmortized,
    status: p.status,
  }));
  const over = rows.filter((r) => r.delta > 0);
  const under = rows.filter((r) => r.delta < 0);
  const totalOver = over.reduce((s, r) => s + r.delta, 0);
  const totalUnder = under.reduce((s, r) => s + r.delta, 0);

  const reviewCandidates = useMemo(() => buildReviewCandidates(programs), [programs]);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(reviewCandidates.map((r) => [r.program.id, true])),
  );
  const [memo, setMemo] = useState(
    "Review the selected over-recovery balances, source events, effective rates, and contract evidence. No financial posting, profit release, or clawback action is authorized by this package.",
  );
  const [lastPrepared, setLastPrepared] = useState<string | null>(null);

  const selectedRows = reviewCandidates.filter((r) => selected[r.program.id]);
  const submissionTotal = selectedRows.reduce((s, r) => s + r.amount, 0);

  const handlePrepare = () => {
    if (!selectedRows.length) {
      toast.error("Select at least one program to review.");
      return;
    }
    const id = `REV-${Math.floor(Math.random() * 9000 + 1000)}`;
    setLastPrepared(id);
    toast.info(`Prepared ${formatMoney(submissionTotal, { compact: true })} for review`, {
      description: `Demo package ${id} · ${selectedRows.length} programs · not persisted or submitted`,
    });
  };

  return (
    <AppShell
      title="Recoveries & Claims"
      description="Under-recoveries you can pursue from OEMs. Over-recoveries you must accrue."
      actions={
        <Button size="sm" disabled title="Connect production data to generate claim packs">
          <FileText className="mr-1.5 h-4 w-4" /> Generate claim pack
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Recoverable from OEMs"
          value={formatMoney(Math.abs(totalUnder), { compact: true })}
          delta={14.2}
          deltaLabel="new claims this quarter"
          icon={<TrendingDown className="h-5 w-5" />}
          accent="destructive"
        />
        <StatCard
          label="Over-recovery to accrue"
          value={formatMoney(totalOver, { compact: true })}
          delta={6.8}
          deltaLabel="control review"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Open claim value"
          value={formatMoney(2_140_000, { compact: true })}
          delta={22.4}
          deltaLabel="3 claims filed"
          icon={<DollarSign className="h-5 w-5" />}
          accent="brand"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="card-elevated p-5 lg:col-span-3">
          <h2 className="text-base font-semibold">Forecast vs. contract by program</h2>
          <p className="text-xs text-muted-foreground">
            Positive = over-recovery. Negative = OEM claim opportunity.
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.9 0.01 250)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <ReTooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => formatMoney(Number(value ?? 0))}
                />
                <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
                  {rows.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.delta >= 0 ? "oklch(0.62 0.15 155)" : "oklch(0.6 0.22 27)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elevated p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Under-recovery review queue</h2>
          <p className="text-xs text-muted-foreground">
            Contract evidence and approval are required before any claim submission.
          </p>
          <div className="mt-4 space-y-3">
            {under.map((r, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">Under-recovery projected</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-destructive">
                    {formatMoney(r.delta, { compact: true })}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                    View evidence
                  </Button>
                  <Button size="sm" className="h-7 text-xs" disabled>
                    Draft claim
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Over-recovery review package ---- */}
      <div className="mt-6 card-elevated overflow-hidden">
        <div className="gradient-navy px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <ShieldCheck className="h-3.5 w-3.5" /> Accounting review package
              </div>
              <h2 className="mt-0.5 text-lg font-bold text-white">Review over-recovery balances</h2>
              <p className="mt-0.5 text-xs text-white/70">
                Selected balances are packaged with traceability evidence. No profit release,
                clawback, or financial posting is inferred or triggered.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                Total selected
              </div>
              <div className="font-mono text-2xl font-bold text-white">
                {formatMoney(submissionTotal, { compact: true })}
              </div>
              {lastPrepared && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> Demo package {lastPrepared} prepared
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-8 px-3 py-2"></th>
                    <th className="px-3 py-2 text-left font-medium">Program</th>
                    <th className="px-3 py-2 text-left font-medium">Evidence horizon</th>
                    <th className="px-3 py-2 text-left font-medium">Evidence</th>
                    <th className="px-3 py-2 text-right font-medium">Over-recovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviewCandidates.map((r) => (
                    <tr key={r.program.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-3 align-top">
                        <Checkbox
                          checked={!!selected[r.program.id]}
                          onCheckedChange={(v) =>
                            setSelected((prev) => ({
                              ...prev,
                              [r.program.id]: !!v,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{r.program.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.program.oem} · {r.program.code}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {r.observedThrough}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.evidence.slice(0, 2).map((e) => (
                            <span
                              key={e}
                              className="inline-flex items-center gap-1 rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              {e}
                            </span>
                          ))}
                          {r.evidence.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{r.evidence.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-success">
                        +{formatMoney(r.amount, { compact: true })}
                      </td>
                    </tr>
                  ))}
                  {!reviewCandidates.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        No programs with over-recovery in this commodity.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="review-memo"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Reviewer memo
              </Label>
              <Textarea
                id="review-memo"
                className="mt-1 min-h-32 text-sm"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
              <div className="font-semibold text-foreground">Auto-attached evidence pack</div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>· Immutable volume-event references</li>
                <li>· Effective-dated recovery-rate references</li>
                <li>· Calculation run and input hash</li>
                <li>· Versioned forecast-scenario provenance</li>
              </ul>
            </div>
            <Button className="w-full" onClick={handlePrepare}>
              <Send className="mr-1.5 h-4 w-4" />
              Prepare demo review package
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Recovery by model year across carlines ---- */}
      <div className="mt-6 card-elevated p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">Recovery by model year</h2>
            <p className="text-xs text-muted-foreground">
              Historical demonstration buckets show recovered, under-recovered, and over-recovered
              balances without inferring an accounting disposition.
            </p>
          </div>
          <YearLegend />
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Carline</th>
                <th className="px-3 py-2 text-center font-medium">2022 – 2026</th>
                <th className="px-3 py-2 text-right font-medium">2022 net</th>
                <th className="px-3 py-2 text-right font-medium">2023–24 net</th>
                <th className="px-3 py-2 text-right font-medium">2025–26 progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {programs.map((p) => {
                const ys = getYearlyStatus(p);
                const y22 = ys.find((y) => y.year === 2022);
                const mid = ys
                  .filter((y) => y.year === 2023 || y.year === 2024)
                  .reduce((s, y) => s + y.delta, 0);
                const late = ys.filter((y) => y.year === 2025 || y.year === 2026);
                const lateProgressPct = late.length
                  ? Math.round(
                      (late.reduce((s, y) => s + y.recovered, 0) /
                        Math.max(
                          1,
                          late.reduce((s, y) => s + y.amortizedTarget, 0),
                        )) *
                        100,
                    )
                  : 0;
                return (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <OemMark oem={p.oem} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium leading-tight">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.oem} · {p.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="mx-auto max-w-md">
                        <YearlyStatusRow program={p} compact />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {!y22 || y22.bucket === "not-in-production" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={
                            "font-semibold " +
                            (y22.delta >= 0 ? "text-success" : "text-destructive")
                          }
                        >
                          {y22.delta >= 0 ? "+" : "−"}
                          {formatMoney(Math.abs(y22.delta), { compact: true })}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      <span
                        className={
                          "font-semibold " + (mid >= 0 ? "text-success" : "text-destructive")
                        }
                      >
                        {mid >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(mid), { compact: true })}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.min(100, lateProgressPct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{lateProgressPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function YearLegend() {
  const keys: (keyof typeof yearBucketMeta)[] = [
    "closed-over",
    "closed-claim",
    "achieved",
    "over",
    "shipping",
    "shipping-risk",
  ];
  return (
    <div className="hidden flex-wrap gap-2 md:flex">
      {keys.map((k) => (
        <span
          key={k}
          className={
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium " +
            yearBucketMeta[k].className
          }
        >
          <span className={"h-1.5 w-1.5 rounded-full " + yearBucketMeta[k].dot} />
          {yearBucketMeta[k].label}
        </span>
      ))}
    </div>
  );
}
