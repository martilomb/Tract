import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ClipboardList,
  Download,
  FileSearch,
  GitCompareArrows,
  History,
  Printer,
  Scale,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  HierarchicalProgramSelector,
  type HierarchySelection,
} from "@/components/hierarchical-program-selector";
import { useDataset } from "@/lib/commodity";
import { useAnalysis } from "@/hooks/use-analysis";
import { DEFAULT_ANALYSIS_SCOPE } from "@/domain/analytics";
import { buildCurrentScopeReport, type ReportFamily } from "@/domain/reports";
import { downloadCurrentScopeCsv, downloadCurrentScopeXlsx } from "@/lib/report-download";

const reports = [
  {
    id: "recovery-position",
    icon: Scale,
    title: "Recovery position",
    tag: "Recovery",
    description:
      "Recoverable cost, recovered-to-date, forecast, and variance by the selected hierarchy.",
  },
  {
    id: "actual-contract-forecast",
    icon: GitCompareArrows,
    title: "Actual versus contract and forecast",
    tag: "Forecast",
    description:
      "Month-by-month actual, contract curve, forecast, variance, and remaining recovery.",
  },
  {
    id: "recovery-exceptions",
    icon: Activity,
    title: "Recovery exceptions",
    tag: "Exceptions",
    description: "Material under- and over-recovery records with source references.",
  },
  {
    id: "dcr-status-aging",
    icon: ClipboardList,
    title: "DCR status and aging",
    tag: "DCR",
    description: "A scoped synthetic report manifest; live DCR records require authenticated data.",
  },
  {
    id: "ingestion-reconciliation",
    icon: FileSearch,
    title: "Ingestion reconciliation",
    tag: "Operations",
    description:
      "A scoped synthetic reconciliation manifest; live import runs require authenticated data.",
  },
  {
    id: "audit-evidence",
    icon: History,
    title: "Audit and evidence package",
    tag: "Controls",
    description:
      "Calculation, forecast, source version, and evidence-reference manifest for the current scope.",
  },
] as const;
type ReportId = (typeof reports)[number]["id"];
type ReportSearch = {
  oem?: string;
  programId?: string;
  modelYear?: number;
  partId?: string;
  report?: ReportId;
};

const reportIds = new Set<ReportId>(reports.map((report) => report.id));

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    oem: typeof search.oem === "string" ? search.oem : undefined,
    programId: typeof search.programId === "string" ? search.programId : undefined,
    modelYear:
      Number.isInteger(Number(search.modelYear)) && Number(search.modelYear) >= 1900
        ? Number(search.modelYear)
        : undefined,
    partId: typeof search.partId === "string" ? search.partId : undefined,
    report:
      typeof search.report === "string" && reportIds.has(search.report as ReportId)
        ? (search.report as ReportId)
        : undefined,
  }),
});

function ReportsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { programs, parts } = useDataset();
  const [selection, setSelection] = useState<HierarchySelection>({
    oem: search.oem ?? "all",
    programId: search.programId ?? "all",
    modelYear: search.modelYear === undefined ? "all" : String(search.modelYear),
    partId: search.partId ?? "all",
  });
  const [reportId, setReportId] = useState<ReportId>(search.report ?? "recovery-position");
  const snapshot = useAnalysis({
    ...DEFAULT_ANALYSIS_SCOPE,
    dimension: "part",
    oem: selection.oem,
    programId: selection.programId,
    modelYear: selection.modelYear === "all" ? "all" : Number(selection.modelYear),
    partId: selection.partId ?? "all",
  });
  const report = reports.find((candidate) => candidate.id === reportId)!;
  const reportPackage = useMemo(
    () => buildCurrentScopeReport(reportId as ReportFamily, snapshot),
    [reportId, snapshot],
  );
  const rows = reportPackage.rows;
  const [xlsxGenerating, setXlsxGenerating] = useState(false);
  const updateScope = (next: HierarchySelection) => {
    setSelection(next);
    void navigate({
      search: {
        ...search,
        oem: next.oem === "all" ? undefined : next.oem,
        programId: next.programId === "all" ? undefined : next.programId,
        modelYear: next.modelYear === "all" ? undefined : Number(next.modelYear),
        partId: !next.partId || next.partId === "all" ? undefined : next.partId,
      },
    });
  };
  const selectReport = (next: ReportId) => {
    setReportId(next);
    void navigate({ search: { ...search, report: next } });
  };
  return (
    <AppShell
      title="Reports"
      description="Filter, preview, and generate permission-scoped report packages. Demonstration exports are synthetic and never represent live customer data."
    >
      <section className="card-elevated p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Report scope · OEM → program / model → model year → part number
        </h2>
        <div className="mt-3">
          <HierarchicalProgramSelector
            programs={programs}
            parts={parts}
            showPart
            value={selection}
            onChange={updateScope}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {snapshot.scopeLabel} · As of {new Date(snapshot.provenance.asOf).toLocaleString()} ·{" "}
          {snapshot.provenance.currency} · Calculation {snapshot.provenance.calculationVersion} ·
          Forecast {snapshot.provenance.forecastVersion} · Source{" "}
          {snapshot.provenance.sourceVersion}
        </p>
      </section>
      <section
        className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Report families"
      >
        {reports.map((candidate) => {
          const Icon = candidate.icon;
          const active = candidate.id === reportId;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => selectReport(candidate.id)}
              className={`card-elevated p-5 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active ? "ring-2 ring-brand" : ""}`}
              aria-pressed={active}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {candidate.tag}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{candidate.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{candidate.description}</p>
            </button>
          );
        })}
      </section>
      <section className="mt-6 card-elevated p-5" aria-labelledby="report-preview">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview before generation
            </div>
            <h2 id="report-preview" className="text-lg font-semibold">
              {report.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} current-scope rows. Export includes the filter and provenance metadata
              shown above.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              aria-label={`Print or save ${report.title} as a PDF for the current scope`}
              onClick={() => window.print()}
            >
              <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
            </Button>
            <Button
              aria-label={`Generate ${report.title} CSV for the current scope`}
              onClick={() =>
                downloadCurrentScopeCsv(
                  `tract-${reportId}-${snapshot.provenance.asOf.slice(0, 10)}.csv`,
                  reportPackage,
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> Generate CSV
            </Button>
            <Button
              variant="outline"
              disabled={xlsxGenerating}
              aria-label={`Generate ${report.title} XLSX for the current scope`}
              onClick={() => {
                setXlsxGenerating(true);
                void downloadCurrentScopeXlsx(
                  `tract-${reportId}-${snapshot.provenance.asOf.slice(0, 10)}.xlsx`,
                  reportPackage,
                ).finally(() => setXlsxGenerating(false));
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {xlsxGenerating ? "Generating XLSX…" : "Generate XLSX"}
            </Button>
          </div>
        </div>
        <div className="mt-4 max-h-[32rem] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {Object.keys(rows[0] ?? { "No matching records": "" })
                  .slice(0, 8)
                  .map((header) => (
                    <th key={header} className="px-3 py-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(0, 100).map((row, index) => (
                <tr key={index}>
                  {Object.keys(rows[0] ?? {})
                    .slice(0, 8)
                    .map((header) => (
                      <td key={header} className="px-3 py-2 text-xs">
                        {row[header]}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 100 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Preview is bounded to 100 rows; generated CSV contains all {rows.length} rows.
          </p>
        )}
      </section>
    </AppShell>
  );
}
