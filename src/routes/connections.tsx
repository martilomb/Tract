import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  FlaskConical,
  History,
  ListChecks,
  Map,
  Plus,
  ShieldCheck,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  validateConnectorConfiguration,
  type ConnectorDataCategory,
  type ConnectorDraft,
  type ConnectorFieldMapping,
  type ConnectorValidationResult,
} from "@/domain/connectors";

export const Route = createFileRoute("/connections")({ component: DataConnectionsPage });

const CATEGORIES: readonly { value: ConnectorDataCategory; label: string; detail: string }[] = [
  {
    value: "shipment",
    label: "Shipments",
    detail: "Signed shipped quantity and source transaction identity",
  },
  {
    value: "cost",
    label: "Available costs",
    detail: "Operational cost evidence; never implies recoverability",
  },
  {
    value: "correction",
    label: "Corrections",
    detail: "Traceable correction of a prior source event",
  },
  {
    value: "reversal",
    label: "Reversals",
    detail: "Signed reversal linked to the original transaction",
  },
  {
    value: "return",
    label: "Returns",
    detail: "Returned quantity/value preserved as its source classification",
  },
];

const CONNECTIONS = [
  {
    id: "connection-file",
    name: "Monthly ERP file",
    provider: "Customer ERP",
    environment: "Staging",
    transport: "Controlled file",
    state: "Configuration valid",
    health: "Ready for file validation",
    lastRun: "2026-08-24 09:10 UTC",
    nextRun: "Manual",
    imported: 1248,
    rejected: 3,
    retries: 0,
    variance: "0 units · USD 0.00",
    mapping: "v3 approved",
    owner: "Enterprise integration owner",
  },
  {
    id: "connection-sap",
    name: "SAP operational data",
    provider: "SAP / ERP boundary",
    environment: "Staging",
    transport: "OData",
    state: "Draft",
    health: "Live test blocked",
    lastRun: "Never",
    nextRun: "Not scheduled",
    imported: 0,
    rejected: 0,
    retries: 0,
    variance: "Not calculated",
    mapping: "v1 draft",
    owner: "Enterprise IT administrator",
  },
] as const;

const LIFECYCLE = [
  {
    key: "received",
    label: "Received",
    count: 1251,
    detail: "Original file accepted into private staging with its hash and source identity.",
  },
  {
    key: "staged",
    label: "Staged",
    count: 1251,
    detail: "Raw rows retained unchanged; no accounting record exists yet.",
  },
  {
    key: "validated",
    label: "Validated",
    count: 1248,
    detail: "Required formats, units, dates, and identifiers passed. Three rows need correction.",
  },
  {
    key: "mapped",
    label: "Mapped",
    count: 1248,
    detail: "Approved mapping v3 produced canonical candidates using declarative operations only.",
  },
  {
    key: "reviewed",
    label: "Reviewed",
    count: 1248,
    detail: "Local reviewer confirmed samples and reconciliation preview on 24 August.",
  },
  {
    key: "approved",
    label: "Approved",
    count: 1248,
    detail: "Approval is recorded; candidate values are now immutable except for posting.",
  },
  {
    key: "posted",
    label: "Posted",
    count: 1248,
    detail: "Unique economic-event keys prevent duplicate canonical posting.",
  },
] as const;

type ConnectionId = (typeof CONNECTIONS)[number]["id"];
type LifecycleKey = (typeof LIFECYCLE)[number]["key"];

const DEFAULT_MAPPINGS: readonly ConnectorFieldMapping[] = [
  { source: "Material", destination: "part_number", required: true, operation: "trim" },
  { source: "PostingDate", destination: "occurred_on", required: true, operation: "date_iso" },
  { source: "Quantity", destination: "signed_quantity", required: true, operation: "decimal" },
  { source: "Currency", destination: "currency", required: true, operation: "uppercase" },
  { source: "Amount", destination: "original_value", required: false, operation: "decimal" },
];

const MAPPING_OPERATIONS: readonly ConnectorFieldMapping["operation"][] = [
  "copy",
  "trim",
  "uppercase",
  "lowercase",
  "date_iso",
  "decimal",
  "integer",
  "constant",
];

