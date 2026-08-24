import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ClipboardList,
  Download,
  FileSearch,
  GitCompareArrows,
  History,
  Scale,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const reports = [
  {
    icon: Scale,
    title: "Recovery position",
    desc: "Recovery position by OEM, program, model year, and part with calculation version and source references.",
    tag: "Recovery",
  },
  {
    icon: GitCompareArrows,
    title: "Actual versus contract and forecast",
    desc: "Approved contract basis, staged actuals, versioned forecast, variance, and break-even projection.",
    tag: "Forecast",
  },
  {
    icon: Activity,
    title: "Recovery exceptions",
    desc: "Under- and over-recovery exceptions with thresholds, causes, linked agreements, and review state.",
    tag: "Exceptions",
  },
  {
    icon: ClipboardList,
    title: "DCR status and aging",
    desc: "Change-request status, age, assignments, configured evidence gates, and transition history.",
    tag: "DCR",
  },
  {
    icon: FileSearch,
    title: "Ingestion reconciliation",
    desc: "Imported, rejected, mapped, approved, and posted counts with variance and exception evidence.",
    tag: "Operations",
  },
  {
    icon: History,
    title: "Audit and evidence package",
    desc: "Scoped manifest of source hashes, policy and mapping versions, approvals, calculations, and audit events.",
    tag: "Controls",
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
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled
                title="A persisted, permission-scoped dataset is required before this report can be exported"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export unavailable in demo
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
