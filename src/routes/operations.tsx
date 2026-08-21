import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Cable,
  CheckCircle2,
  FileSearch,
  FileSpreadsheet,
  ServerCog,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveExtraction,
  buildDocumentPostingPlan,
  DeterministicDevelopmentExtractor,
  type ExtractionResult,
} from "@/domain/documents";
import { parseCsv, stageVehicleVolumeRows, type StagedVehicleVolumeRow } from "@/domain/imports";

export const Route = createFileRoute("/operations")({ component: OperationsPage });

const SAMPLE_CSV = `event_id,period_start,period_end,data_kind,units,oem,program,model,plant,region,part
VOL-001,2026-08-01,2026-08-31,actual,1250,OEM-A,PROGRAM-A,MODEL-A,PLANT-A,NA,PART-A
VOL-002,2026-09-01,2026-09-30,forecast,1375,OEM-A,PROGRAM-A,MODEL-A,PLANT-A,NA,PART-A
INVALID-001,08/03/2026,2026-10-31,scenario,not-a-number,OEM-A,PROGRAM-A,MODEL-A,PLANT-A,NA,PART-A`;

const ingestionDomains = [
  {
    name: "Vehicle volume",
    source: "IHS / AFS / staged files",
    authority: "External production actuals, forecasts, revisions, and planning scenarios",
  },
  {
    name: "Contract & DCR documents",
    source: "Approved private documents",
    authority: "Contractual terms only after field evidence and human approval",
  },
  {
    name: "SAP & ERP",
    source: "Customer operational systems",
    authority:
      "Shipments, transactions, and available costs; recoverability is classified separately",
  },
] as const;

const ingestionLifecycle = [
  "Received",
  "Staged",
  "Validated",
  "Mapped",
  "Reviewed",
  "Approved",
  "Posted",
] as const;

const documentFieldLabels: Readonly<Record<string, string>> = {
  contract_number: "Contract number",
  recovery_rate: "Recovery rate",
  effective_date: "Effective date",
};

const documentMappings = {
  contract_number: { entityType: "contract" as const, targetField: "contract_number" },
  recovery_rate: { entityType: "recovery_rate" as const, targetField: "per_unit_rate" },
  effective_date: { entityType: "contract" as const, targetField: "effective_from" },
};

interface ReviewDraft {
  value: string;
  page: string;
  evidence: string;
  reason: string;
}

const adapters = [
  {
    name: "CSV staging",
    state: "implemented",
    detail: "Quoted fields, validation, preview, provenance, and idempotency fingerprint",
  },
  {
    name: "Excel staging",
    state: "implemented",
    detail: "Server-only first-worksheet reader with the same validation pipeline",
  },
  {
    name: "Generic REST",
    state: "contract",
    detail:
      "HTTPS, allowlisted hosts, opaque credential references, retries, and reconciliation required",
  },
  {
    name: "IHS / AFS vehicle volume",
    state: "not connected",
    detail:
      "Common file/API boundary; licensing, samples, documentation, and credentials are required",
  },
  {
    name: "SAP",
    state: "not connected",
    detail: "Adapter boundary documented; specifications and credentials are required",
  },
] as const;