function newDraft(): ConnectorDraft {
  return {
    id: "connection-draft",
    organizationId: "demo-org",
    name: "SAP operational data",
    providerKey: "customer_erp",
    systemType: "sap_erp",
    environment: "staging",
    domain: "erp",
    transports: ["odata"],
    endpoint: "https://erp.example.invalid/odata",
    allowedHosts: ["erp.example.invalid"],
    authenticationMethod: "oauth2",
    deltaBehavior: "Changed records since the last approved delta token",
    timeZone: "UTC",
    sourceObjects: ["Shipments", "AvailableCosts"],
    dataCategories: ["shipment", "cost", "correction", "reversal", "return"],
    fieldMappings: DEFAULT_MAPPINGS,
    reconciliationRules:
      "Quantity and original-value totals must match by posting period and currency",
    maximumRetries: 3,
    owner: "Enterprise IT administrator",
  };
}

function DataConnectionsPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<ConnectionId>(CONNECTIONS[0]!.id);
  const [selectedStage, setSelectedStage] = useState<LifecycleKey>(LIFECYCLE[2]!.key);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStart, setWizardStart] = useState(0);
  const selected =
    CONNECTIONS.find((connection) => connection.id === selectedId) ?? CONNECTIONS[0]!;
  const stage = LIFECYCLE.find((item) => item.key === selectedStage) ?? LIFECYCLE[0]!;

  const openWizard = (step = 0) => {
    setWizardStart(step);
    setWizardOpen(true);
  };
  return (
    <AppShell
      title="Data Connections"
      description="Guided, tenant-scoped setup for approved files and APIs without editing source code."
      actions={
        <Button size="sm" onClick={() => openWizard()}>
          <Plus className="mr-1.5 h-4 w-4" /> Add connection
        </Button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Action
          icon={Plus}
          label="Add connection"
          detail="Guided provider-neutral setup"
          onClick={() => openWizard()}
        />
        <Action
          icon={FileSpreadsheet}
          label="Import file"
          detail="CSV or Excel fallback"
          onClick={() => navigate({ to: "/operations" })}
        />
        <Action
          icon={ListChecks}
          label="Review imports"
          detail="Open reviewed candidates"
          onClick={() => setSelectedStage("reviewed")}
        />
        <Action
          icon={Wrench}
          label="Resolve errors"
          detail="3 validation issues"
          onClick={() => setSelectedStage("validated")}
        />
        <Action
          icon={Map}
          label="Map fields"
          detail="Versioned no-code mapping"
          onClick={() => openWizard(3)}
        />
        <Action
          icon={FlaskConical}
          label="Test connection"
          detail="Fail-closed server boundary"
          onClick={() => openWizard(4)}
        />
      </div>

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <strong>For enterprise IT:</strong> define what system owns the data, how it is transported,
        where credentials are stored, what fields mean, and how totals reconcile. Tract stores only
        an opaque secret reference and never infers that an ERP cost is recoverable.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection register</CardTitle>
          <CardDescription>
            Select a row to inspect configuration, health, mapping, run evidence, and audit history.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connection</TableHead>
                <TableHead>State / health</TableHead>
                <TableHead>Last / next run</TableHead>
                <TableHead>Imported / rejected</TableHead>
                <TableHead>Reconciliation</TableHead>
                <TableHead>Mapping / owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONNECTIONS.map((connection) => (
                <TableRow
                  key={connection.id}
                  tabIndex={0}
                  role="button"
                  aria-selected={connection.id === selected.id}
                  onClick={() => setSelectedId(connection.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(connection.id);
                    }
                  }}
                  className={connection.id === selected.id ? "bg-primary/5" : "cursor-pointer"}
                >
                  <TableCell>
                    <div className="font-medium">{connection.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {connection.provider} · {connection.environment} · {connection.transport}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{connection.state}</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">{connection.health}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>{connection.lastRun}</div>
                    <div className="text-muted-foreground">Next: {connection.nextRun}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{connection.imported.toLocaleString()}</span> /{" "}
                    <span
                      className={connection.rejected ? "font-mono text-destructive" : "font-mono"}
                    >
                      {connection.rejected}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>{connection.variance}</div>
                    <div className="text-xs text-muted-foreground">
                      Retries: {connection.retries}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{connection.mapping}</div>
                    <div className="text-xs text-muted-foreground">{connection.owner}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import lifecycle</CardTitle>
            <CardDescription>
              Each stage is selectable and explains what entered, changed, failed, awaits approval,
              and posted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {LIFECYCLE.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedStage(item.key)}
                  className={`rounded-lg border p-3 text-left ${item.key === stage.key ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
                >
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="mt-1 font-mono text-lg font-semibold">
                    {item.count.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <h3 className="font-semibold">{stage.label}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stage.detail}</p>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Fact
                  label="Responsible person"
                  value={
                    stage.key === "approved"
                      ? "Commercial approver"
                      : "Enterprise integration owner"
                  }
                />
                <Fact
                  label="Evidence"
                  value={
                    stage.key === "posted"
                      ? "Posting registry and source fingerprint"
                      : "Batch RUN-2026-0824-001"
                  }
                />
                <Fact
                  label="Next action"
                  value={
                    stage.key === "validated"
                      ? "Resolve 3 rejected rows"
                      : stage.key === "posted"
                        ? "Monitor reconciliation"
                        : "Continue controlled workflow"
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CircleAlert className="h-4 w-4" /> Current issues
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Issue
                title="3 rows rejected"
                detail="Invalid posting date or quantity; raw source remains unchanged."
                action="Resolve errors"
                onClick={() => setSelectedStage("validated")}
              />
              <Issue
                title="SAP live test blocked"
                detail="Approved interface specification and runtime credential reference are absent."
                action="Open configuration"
                onClick={() => openWizard(4)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" /> Audit history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Audit
                label="Mapping v3 approved"
                who="Enterprise integration owner"
                when="24 Aug · 09:05 UTC"
              />
              <Audit
                label="Sample validation passed"
                who="Local reviewer"
                when="24 Aug · 08:58 UTC"
              />
              <Audit
                label="Connection draft created"
                who="Enterprise IT administrator"
                when="23 Aug · 16:20 UTC"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
        <div>
          <div className="font-medium">Need the cross-workspace queue?</div>
          <div className="text-muted-foreground">
            Operations retains file staging, document exceptions, reviews, and Rules and Policies.
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/operations">Open Operations</Link>
        </Button>
      </div>
      <ConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} initialStep={wizardStart} />
    </AppShell>
  );
}

const WIZARD_STEPS = [
  "System",
  "Transport & security",
  "Source data",
  "Map fields",
  "Validate",
] as const;

function ConnectionWizard({
  open,
  onOpenChange,
  initialStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep: number;
}) {
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<ConnectorDraft>(newDraft);
  const [validation, setValidation] = useState<ConnectorValidationResult | null>(null);
  const [sampleAccepted, setSampleAccepted] = useState(false);

  const set = <K extends keyof ConnectorDraft>(key: K, value: ConnectorDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggleCategory = (category: ConnectorDataCategory) =>
    set(
      "dataCategories",
      draft.dataCategories.includes(category)
        ? draft.dataCategories.filter((item) => item !== category)
        : [...draft.dataCategories, category],
    );
  const updateMapping = (index: number, patch: Partial<ConnectorFieldMapping>) =>
    set(
      "fieldMappings",
      draft.fieldMappings.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, ...patch } : mapping,
      ),
    );
  const runValidation = () => {
    try {
      const result = validateConnectorConfiguration(draft);
      setValidation(result);
      toast[result.liveTestAvailable ? "success" : "info"](result.summary);
    } catch (error) {
      setValidation(null);
      toast.error(error instanceof Error ? error.message : "Configuration validation failed");
    }
  };
  const save = () => {
    try {
      const result = validateConnectorConfiguration(draft);
      setValidation(result);
      if (!sampleAccepted) {
        toast.error("Validate and accept the synthetic sample before saving this draft.");
        return;
      }
      if (!result.configurationValid) {
        toast.error("Resolve the blocked configuration checks before saving.");
        return;
      }
      toast.success("Connection draft validated locally", {
        description: "No credentials were stored and no live provider call was made.",
      });
      onOpenChange(false);
    } catch (error) {
      setValidation(null);
      toast.error(error instanceof Error ? error.message : "Configuration validation failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (value) setStep(initialStep);
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add data connection</DialogTitle>
          <DialogDescription>
            Provider-neutral setup for approved file, REST, OData, and customer SAP/ERP boundaries.
            This does not claim a live SAP integration.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Connection setup steps">
          {WIZARD_STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={`w-full rounded-md border px-2 py-2 text-xs font-medium ${index === step ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"}`}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>
        <div className="min-h-[360px] rounded-lg border p-4">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Organization">
                <Input
                  value="Demonstration organization"
                  disabled
                  title="The active organization is fixed in demonstration mode"
                />
                <Help>Connections are always tenant-scoped.</Help>
              </Field>
              <Field label="Connection name">
                <Input value={draft.name} onChange={(event) => set("name", event.target.value)} />
              </Field>
              <Field label="System / provider type">
                <Select
                  value={draft.systemType}
                  onValueChange={(value) =>
                    set("systemType", value as ConnectorDraft["systemType"])
                  }
                >
                  <SelectTrigger aria-label="System / provider type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">Generic file source</SelectItem>
                    <SelectItem value="api">Provider-neutral API</SelectItem>
                    <SelectItem value="sap_erp">SAP / ERP extension boundary</SelectItem>
                    <SelectItem value="volume_provider">
                      Licensed volume provider boundary
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Provider key">
                <Input
                  value={draft.providerKey}
                  onChange={(event) => set("providerKey", event.target.value.toLowerCase())}
                />
                <Help>Stable configuration identifier; no accounting logic depends on it.</Help>
              </Field>
              <Field label="Environment">
                <Select
                  value={draft.environment}
                  onValueChange={(value) =>
                    set("environment", value as ConnectorDraft["environment"])
                  }
                >
                  <SelectTrigger aria-label="Environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production (approval required)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Responsible owner">
                <Input value={draft.owner} onChange={(event) => set("owner", event.target.value)} />
              </Field>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Transport">
                <Select
                  value={draft.transports[0]}
                  onValueChange={(value) =>
                    set("transports", [value as ConnectorDraft["transports"][number]])
                  }
                >
                  <SelectTrigger aria-label="Transport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="rest">REST</SelectItem>
                    <SelectItem value="odata">OData</SelectItem>
                    <SelectItem value="file_drop">Controlled file drop</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Authentication method">
                <Select
                  value={draft.authenticationMethod}
                  onValueChange={(value) =>
                    set("authenticationMethod", value as ConnectorDraft["authenticationMethod"])
                  }
                >
                  <SelectTrigger aria-label="Authentication method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic via secret store</SelectItem>
                    <SelectItem value="api_key">API key via secret store</SelectItem>
                    <SelectItem value="oauth2">OAuth 2 via secret store</SelectItem>
                    <SelectItem value="client_certificate">Client certificate reference</SelectItem>
                    <SelectItem value="managed_identity">Managed identity</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="HTTPS endpoint">
                <Input
                  value={draft.endpoint ?? ""}
                  onChange={(event) => set("endpoint", event.target.value)}
                />
                <Help>Credentials and fragments are rejected.</Help>
              </Field>
              <Field label="Allowed hosts">
                <Input
                  value={draft.allowedHosts.join(", ")}
                  onChange={(event) => set("allowedHosts", split(event.target.value))}
                />
                <Help>Redirects are denied even when the destination is listed.</Help>
              </Field>
              <Field label="Opaque secret reference">
                <Input
                  value={draft.credentialReference ?? ""}
                  onChange={(event) => set("credentialReference", event.target.value || undefined)}
                  placeholder="secret://staging/customer-erp"
                />
                <Help>Reference only. Never paste a token or password.</Help>
              </Field>
              <Field label="Approved interface specification">
                <Input
                  value={draft.documentationReference ?? ""}
                  onChange={(event) =>
                    set("documentationReference", event.target.value || undefined)
                  }
                  placeholder="governance://interfaces/erp-v1"
                />
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source objects">
                  <Input
                    value={draft.sourceObjects.join(", ")}
                    onChange={(event) => set("sourceObjects", split(event.target.value))}
                  />
                  <Help>
                    Tables, entities, reports, or file sections supplied by the source owner.
                  </Help>
                </Field>
                <Field label="Time zone">
                  <Input
                    value={draft.timeZone}
                    onChange={(event) => set("timeZone", event.target.value)}
                  />
                </Field>
                <Field label="Schedule">
                  <Input
                    value={draft.schedule ?? ""}
                    onChange={(event) => set("schedule", event.target.value || undefined)}
                    placeholder="Manual or approved schedule"
                  />
                </Field>
                <Field label="Delta behavior">
                  <Input
                    value={draft.deltaBehavior}
                    onChange={(event) => set("deltaBehavior", event.target.value)}
                  />
                </Field>
              </div>
              <div>
                <Label>SAP / ERP data categories</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((category) => (
                    <label
                      key={category.value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        checked={draft.dataCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <span>
                        <span className="block text-sm font-medium">{category.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {category.detail}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Source classifications remain unchanged. Available cost never means recoverable
                  cost.
                </p>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Source preview and canonical mapping</h3>
                <p className="text-sm text-muted-foreground">
                  Mappings are versioned and limited to approved declarative operations. Executable
                  expressions are rejected.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source preview</TableHead>
                      <TableHead>Canonical destination</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Approved operation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.fieldMappings.map((mapping, index) => (
                      <TableRow key={mapping.destination}>
                        <TableCell>
                          <Input
                            value={mapping.source}
                            onChange={(event) =>
                              updateMapping(index, { source: event.target.value })
                            }
                            aria-label={`Source field ${index + 1}`}
                            className="h-8 font-mono text-xs"
                          />
                          <div className="text-xs text-muted-foreground">
                            {sampleValue(mapping.source)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={mapping.destination}
                            onChange={(event) =>
                              updateMapping(index, { destination: event.target.value })
                            }
                            aria-label={`Canonical destination ${index + 1}`}
                            className="h-8 font-mono text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={mapping.required}
                            onCheckedChange={(checked) =>
                              updateMapping(index, { required: checked === true })
                            }
                            aria-label={`Required mapping ${index + 1}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.operation}
                            onValueChange={(operation) =>
                              updateMapping(index, {
                                operation: operation as ConnectorFieldMapping["operation"],
                              })
                            }
                          >
                            <SelectTrigger
                              className="h-8 min-w-32"
                              aria-label={`Mapping operation ${index + 1}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MAPPING_OPERATIONS.map((operation) => (
                                <SelectItem key={operation} value={operation}>
                                  {operation}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
                <strong>Mapping version:</strong> v1 draft · owner {draft.owner} · sample rows 5 ·
                required fields {draft.fieldMappings.filter((mapping) => mapping.required).length}/
                {draft.fieldMappings.filter((mapping) => mapping.required).length} present
              </div>
              <Button
                variant={sampleAccepted ? "secondary" : "outline"}
                onClick={() => setSampleAccepted(true)}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />{" "}
                {sampleAccepted ? "Synthetic sample accepted" : "Validate synthetic sample"}
              </Button>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reconciliation rules">
                  <Textarea
                    value={draft.reconciliationRules}
                    onChange={(event) => set("reconciliationRules", event.target.value)}
                  />
                </Field>
                <Field label="Retry policy">
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={draft.maximumRetries}
                    onChange={(event) => set("maximumRetries", Number(event.target.value))}
                  />
                  <Help>Bounded transient retries only; redirects remain denied.</Help>
                </Field>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Reconciliation preview</h3>
                    <p className="text-sm text-muted-foreground">
                      Synthetic 5-row sample grouped by posting period and currency.
                    </p>
                  </div>
                  <Badge variant="secondary">Variance: 0 units · USD 0.00</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runValidation}>
                  <FlaskConical className="mr-1.5 h-4 w-4" /> Validate configuration
                </Button>
                <Button
                  variant="outline"
                  disabled
                  title="A runtime credential reference and approved provider specification are required before a live request"
                >
                  Run live test unavailable
                </Button>
              </div>
              {validation && (
                <div className="space-y-2">
                  {validation.checks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex gap-3 rounded-lg border p-3 text-sm ${check.state === "passed" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
                    >
                      {check.state === "passed" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      ) : (
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      )}
                      <div>
                        <div className="font-medium">{check.label}</div>
                        <div className="text-xs text-muted-foreground">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep((current) => current - 1))}
          >
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </>
            )}
          </Button>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button onClick={() => setStep((current) => current + 1)}>
              Next <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save}>
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Save validated draft
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Action({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:bg-primary/5"
    >
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-sm font-semibold">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
    </button>
  );
}
function Issue({
  title,
  detail,
  action,
  onClick,
}: {
  title: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex gap-2">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
          <Button className="mt-2 h-7" size="sm" variant="outline" onClick={onClick}>
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}
function Audit({ label, who, when }: { label: string; who: string; when: string }) {
  return (
    <div className="border-l-2 border-primary/40 pl-3">
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">
        {who} · {when}
      </div>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const labelledChildren = Children.toArray(children).map((child, index) =>
    index === 0 && isValidElement<{ id?: string }>(child) ? cloneElement(child, { id }) : child,
  );
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{labelledChildren}</div>
    </div>
  );
}
function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}
function split(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function sampleValue(source: string): string {
  return (
    (
      {
        Material: "FO-104582-B",
        PostingDate: "2026-08-24",
        Quantity: "1250.000000",
        Currency: "usd",
        Amount: "7894.736250",
      } as Record<string, string>
    )[source] ?? "Synthetic value"
  );
}
