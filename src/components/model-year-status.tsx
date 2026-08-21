import { getYearlyStatus, programModelYears, yearBucketMeta, type Program } from "@/lib/demo-data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ModelYearBadges({
  program,
  tone = "dark",
}: {
  program: Program;
  tone?: "dark" | "light";
}) {
  const years = programModelYears[program.id] ?? [];
  if (!years.length) return null;
  const cls =
    tone === "dark"
      ? "border-white/20 bg-white/10 text-white/90"
      : "border-border bg-secondary text-foreground";
  return (
    <div className="flex flex-wrap gap-1">
      {years.map((y) => (
        <span
          key={y}
          className={
            "rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider " +
            cls
          }
        >
          MY{String(y).slice(2)}
        </span>
      ))}
    </div>
  );
}

/**
 * Compact per-year status row: 2022 → 2026.
 * Shows bucket color + short label + delta so all tabs surface the same
 * closed/achieved/over/shipping story per carline.
 */
export function YearlyStatusRow({
  program,
  compact = false,
}: {
  program: Program;
  compact?: boolean;
}) {
  const rows = getYearlyStatus(program);
  return (
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-5 gap-1.5">
        {rows.map((r) => {
          const meta = yearBucketMeta[r.bucket];
          const isInactive = r.bucket === "not-in-production";
          return (
            <Tooltip key={r.year}>
              <TooltipTrigger asChild>
                <div
                  className={
                    "rounded-md border px-1.5 py-1 text-center transition-colors " +
                    meta.className +
                    (isInactive ? " opacity-60" : " hover:brightness-105")
                  }
                >
                  <div className="font-mono text-[10px] font-semibold leading-tight">{r.year}</div>
                  <div
                    className={
                      "leading-tight " + (compact ? "text-[9px]" : "text-[10px] font-medium")
                    }
                  >
                    {meta.short}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-semibold">
                  {r.year} · {meta.label}
                </div>
                {!isInactive && (
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {`$${(r.recovered / 1_000_000).toFixed(1)}M / $${(r.amortizedTarget / 1_000_000).toFixed(1)}M`}
                    {" · "}
                    {r.volumeAttainmentPct}% attained
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
