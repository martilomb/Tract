import { createFileRoute, Link } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  History,
  Link2,
  Search,
  ShieldCheck,
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
  submitAgreementForReview,
  approveRecoveryAgreement,
  activateRecoveryAgreement,
  validateRecoveryAgreement,
  type EligibleVolumeBasis,
  type RecoveryAgreement,
} from "@/domain/contracts";
import { parts as demoParts, programs as demoPrograms, programModelYears } from "@/lib/demo-data";

type ContractSearch = {
  q?: string;
  status?: string;
  supplier?: string;
  oem?: string;
  program?: string;
  modelYear?: string;
  part?: string;
  dcr?: string;
  effective?: string;
  selected?: string;
};

export const Route = createFileRoute("/contracts")({
  component: ContractsPage,
  validateSearch: (search: Record<string, unknown>): ContractSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    supplier: typeof search.supplier === "string" ? search.supplier : undefined,
    oem: typeof search.oem === "string" ? search.oem : undefined,
    program: typeof search.program === "string" ? search.program : undefined,
    modelYear: typeof search.modelYear === "string" ? search.modelYear : undefined,
    part: typeof search.part === "string" ? search.part : undefined,
    dcr: typeof search.dcr === "string" ? search.dcr : undefined,
    effective: typeof search.effective === "string" ? search.effective : undefined,
    selected: typeof search.selected === "string" ? search.selected : undefined,
  }),
});

const AGREEMENTS: readonly RecoveryAgreement[] = [
  {
    id: "agreement-001",
    organizationId: "demo-org",
    agreementNumber: "AGR-2026-001",
    title: "Cooling plate engineering recovery",
    supplierId: "Demo Supplier A",
    status: "active",
    settlementCurrency: "USD",
    recoverableCost: "2400000.00",
    eligibleVolumeBasis: "part_shipments",
    effectiveFrom: "2026-08-01",
    effectiveTo: "2030-12-31",
    expiresOn: "2031-03-31",
    ownerId: "Commercial recovery owner",
    documentVersionIds: ["Contract-original-v2.pdf"],
    programIds: ["p-001"],
    modelYearIds: ["2027", "2028", "2029"],
    partIds: ["pt-0001"],
    dcrIds: ["DCR-2026-0148"],
    ratePeriods: [
      {
        effectiveFrom: "2026-08-01",
        effectiveTo: "2027-07-31",
        perUnitRate: "6.315789",
        currency: "USD",
      },
      { effectiveFrom: "2027-08-01", perUnitRate: "5.950000", currency: "USD" },
    ],
    approvedBy: "Commercial approver",
    approvedAt: "2026-08-22T15:30:00Z",
    approvalDecisionId: "approval-commercial-001",
  },
  {
    id: "agreement-002",
    organizationId: "demo-org",
    agreementNumber: "AGR-2026-002",
    title: "Wire harness routing change recovery",
    supplierId: "Demo Supplier B",
    status: "under_review",
    settlementCurrency: "USD",
    recoverableCost: "875000.00",
    eligibleVolumeBasis: "invoiced_units",
    effectiveFrom: "2026-10-01",
    ownerId: "Commercial recovery owner",
    documentVersionIds: ["Unsigned-agreement-v1.pdf"],
    programIds: ["p-002"],
    modelYearIds: ["2027"],
    partIds: ["pt-0002"],
    dcrIds: ["DCR-2026-0149"],
    ratePeriods: [{ effectiveFrom: "2026-10-01", perUnitRate: "3.250000", currency: "USD" }],
  },
  {
    id: "agreement-003",
    organizationId: "demo-org",
    agreementNumber: "AGR-2026-003",
    title: "Inverter control module terms",
    status: "draft",
    settlementCurrency: "USD",
    recoverableCost: "0",
    eligibleVolumeBasis: "part_shipments",
    ownerId: "Commercial recovery owner",
    documentVersionIds: [],
    programIds: [],
    modelYearIds: [],
    partIds: [],
    dcrIds: [],
    ratePeriods: [],
  },
];

