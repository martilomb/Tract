import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon?: ReactNode;
  accent?: "brand" | "success" | "warning" | "destructive";
}) {
  const up = (delta ?? 0) >= 0;
  const accentBg = {
    brand: "bg-brand/10 text-brand",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  }[accent ?? "brand"];

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground [overflow-wrap:anywhere]">
            {label}
          </div>
          <div className="mt-2 font-display text-xl font-bold leading-tight tracking-tight text-foreground xl:text-2xl">
            {value}
          </div>
        </div>

        {icon && (
          <div
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentBg)}
          >
            {icon}
          </div>
        )}
      </div>

      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
              up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {up ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
          {deltaLabel && <span className="text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function StatusPill({
  label,
  className,
  dot,
}: {
  label: string;
  className: string;
  dot: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
