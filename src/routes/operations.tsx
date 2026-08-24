import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Cable, FileSearch, FileSpreadsheet, Map, Plus, ServerCog, Wrench } from "lucide-react";
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
  { name: "Received", detail: "Original source object and fingerprint recorded." },
  { name: "Staged", detail: "Immutable raw rows retained separately from business records." },
  {
    name: "Validated",
    detail: "Required identifiers, dates, units, currencies, and formats checked.",
  },
  { name: "Mapped", detail: "Approved mapping version produced canonical candidates." },
  { name: "Reviewed", detail: "A named reviewer resolved warnings and confirmed evidence." },
  {
    name: "Approved",
    detail: "A permissioned approval made the candidate immutable except for posting.",
  },
  { name: "Posted", detail: "A unique economic-event key prevents duplicate business posting." },
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

function OperationsPage() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [staged, setStaged] = useState<readonly StagedVehicleVolumeRow[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Readonly<Record<string, ReviewDraft>>>({});
  const [postingCount, setPostingCount] = useState<number | null>(null);
  const [selectedLifecycle, setSelectedLifecycle] = useState<(typeof ingestionLifecycle)[number]>(
    ingestionLifecycle[0],
  );

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

  const beginDocumentReview = async (bytes: Uint8Array) => {
    const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)));
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

  const startSyntheticDocumentReview = () =>
    void beginDocumentReview(new TextEncoder().encode("synthetic local contract review fixture"));

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
      description="Review imports, resolve exceptions, reconcile results, and manage governed operating rules."
      actions={
        <>
          <Button asChild size="sm">
            <Link to="/connections">
              <Plus className="mr-1.5 h-4 w-4" /> Add connection
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/connections">
              <Cable className="mr-1.5 h-4 w-4" /> Manage connections
            </Link>
          </Button>
        </>
      }
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
              <div key={status.name} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLifecycle(status)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Badge variant={selectedLifecycle.name === status.name ? "secondary" : "outline"}>
                    {status.name}
                  </Badge>
                </button>
                {index < ingestionLifecycle.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden="true">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border bg-secondary/30 p-3 text-sm">
            <span className="font-medium">{selectedLifecycle.name}:</span>{" "}
            <span className="text-muted-foreground">{selectedLifecycle.detail}</span>
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
              <FileSearch className="h-4 w-4" /> Document review exceptions
            </CardTitle>
            <CardDescription>
              Resolve evidence and correction issues across contract reviews. New originals begin in
              Contracts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link to="/contracts">Open Contracts for originals</Link>
            </Button>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              The deterministic adapter creates configured empty fields for manual review. It does
              not read content, upload data, or make an external request.
            </div>
            {!extraction && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={startSyntheticDocumentReview}
              >
                Start synthetic document review
              </Button>
            )}
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
              <Cable className="h-4 w-4" /> Data connections
            </CardTitle>
            <CardDescription>
              Enterprise administrators can configure approved files and APIs without editing source
              code.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/connections">
                <Plus className="mr-2 h-4 w-4" /> Add connection
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/connections">
                <Map className="mr-2 h-4 w-4" /> Map fields
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-start py-3">
              <Link to="/connections">
                <Wrench className="mr-2 h-4 w-4" /> Resolve errors
              </Link>
            </Button>
            <div className="rounded-lg border p-3 text-sm sm:col-span-3">
              <div className="font-medium">SAP / ERP live connection is not active</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the guided draft, safe sample validation, and CSV/Excel fallback. Customer
                specifications and runtime credentials are still required for a live test.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4" /> Rules and Policies
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