const WIZARD_STEPS = [
  "Original",
  "Extract",
  "Evidence",
  "Link records",
  "Recovery rules",
  "Review",
] as const;

function ContractsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [localAgreements, setLocalAgreements] = useState<readonly RecoveryAgreement[]>([]);
  const agreements = useMemo(() => [...localAgreements, ...AGREEMENTS], [localAgreements]);
  const [query, setQuery] = useState(search.q ?? "");
  const [status, setStatus] = useState(search.status ?? "all");
  const [supplier, setSupplier] = useState(search.supplier ?? "all");
  const [oem, setOem] = useState(search.oem ?? "all");
  const [program, setProgram] = useState(search.program ?? "all");
  const [modelYear, setModelYear] = useState(search.modelYear ?? "all");
  const [part, setPart] = useState(search.part ?? "all");
  const [dcr, setDcr] = useState(search.dcr ?? "all");
  const [effective, setEffective] = useState(search.effective ?? "all");
  const [selectedId, setSelectedId] = useState(search.selected ?? AGREEMENTS[0]!.id);
  const [wizardOpen, setWizardOpen] = useState(false);
  const setupTriggerRef = useRef<HTMLButtonElement>(null);
  const handleWizardOpenChange = (open: boolean) => {
    setWizardOpen(open);
    if (!open) setTimeout(() => setupTriggerRef.current?.focus(), 0);
  };
  const setFilters = (next: Partial<ContractSearch>) => {
    void navigate({
      search: {
        ...search,
        q: query,
        status,
        supplier,
        oem,
        program,
        modelYear,
        part,
        dcr,
        effective,
        selected: selectedId,
        ...next,
      },
    });
  };
  const suppliers = useMemo(
    () =>
      [...new Set(agreements.map((agreement) => agreement.supplierId).filter(Boolean))] as string[],
    [agreements],
  );
  const filtered = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          (status === "all" || agreement.status === status) &&
          (supplier === "all" || agreement.supplierId === supplier) &&
          (program === "all" || agreement.programIds.includes(program)) &&
          (modelYear === "all" || agreement.modelYearIds.includes(modelYear)) &&
          (part === "all" || agreement.partIds.includes(part)) &&
          (dcr === "all" || agreement.dcrIds.includes(dcr)) &&
          (effective === "all" || agreement.effectiveFrom?.slice(0, 7) === effective) &&
          (oem === "all" ||
            agreement.programIds.some(
              (id) => demoPrograms.find((candidate) => candidate.id === id)?.oem === oem,
            )) &&
          `${agreement.agreementNumber} ${agreement.title} ${agreement.supplierId ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [agreements, query, status, supplier, oem, program, modelYear, part, dcr, effective],
  );
  const selected =
    agreements.find((agreement) => agreement.id === selectedId) ?? filtered[0] ?? agreements[0]!;

  return (
    <AppShell
      title="Recovery Agreements and Contracts"
      description="Canonical contractual authority for recovery terms, linked records, evidence, approval, and activation."
      actions={
        <Button ref={setupTriggerRef} size="sm" onClick={() => setWizardOpen(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> Set up / activate recovery
        </Button>
      }
    >
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <strong>Why this matters:</strong> a DCR can be drafted without commercial terms, but no
        recovery can activate or post until an approved, effective agreement is linked.
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agreement register</CardTitle>
            <CardDescription>
              {filtered.length} of {agreements.length} synthetic agreements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setFilters({ q: event.target.value });
                  }}
                  placeholder="Search agreements"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setFilters({ status: value });
                }}
              >
                <SelectTrigger className="w-36" aria-label="Filter agreement status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(
                    [
                      "draft",
                      "under_review",
                      "approved",
                      "active",
                      "expired",
                      "superseded",
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ContractFilter
                label="Supplier"
                value={supplier}
                options={suppliers.map((value) => ({ value, label: value }))}
                onChange={(value) => {
                  setSupplier(value);
                  setFilters({ supplier: value });
                }}
              />
              <ContractFilter
                label="OEM"
                value={oem}
                options={[...new Set(demoPrograms.map((item) => item.oem))].map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={(value) => {
                  setOem(value);
                  setFilters({ oem: value });
                }}
              />
              <ContractFilter
                label="Program"
                value={program}
                options={demoPrograms.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => {
                  setProgram(value);
                  setFilters({ program: value });
                }}
              />
              <ContractFilter
                label="Model year"
                value={modelYear}
                options={[...new Set(Object.values(programModelYears).flat().map(String))].map(
                  (value) => ({ value, label: value }),
                )}
                onChange={(value) => {
                  setModelYear(value);
                  setFilters({ modelYear: value });
                }}
              />
              <ContractFilter
                label="Part"
                value={part}
                options={demoParts.slice(0, 200).map((item) => ({
                  value: item.id,
                  label: `${item.partNumber} · ${item.description}`,
                }))}
                onChange={(value) => {
                  setPart(value);
                  setFilters({ part: value });
                }}
              />
              <ContractFilter
                label="DCR"
                value={dcr}
                options={["DCR-2026-0148", "DCR-2026-0149"].map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={(value) => {
                  setDcr(value);
                  setFilters({ dcr: value });
                }}
              />
              <ContractFilter
                label="Effective month"
                value={effective}
                options={(
                  [
                    ...new Set(
                      agreements.map((item) => item.effectiveFrom?.slice(0, 7)).filter(Boolean),
                    ),
                  ] as string[]
                ).map((value) => ({ value, label: value }))}
                onChange={(value) => {
                  setEffective(value);
                  setFilters({ effective: value });
                }}
              />
            </div>
            <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {filtered.map((agreement) => (
                <button
                  key={agreement.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(agreement.id);
                    setFilters({ selected: agreement.id });
                  }}
                  className={`w-full rounded-lg border p-3 text-left ${agreement.id === selected.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {agreement.agreementNumber}
                    </span>
                    <Badge variant="outline">{statusLabel(agreement.status)}</Badge>
                  </div>
                  <div className="mt-2 text-sm font-medium">{agreement.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {agreement.supplierId ?? "Supplier not linked"} · {agreement.programIds.length}{" "}
                    programs · {agreement.partIds.length} parts
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{selected.title}</CardTitle>
                  <Badge>{statusLabel(selected.status)}</Badge>
                </div>
                <CardDescription className="mt-1 font-mono">
                  {selected.agreementNumber}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled
                title="Authentication and persisted write access are required to edit staging records"
              >
                Edit unavailable in demo
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Fact
                label="Recoverable cost"
                value={`${selected.settlementCurrency} ${Number(selected.recoverableCost).toLocaleString()}`}
              />
              <Fact label="Eligible volume" value={volumeLabel(selected.eligibleVolumeBasis)} />
              <Fact label="Effective" value={selected.effectiveFrom ?? "Not set"} />
              <Fact label="Expiry" value={selected.expiresOn ?? "No expiry recorded"} />
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" /> Canonical links
                </CardTitle>
                <CardDescription>
                  All workspaces refer to this same agreement and version.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <LinkedRows label="Programs" values={selected.programIds} href="/programs" />
                <LinkedRows label="Model years" values={selected.modelYearIds} href="/programs" />
                <LinkedRows label="Parts / revisions" values={selected.partIds} href="/parts" />
                <LinkedRows label="DCRs" values={selected.dcrIds} href="/dcrs" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCheck2 className="h-4 w-4" /> Original and evidence
                </CardTitle>
                <CardDescription>
                  Private originals remain versioned; extracted values require review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.documentVersionIds.length ? (
                  selected.documentVersionIds.map((document) => (
                    <div key={document} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{document}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Private object · hash retained · signed read unavailable in demo
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No original document yet. Activation remains blocked.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4" /> Rate periods
                </CardTitle>
                <CardDescription>
                  Exact decimal terms are effective-dated and never inferred from source costs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selected.ratePeriods.length ? (
                  selected.ratePeriods.map((rate) => (
                    <div
                      key={`${rate.effectiveFrom}-${rate.perUnitRate}`}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <span>
                        {rate.effectiveFrom} → {rate.effectiveTo ?? "open"}
                      </span>
                      <span className="font-mono font-semibold">
                        {rate.currency} {rate.perUnitRate}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No rate terms. Approval remains blocked.
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" /> Approval and version history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Timeline
                  label="Draft created"
                  detail="Commercial recovery owner · version 1"
                  complete
                />
                <Timeline
                  label="Evidence reviewed"
                  detail={
                    selected.documentVersionIds.length
                      ? "Original linked; extraction remains provider-gated"
                      : "Waiting for original document"
                  }
                  complete={selected.documentVersionIds.length > 0}
                />
                <Timeline
                  label="Commercial approval"
                  detail={
                    selected.approvedBy
                      ? `${selected.approvedBy} · ${selected.approvedAt}`
                      : "Waiting for an independent approver"
                  }
                  complete={Boolean(selected.approvedBy)}
                />
                <Timeline
                  label="Recovery activated"
                  detail={
                    selected.status === "active"
                      ? "Effective agreement gates calculation and posting"
                      : "Not active"
                  }
                  complete={selected.status === "active"}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AgreementWizard
        open={wizardOpen}
        onOpenChange={handleWizardOpenChange}
        onActivated={(agreement) => {
          setLocalAgreements((current) => [
            agreement,
            ...current.filter(
              (candidate) =>
                candidate.id !== agreement.id &&
                candidate.agreementNumber !== agreement.agreementNumber,
            ),
          ]);
          setSelectedId(agreement.id);
          setFilters({ selected: agreement.id });
        }}
      />
    </AppShell>
  );
}

function AgreementWizard({
  open,
  onOpenChange,
  onActivated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated: (agreement: RecoveryAgreement) => void;
}) {
  const [step, setStep] = useState(0);
  const [number, setNumber] = useState("AGR-2026-004");
  const [title, setTitle] = useState("");
  const [supplier, setSupplier] = useState("");
  const [syntheticOriginal, setSyntheticOriginal] = useState(false);
  const [programs, setPrograms] = useState("");
  const [parts, setParts] = useState("");
  const [dcrs, setDcrs] = useState("");
  const [oem, setOem] = useState("Ford");
  const [modelYear, setModelYear] = useState("2027");
  const [partMode, setPartMode] = useState<"existing" | "new" | "revision">("existing");
  const [partProposal, setPartProposal] = useState("");
  const [rounding, setRounding] = useState("0.01");
  const [forecastAssumption, setForecastAssumption] = useState("Development baseline v1");
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [incompleteReason, setIncompleteReason] = useState<string | null>(null);
  const [cost, setCost] = useState("");
  const [rate, setRate] = useState("");
  const [basis, setBasis] = useState<EligibleVolumeBasis>("part_shipments");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-09-01");

  const next = () => {
    if (step === 0 && !syntheticOriginal) {
      toast.error("Use the synthetic original for this credential-free demonstration.");
      return;
    }
    if (step === 2 && !evidenceReviewed) {
      toast.error("Review and confirm the agreement evidence before linking recovery records.");
      return;
    }
    if (step === 3 && !programs.trim()) {
      toast.error("Select a controlled OEM program before continuing.");
      return;
    }
    if (step === 3 && !parts.trim() && !partProposal.trim()) {
      toast.error("Select an existing part or retain a governed new/revision proposal.");
      return;
    }
    setStep((current) => Math.min(current + 1, WIZARD_STEPS.length - 1));
  };

  const finish = () => {
    if (partMode !== "existing") {
      const reason =
        "Activation blocked: a proposed part or revision needs admin duplicate review and approval before recovery can activate.";
      setIncompleteReason(reason);
      toast.error(reason);
      return;
    }
    if (!programs || !parts) {
      const reason =
        "Activation blocked: select both a controlled program and an existing controlled part/revision.";
      setIncompleteReason(reason);
      toast.error(reason);
      return;
    }
    if (rounding !== "0.01") {
      const reason =
        "Activation blocked: this version supports the approved half-even policy at a 0.01 settlement boundary only.";
      setIncompleteReason(reason);
      toast.error(reason);
      return;
    }
    setIncompleteReason(null);
    try {
      const agreement: RecoveryAgreement = {
        id: `local-${number
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}`,
        organizationId: "demo-org",
        agreementNumber: number,
        title,
        supplierId: supplier || undefined,
        status: "draft",
        settlementCurrency: "USD",
        recoverableCost: cost,
        eligibleVolumeBasis: basis,
        effectiveFrom,
        ownerId: "Local reviewer",
        documentVersionIds: syntheticOriginal ? ["synthetic-agreement-original.pdf"] : [],
        programIds: programs ? [programs] : [],
        modelYearIds: modelYear ? [modelYear] : [],
        partIds: parts ? [parts] : partProposal ? [`proposed:${partProposal}`] : [],
        dcrIds: dcrs ? [dcrs] : [],
        ratePeriods: rate ? [{ effectiveFrom, perUnitRate: rate, currency: "USD" }] : [],
      };
      validateRecoveryAgreement(agreement);
      const reviewed = submitAgreementForReview(agreement);
      const approved = approveRecoveryAgreement({
        agreement: reviewed,
        approverId: "Synthetic commercial approver",
        approvalDecisionId: "synthetic-approval-evidence-v1",
        approvedAt: "2026-08-24T09:00:00Z",
      });
      const active = activateRecoveryAgreement(approved, "2026-09-01", {
        agreementEvidenceReviewed: evidenceReviewed,
        eligibleVolumeBasisConfirmed: true,
        roundingMode: "half_even",
        forecastAssumptionsVersion: forecastAssumption,
        compatibleLinks: [{ programId: programs, modelYearId: modelYear, partId: parts }],
        dcrStatuses: dcrs ? [{ id: dcrs, status: "approved" }] : [],
      });
      onActivated(active);
      toast.success(`Synthetic recovery activated — ${number}`, {
        description:
          "Agreement, evidence, linked records and recovery rules passed one atomic synthetic activation. No live posting was created.",
      });
      onOpenChange(false);
      setStep(0);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Agreement validation failed";
      setIncompleteReason(reason);
      toast.error(reason);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Set up / activate recovery</DialogTitle>
          <DialogDescription>
            One controlled workflow optionally links an approved DCR, then reviews agreement
            evidence, governed records and recovery rules before an all-or-nothing synthetic
            activation.
          </DialogDescription>
        </DialogHeader>
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Agreement creation steps">
          {WIZARD_STEPS.map((label, index) => (
            <li
              key={label}
              className={`rounded-md border px-2 py-2 text-center text-[11px] font-medium ${index === step ? "border-primary bg-primary/5 text-primary" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "text-muted-foreground"}`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <div className="min-h-72 rounded-lg border p-4">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Private original</h3>
              <p className="text-sm text-muted-foreground">
                Customer documents are never bundled in demonstration data. Use the clearly labelled
                synthetic original to exercise the workflow.
              </p>
              <Button variant="outline" onClick={() => setSyntheticOriginal(true)}>
                <FilePlus2 className="mr-2 h-4 w-4" />{" "}
                {syntheticOriginal ? "Synthetic original attached" : "Attach synthetic original"}
              </Button>
              <Button
                className="ml-2"
                variant="outline"
                disabled
                title="Approved private Storage credentials and document policy are required"
              >
                Upload customer document unavailable
              </Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Candidate extraction</h3>
              <p className="text-sm text-muted-foreground">
                The approved extraction provider is not connected. Synthetic candidates can be
                reviewed without claiming a live OCR result.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Candidate label="Agreement number" value={number} />
                <Candidate label="Currency" value="USD" />
                <Candidate label="Effective date" value={effectiveFrom} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Evidence review</h3>
              <p className="text-sm text-muted-foreground">
                Confirm values against the synthetic page reference. Corrections require a reason in
                the persisted workflow.
              </p>
              <div className="rounded-lg border p-3 text-sm">
                <div className="font-medium">Page 2 · Recovery terms table</div>
                <div className="mt-1 text-muted-foreground">
                  Synthetic evidence only · confidence 0.98 · reviewer required
                </div>
              </div>
              <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Checkbox
                  checked={evidenceReviewed}
                  onCheckedChange={(checked) => setEvidenceReviewed(checked === true)}
                  aria-label="Confirm synthetic agreement evidence"
                />
                <span>
                  I reviewed the agreement number, effective date, currency, recoverable cost, and
                  rate evidence against the synthetic original.
                </span>
              </label>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Approved DCR (optional)">
                <Select
                  value={dcrs || "none"}
                  onValueChange={(value) => setDcrs(value === "none" ? "" : value)}
                >
                  <SelectTrigger aria-label="Approved DCR">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No DCR — managed externally</SelectItem>
                    <SelectItem value="DCR-2026-0148">DCR-2026-0148 · Approved</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="OEM / make">
                <Select
                  value={oem}
                  onValueChange={(value) => {
                    setOem(value);
                    setPrograms("");
                    setParts("");
                  }}
                >
                  <SelectTrigger aria-label="OEM or make">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set(demoPrograms.map((item) => item.oem))].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Program / model">
                <Select
                  value={programs || "none"}
                  onValueChange={(value) => {
                    const next = value === "none" ? "" : value;
                    setPrograms(next);
                    const selected = demoPrograms.find((item) => item.id === next);
                    setModelYear(
                      String(selected ? (programModelYears[selected.id]?.[0] ?? 2027) : 2027),
                    );
                    setParts("");
                  }}
                >
                  <SelectTrigger aria-label="Program or model">
                    <SelectValue placeholder="Select controlled program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select program</SelectItem>
                    {demoPrograms
                      .filter((item) => item.oem === oem)
                      .slice(0, 100)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {item.code}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Model year">
                <Select value={modelYear} onValueChange={setModelYear}>
                  <SelectTrigger aria-label="Model year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programs ? (
                      (
                        programModelYears[
                          demoPrograms.find((item) => item.id === programs)?.id ?? ""
                        ] ?? []
                      ).map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="2027">2027</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Part choice">
                <Select
                  value={partMode}
                  onValueChange={(value) => setPartMode(value as typeof partMode)}
                >
                  <SelectTrigger aria-label="Part choice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Existing controlled part</SelectItem>
                    <SelectItem value="new">Propose new part</SelectItem>
                    <SelectItem value="revision">Propose effective-dated revision</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {partMode === "existing" ? (
                <Field label="Part / revision">
                  <Select
                    value={parts || "none"}
                    onValueChange={(value) => setParts(value === "none" ? "" : value)}
                  >
                    <SelectTrigger aria-label="Part or revision">
                      <SelectValue placeholder="Select existing part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select part</SelectItem>
                      {demoParts
                        .filter((item) => !programs || item.programId === programs)
                        .slice(0, 200)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.partNumber} · {item.description}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field
                  label={partMode === "new" ? "Proposed new part number" : "Proposed revision"}
                >
                  <Input
                    value={partProposal}
                    onChange={(event) => setPartProposal(event.target.value)}
                    placeholder="Search runs before admin review"
                  />
                  <p className="text-xs text-amber-700">
                    Duplicate/alias check: synthetic warning only; activation retains this as an
                    incomplete governed proposal.
                  </p>
                </Field>
              )}
              <Field label="Supplier">
                <Input
                  value={supplier}
                  onChange={(event) => setSupplier(event.target.value)}
                  placeholder="Governed supplier"
                />
              </Field>
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Agreement number">
                <Input value={number} onChange={(event) => setNumber(event.target.value)} />
              </Field>
              <Field label="Title">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="Recoverable cost (USD)">
                <Input
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Per-unit rate (USD)">
                <Input
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Eligible-volume basis">
                <Select
                  value={basis}
                  onValueChange={(value) => setBasis(value as EligibleVolumeBasis)}
                >
                  <SelectTrigger aria-label="Eligible-volume basis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part_shipments">Part shipments</SelectItem>
                    <SelectItem value="vehicle_production">
                      Vehicle production with approved part rules
                    </SelectItem>
                    <SelectItem value="invoiced_units">Invoiced units</SelectItem>
                    <SelectItem value="manual_approved">
                      Explicitly approved manual units
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective from">
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </Field>
              <Field label="Currency and rounding">
                <div className="flex gap-2">
                  <Input value="USD" disabled />
                  <Input
                    value={rounding}
                    onChange={(event) => setRounding(event.target.value)}
                    aria-label="Rounding increment"
                  />
                </div>
              </Field>
              <Field label="Forecast assumption">
                <Input
                  value={forecastAssumption}
                  onChange={(event) => setForecastAssumption(event.target.value)}
                />
              </Field>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review draft</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Fact label="Agreement" value={`${number} · ${title || "Title required"}`} />
                <Fact
                  label="Original"
                  value={syntheticOriginal ? "Synthetic original attached" : "Missing"}
                />
                <Fact
                  label="Linked scope"
                  value={`${programs ? 1 : 0} program · ${parts || partProposal ? 1 : 0} part/revision · ${dcrs ? 1 : 0} DCR`}
                />
                <Fact
                  label="Recovery rule"
                  value={`${basisLabel(basis)} · USD ${rate || "rate required"} · round ${rounding} · ${forecastAssumption}`}
                />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                Activate atomically creates a clearly synthetic approved effective agreement and
                linked recovery setup only after every required item validates. A failure retains
                this explicit incomplete draft and explains the exact missing item; no partial
                active recovery or posting is created.
              </div>
              {incompleteReason && (
                <div
                  role="status"
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <strong>Incomplete draft retained:</strong> {incompleteReason}
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
            <Button onClick={next}>
              Next <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Activate synthetic recovery
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const labelledChildren = Children.toArray(children).map((child, index) =>
    index === 0 && isValidElement<{ id?: string }>(child) ? cloneElement(child, { id }) : child,
  );
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {labelledChildren}
    </div>
  );
}
function ContractFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8" aria-label={`Filter by ${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
function Candidate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
      <Badge className="mt-2" variant="secondary">
        Synthetic candidate
      </Badge>
    </div>
  );
}
function LinkedRows({
  label,
  values,
  href,
}: {
  label: string;
  values: readonly string[];
  href: "/programs" | "/parts" | "/dcrs";
}) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {values.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Button key={value} asChild size="sm" variant="outline" className="h-7">
              <Link to={href}>{linkedRecordLabel(label, value)}</Link>
            </Button>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-muted-foreground">None linked</div>
      )}
    </div>
  );
}
function linkedRecordLabel(label: string, value: string): string {
  if (label === "Programs") {
    return demoPrograms.find((program) => program.id === value)?.name ?? value;
  }
  if (label.startsWith("Parts")) {
    return demoParts.find((part) => part.id === value)?.partNumber ?? value;
  }
  return value;
}
function Timeline({
  label,
  detail,
  complete,
}: {
  label: string;
  detail: string;
  complete: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${complete ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
      />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
function statusLabel(status: RecoveryAgreement["status"]): string {
  return {
    draft: "Draft",
    under_review: "Under review",
    approved: "Approved",
    active: "Active",
    expired: "Expired",
    superseded: "Superseded",
    rejected: "Rejected",
  }[status];
}
function volumeLabel(basis: EligibleVolumeBasis): string {
  return {
    part_shipments: "Part shipments",
    vehicle_production: "Vehicle production with approved part rules",
    invoiced_units: "Invoiced units",
    manual_approved: "Explicitly approved manual units",
  }[basis];
}
function basisLabel(basis: EligibleVolumeBasis): string {
  return volumeLabel(basis);
}
