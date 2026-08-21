import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { FileText, Download, ShieldCheck, TrendingUp, BarChart3, Calendar } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const reports = [
  {
    icon: ShieldCheck,
    title: "Control Evidence Report",
    desc: "Quarterly accrual reconciliation with policy, input, calculation, and approval evidence.",
    tag: "Controls",
  },
  {
    icon: TrendingUp,
    title: "OEM Claim Pack",
    desc: "Evidence bundle for under-recovery review — contracts, volume events, and calculation manifest.",
    tag: "Sales",
  },
  {
    icon: BarChart3,
    title: "Program Profitability",
    desc: "Piece-price + amortization recovery by program and platform.",
    tag: "Finance",
  },
  {
    icon: Calendar,
    title: "Monthly Executive Summary",
    desc: "Board-ready one-pager: recoveries, exposure, forecast changes.",
    tag: "Executive",
  },
  {
    icon: FileText,
    title: "Part-level Amortization Ledger",
    desc: "Full audit trail per part number across the program lifecycle.",
    tag: "Audit",
  },
  {
    icon: TrendingUp,
    title: "Forecast Scenario Variance",
    desc: "Approved forecast versions compared with actual volume events and source provenance.",
    tag: "Analytics",
  },
];

function ReportsPage() {
  return (
    <AppShell
      title="Reports"
      description="Versioned report templates backed by scoped data and reproducible evidence manifests."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <div key={r.title} className="card-elevated group p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <r.icon className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {r.tag}
              </span>
            </div>
            <h3 className="mt-4 text-base font-semibold">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
            <div className="mt-4">
              <Button size="sm" variant="outline" className="h-8" disabled>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Data connection required
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
