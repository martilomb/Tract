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
import { Textarea } from "@/components/ui/textarea";
import { DeterministicDevelopmentExtractor, type ExtractionResult } from "@/domain/documents";
import { parseCsv, stageVolumeRows, type StagedVolumeRow } from "@/domain/imports";

export const Route = createFileRoute("/operations")({ component: OperationsPage });

const SAMPLE_CSV = `event_id,date,event_type,units,program,part
SHIP-001,2026-08-01,actual,1250,PROGRAM-A,PART-A
RETURN-001,2026-08-02,return,-12,PROGRAM-A,PART-A
INVALID-001,08/03/2026,forecast,not-a-number,PROGRAM-A,PART-A`;

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
    name: "SAP",
    state: "not connected",
    detail: "Adapter boundary documented; specifications and credentials are required",
  },
] as const;

function OperationsPage() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [staged, setStaged] = useState<readonly StagedVolumeRow[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  const stage = () => {
    try {
      const rows = parseCsv(csv);
      const result = stageVolumeRows(rows, {
        organizationId: "demo-org",
        source: "development-csv",
        columns: {
          externalId: "event_id",
          occurredOn: "date",
          eventType: "event_type",
          units: "units",
          programCode: "program",
          partNumber: "part",
        },
        allowedEventTypes: ["actual", "correction", "return"],
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
    toast.info("Document registered with the deterministic adapter", {
      description: "No file was uploaded and no external model was called.",
    });
  };

  return (
    <AppShell
      title="Operations"
      description="Import, document, connector, and configuration extension points."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" /> Volume import staging
            </CardTitle>
            <CardDescription>
              Preview and reject invalid rows before immutable source events are committed.
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
                        <td className="p-2 font-mono">{row.normalized?.externalId ?? "—"}</td>
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
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
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
                  <div
                    key={field.key}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>{field.key}</span>
                    <Badge variant="outline">manual review required</Badge>
                  </div>
                ))}
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