function OperationsPage() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [staged, setStaged] = useState<readonly StagedVehicleVolumeRow[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Readonly<Record<string, ReviewDraft>>>({});
  const [postingCount, setPostingCount] = useState<number | null>(null);

  const stage = () => {
    try {
      const rows = parseCsv(csv);
      const result = stageVehicleVolumeRows(rows, {
        organizationId: "demo-org",
        source: "development-vehicle-volume-csv",
        columns: {
          externalId: "event_id",
          periodStart: "period_start",
          periodEnd: "period_end",
          dataKind: "data_kind",
          units: "units",
          oemCode: "oem",
          programCode: "program",
          vehicleModelCode: "model",
          plantCode: "plant",
          regionCode: "region",
          partNumber: "part",
        },
        allowedDataKinds: ["actual", "forecast", "revised", "scenario"],
      });
      setStaged(result);
      toast.info("CSV staged locally", {
        description: `${result.filter((row) => row.valid).length} valid · ${result.filter((row) => !row.valid).length} rejected · nothing committed`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV staging failed");
    }
  };

  const inspectDocument = async (file: File | undefined) => {
    if (!file) return;
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Choose a PDF, PNG, or JPEG document.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("The development document limit is 25 MiB.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const sha256 = [...hashBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const adapter = new DeterministicDevelopmentExtractor();
    const result = await adapter.extract({
      documentSha256: sha256,
      documentType: "contract",
      bytes,
      configuredFields: ["contract_number", "recovery_rate", "effective_date"],
    });
    setExtraction(result);
    setReviewDrafts(
      Object.fromEntries(
        result.fields.map((field) => [
          field.key,
          { value: field.value, page: "", evidence: "", reason: "" },
        ]),
      ),
    );
    setPostingCount(null);
    toast.info("Document registered with the deterministic adapter", {
      description: "No file was uploaded and no external model was called.",
    });
  };

  const updateReviewDraft = (fieldKey: string, change: Partial<ReviewDraft>) => {
    setReviewDrafts((current) => ({
      ...current,
      [fieldKey]: {
        ...(current[fieldKey] ?? { value: "", page: "", evidence: "", reason: "" }),
        ...change,
      },
    }));
    setPostingCount(null);
  };

  const loadReviewExample = () => {
    if (!extraction) return;
    const examples: Readonly<Record<string, { value: string; evidence: string }>> = {
      contract_number: { value: "CTR-2026-001", evidence: "Contract no. CTR-2026-001" },
      recovery_rate: { value: "0.125", evidence: "Recovery rate: 0.125 per eligible unit" },
      effective_date: { value: "2026-08-01", evidence: "Effective from 1 August 2026" },
    };
    setReviewDrafts(
      Object.fromEntries(
        extraction.fields.map((field) => [
          field.key,
          {
            value: examples[field.key]?.value ?? "Reviewed value",
            page: "1",
            evidence: examples[field.key]?.evidence ?? "Reviewed source excerpt",
            reason: "Deterministic local review example",
          },
        ]),
      ),
    );
    setPostingCount(null);
    toast.info("Synthetic review example loaded", {
      description: "Values are local test data and are not extracted from the selected file.",
    });
  };

  const approveReview = () => {
    if (!extraction) return;
    try {
      const corrections = Object.fromEntries(
        extraction.fields.map((field) => [field.key, reviewDrafts[field.key]?.value ?? ""]),
      );
      const correctionEvidence = Object.fromEntries(
        extraction.fields.map((field) => {
          const draft = reviewDrafts[field.key];
          return [
            field.key,
            {
              page: Number(draft?.page),
              text: draft?.evidence ?? "",
              reason: draft?.reason ?? "",
            },
          ];
        }),
      );
      const approval = approveExtraction({
        result: extraction,
        corrections,
        correctionEvidence,
        requiredFields: extraction.fields.map((field) => field.key),
        reviewerId: "development-reviewer",
        reviewedAt: new Date().toISOString(),
      });
      const postingPlan = buildDocumentPostingPlan({ approval, mappings: documentMappings });
      setPostingCount(postingPlan.length);
      toast.success("Local review approved", {
        description: `${postingPlan.length} controlled posting actions planned; nothing committed.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Document review failed");
    }
  };

  return (
    <AppShell
      title="Operations"
      description="Import, document, connector, and configuration extension points."
    >
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">Confirmed ingestion source boundaries</CardTitle>
          <CardDescription>
            Raw source records remain immutable and separate until mapped candidates complete the
            shared approval lifecycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-3">
            {ingestionDomains.map((domain) => (
              <div key={domain.name} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{domain.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{domain.source}</div>
                <p className="mt-2 text-xs">{domain.authority}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Ingestion lifecycle">
            {ingestionLifecycle.map((status, index) => (
              <div key={status} className="flex items-center gap-2">
                <Badge variant={status === "Posted" ? "secondary" : "outline"}>{status}</Badge>
                {index < ingestionLifecycle.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" /> Volume import staging
            </CardTitle>
            <CardDescription>
              Stage external vehicle-production values without treating them as recovered part
              volume.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              className="min-h-44 font-mono text-xs"
              aria-label="CSV import contents"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Development preview only; no database write.
              </p>
              <Button size="sm" onClick={stage}>
                Stage and validate
              </Button>
            </div>
            {staged.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[520px] text-xs">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">State</th>
                      <th className="p-2 text-left">External id</th>
                      <th className="p-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {staged.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="p-2 font-mono">{row.rowNumber}</td>
                        <td className="p-2">
                          {row.valid ? (
                            <Badge variant="secondary">valid</Badge>
                          ) : (
                            <Badge variant="destructive">rejected</Badge>
                          )}
                        </td>
                        <td className="p-2 font-mono">{row.sourceExternalId || "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          {row.errors.join("; ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4" /> Document extraction review
            </CardTitle>
            <CardDescription>
              Private-storage lifecycle and provider interface without a paid runtime extraction
              service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="document-review-file">Document for local review</Label>
            <Input
              id="document-review-file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="mt-2"
              onChange={(event) => void inspectDocument(event.target.files?.[0])}
            />
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              The deterministic adapter creates configured empty fields for manual review. It does
              not read content, upload data, or make an external request.
            </div>
            {extraction && (
              <div className="mt-4 space-y-3">
                <div className="break-all font-mono text-[10px] text-muted-foreground">
                  SHA-256 {extraction.documentSha256}
                </div>
                {extraction.fields.map((field) => (
                  <fieldset key={field.key} className="space-y-3 rounded-lg border p-3">
                    <legend className="px-1 text-sm font-medium">
                      {documentFieldLabels[field.key] ?? field.key}
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px]">
                      <div>
                        <Label htmlFor={`${field.key}-value`}>Reviewed value</Label>
                        <Input
                          id={`${field.key}-value`}
                          className="mt-1"
                          value={reviewDrafts[field.key]?.value ?? ""}
                          onChange={(event) =>
                            updateReviewDraft(field.key, { value: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${field.key}-page`}>Page</Label>
                        <Input
                          id={`${field.key}-page`}
                          className="mt-1"
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={reviewDrafts[field.key]?.page ?? ""}
                          onChange={(event) =>
                            updateReviewDraft(field.key, { page: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`${field.key}-evidence`}>Source evidence excerpt</Label>
                      <Textarea
                        id={`${field.key}-evidence`}
                        className="mt-1 min-h-16 text-xs"
                        value={reviewDrafts[field.key]?.evidence ?? ""}
                        onChange={(event) =>
                          updateReviewDraft(field.key, { evidence: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${field.key}-reason`}>Correction reason</Label>
                      <Input
                        id={`${field.key}-reason`}
                        className="mt-1"
                        value={reviewDrafts[field.key]?.reason ?? ""}
                        onChange={(event) =>
                          updateReviewDraft(field.key, { reason: event.target.value })
                        }
                      />
                    </div>
                  </fieldset>
                ))}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={loadReviewExample}>
                    Load synthetic review example
                  </Button>
                  <Button size="sm" onClick={approveReview}>
                    Approve local review
                  </Button>
                </div>
                {postingCount !== null && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    Review approved and {postingCount} posting actions planned locally. No canonical
                    record was written.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cable className="h-4 w-4" /> Connector registry
            </CardTitle>
            <CardDescription>
              Declarative mappings only; customer-supplied executable code is never accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y rounded-lg border p-0">
            {adapters.map((adapter) => (
              <div key={adapter.name} className="flex items-start gap-3 p-4">
                {adapter.state === "implemented" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{adapter.name}</span>
                    <Badge variant="outline">{adapter.state}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{adapter.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4" /> Versioned configuration
            </CardTitle>
            <CardDescription>
              Changes require permission, effective date, version increment, and audit history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "Recovery policy",
              "DCR workflow",
              "Notification rules",
              "Document mapping",
              "Import mapping",
              "Retention policy",
            ].map((name) => (
              <div key={name} className="flex items-center justify-between rounded-lg border p-3">
                <span>{name}</span>
                <Badge variant="secondary">versioned</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
