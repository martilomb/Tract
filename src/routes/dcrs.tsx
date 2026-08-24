import { createFileRoute, Link } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  Filter,
  History,
  Link2,
  MessageSquarePlus,
  LayoutGrid,
  Paperclip,
  Search,
  Table2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useDataset } from "@/lib/commodity";
import {
  transitionDcr,
  type DcrState,
  type DcrStatus,
  type DcrTransitionEvidence,
  type WorkflowRole,
} from "@/domain/dcr-workflow";

export const Route = createFileRoute("/dcrs")({ component: DcrWorkflowPage });

interface DcrComment {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

interface DemoDcr {
  id: string;
  number: string;
  title: string;
  program: string;
  modelYears: readonly string[];
  partNumber: string;
  supplier: string;
  owner: string;
  reviewer: string;
  recoverySetupComplete: boolean;
  attachments: readonly { name: string; classification: "private"; linkedAt: string }[];
  agreement?: {
    number: string;
    status: "draft" | "approved" | "active";
    effective: boolean;
  };
  evidence: DcrTransitionEvidence;
  comments: readonly DcrComment[];
  state: DcrState;
}

const STATUS_LABELS: Record<DcrStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  active: "Active",
  closed: "Closed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const PIPELINE: readonly DcrStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "active",
  "closed",
];
const BOARD_STAGES: readonly DcrStatus[] = [...PIPELINE, "rejected", "cancelled"];

const NEXT_STATUS: Partial<Record<DcrStatus, DcrStatus>> = {
  draft: "submitted",
  submitted: "under_review",
  under_review: "approved",
  approved: "active",
  active: "closed",
};

const EMPTY_EVIDENCE: DcrTransitionEvidence = {
  documentTypes: [],
  assignmentRoles: ["owner"],
  approvedStages: [],
};

const INITIAL_DCRS: DemoDcr[] = [
  {
    id: "demo-dcr-1",
    number: "DCR-2026-0148",
    title: "Inverter cooling-plate revision",
    program: "F-150 Lightning",
    modelYears: ["2026", "2027"],
    partNumber: "FO-104582-B",
    supplier: "Demo Supplier A",
    owner: "Local reviewer",
    reviewer: "Demo finance reviewer",
    recoverySetupComplete: true,
    attachments: [
      {
        name: "technical-evidence-summary.pdf",
        classification: "private",
        linkedAt: "2026-08-24 08:40 UTC",
      },
    ],
    agreement: { number: "RA-2026-0041", status: "approved", effective: true },
    evidence: {
      documentTypes: ["technical_evidence"],
      assignmentRoles: ["owner", "reviewer", "approver"],
      approvedStages: ["technical"],
    },
    comments: [
      {
        id: "comment-1",
        author: "Local reviewer",
        createdAt: "2026-08-24 08:45 UTC",
        body: "Supplier drawing and affected model years confirmed against the evidence record.",
      },
    ],
    state: {
      id: "demo-dcr-1",
      organizationId: "demo-org",
      status: "under_review",
      history: [
        {
          from: "draft",
          to: "submitted",
          actorId: "local-preparer",
          occurredAt: "2026-08-23T15:00:00Z",
          workflowId: "tract-default-dcr",
          workflowVersion: 1,
        },
        {
          from: "submitted",
          to: "under_review",
          actorId: "local-reviewer",
          occurredAt: "2026-08-24T08:30:00Z",
          workflowId: "tract-default-dcr",
          workflowVersion: 1,
        },
      ],
    },
  },
  {
    id: "demo-dcr-2",
    number: "DCR-2026-0149",
    title: "Wire-harness routing change",
    program: "Equinox EV",
    modelYears: ["2027"],
    partNumber: "GM-208441-C",
    supplier: "Demo Supplier B",
    owner: "Local reviewer",
    reviewer: "Not assigned",
    recoverySetupComplete: false,
    attachments: [],
    evidence: EMPTY_EVIDENCE,
    comments: [],
    state: {
      id: "demo-dcr-2",
      organizationId: "demo-org",
      status: "submitted",
      history: [
        {
          from: "draft",
          to: "submitted",
          actorId: "local-preparer",
          occurredAt: "2026-08-24T07:45:00Z",
          workflowId: "tract-default-dcr",
          workflowVersion: 1,
        },
      ],
    },
  },
  {
    id: "demo-dcr-3",
    number: "DCR-2026-0150",
    title: "Bracket material revision",
    program: "IONIQ 5",
    modelYears: ["2026"],
    partNumber: "HY-440218-D",
    supplier: "Not assigned",
    owner: "Local preparer",
    reviewer: "Not assigned",
    recoverySetupComplete: false,
    attachments: [],
    evidence: EMPTY_EVIDENCE,
    comments: [],
    state: { id: "demo-dcr-3", organizationId: "demo-org", status: "draft", history: [] },
  },
];

function DcrWorkflowPage() {
  const { programs, parts } = useDataset();
  const [dcrs, setDcrs] = useState<DemoDcr[]>(INITIAL_DCRS);
  const [selectedId, setSelectedId] = useState(INITIAL_DCRS[0]!.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DcrStatus | "all">("all");
  const [view, setView] = useState<"table" | "board">("table");
  const [sort, setSort] = useState<"number" | "status" | "owner">("number");
  const [actorRole, setActorRole] = useState<WorkflowRole>("administrator");
  const [stageTarget, setStageTarget] = useState<DcrStatus | "">("");
  const [stageReason, setStageReason] = useState("");
  const [historyFilter, setHistoryFilter] = useState<DcrStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const [number, setNumber] = useState("DCR-2026-0151");
  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState("");
  const [partId, setPartId] = useState("");
  const [comment, setComment] = useState("");
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setTimeout(() => createTriggerRef.current?.focus(), 0);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dcrs.filter(
      (dcr) =>
        (statusFilter === "all" || dcr.state.status === statusFilter) &&
        (!query ||
          [dcr.number, dcr.title, dcr.program, dcr.partNumber, dcr.supplier].some((value) =>
            value.toLowerCase().includes(query),
          )),
    );
  }, [dcrs, search, statusFilter]);
  const sorted = useMemo(() => {
    const value = (dcr: DemoDcr) =>
      sort === "status" ? dcr.state.status : sort === "owner" ? dcr.owner : dcr.number;
    return [...filtered].sort((left, right) => value(left).localeCompare(value(right)));
  }, [filtered, sort]);
  const selected = dcrs.find((dcr) => dcr.id === selectedId) ?? dcrs[0];
  const filteredHistory =
    selected?.state.history.filter(
      (entry) => historyFilter === "all" || entry.to === historyFilter,
    ) ?? [];

  const updateSelected = (updater: (dcr: DemoDcr) => DemoDcr) => {
    if (!selected) return;
    setDcrs((current) => current.map((dcr) => (dcr.id === selected.id ? updater(dcr) : dcr)));
  };

  const createDraft = () => {
    const selectedProgram = programs.find((candidate) => candidate.id === programId);
    const selectedPart = parts.find((candidate) => candidate.id === partId);
    if (!number.trim() || !title.trim() || !selectedProgram || !selectedPart) {
      toast.error("DCR number, title, affected program, and part number are required.");
      return;
    }
    if (dcrs.some((dcr) => dcr.number.toLowerCase() === number.trim().toLowerCase())) {
      toast.error("DCR number already exists in this organization.");
      return;
    }
    const id = `demo-dcr-${dcrs.length + 1}`;
    const draft: DemoDcr = {
      id,
      number: number.trim(),
      title: title.trim(),
      program: selectedProgram.name,
      modelYears: [],
      partNumber: selectedPart.partNumber,
      supplier: "Not assigned",
      owner: "Local preparer",
      reviewer: "Not assigned",
      recoverySetupComplete: false,
      attachments: [],
      evidence: EMPTY_EVIDENCE,
      comments: [],
      state: { id, organizationId: "demo-org", status: "draft", history: [] },
    };
    setDcrs((current) => [...current, draft]);
    setSelectedId(id);
    handleDialogOpenChange(false);
    toast.success("DCR draft validated", {
      description: "No recovery agreement is required to draft a DCR. Demo data was not persisted.",
    });
  };

  const moveDcr = (dcrId: string, next: DcrStatus, reason?: string) => {
    const record = dcrs.find((candidate) => candidate.id === dcrId);
    if (!record) return;
    if (!next) return;
    if (next === "active") {
      const agreementReady =
        (record.agreement?.status === "approved" || record.agreement?.status === "active") &&
        record.agreement.effective;
      if (!agreementReady || !record.recoverySetupComplete) {
        toast.error("Transition blocked", {
          description: `${!agreementReady ? "Approved effective recovery agreement is missing. " : ""}${!record.recoverySetupComplete ? "Complete linked recovery setup is missing." : ""} The DCR remains Approved.`,
        });
        return;
      }
    }
    try {
      const state = transitionDcr({
        dcr: record.state,
        to: next,
        actorId: `synthetic-${actorRole}`,
        actorRoles: [actorRole],
        occurredAt: `2026-08-24T${String(10 + record.state.history.length).padStart(2, "0")}:00:00Z`,
        comment: ["closed", "rejected", "cancelled"].includes(next) ? reason : undefined,
        evidence: record.evidence,
        activation: {
          agreementStatus: record.agreement?.status ?? "draft",
          agreementEffective: record.agreement?.effective ?? false,
          recoverySetupComplete: record.recoverySetupComplete,
        },
      });
      setDcrs((current) =>
        current.map((candidate) =>
          candidate.id === record.id ? { ...candidate, state } : candidate,
        ),
      );
      setSelectedId(record.id);
      setStageReason("");
      toast.success(`${STATUS_LABELS[record.state.status]} → ${STATUS_LABELS[next]}`, {
        description: "Validated by workflow version 1; the demonstration change was not persisted.",
      });
    } catch (error) {
      toast.error("Transition blocked", {
        description: error instanceof Error ? error.message : "Required evidence is missing.",
      });
    }
  };

  const advance = (next = selected && NEXT_STATUS[selected.state.status]) => {
    if (selected && next) moveDcr(selected.id, next, stageReason);
  };

  const addEvidence = () => {
    updateSelected((dcr) => ({
      ...dcr,
      attachments: [
        ...dcr.attachments,
        {
          name: "synthetic-technical-evidence.pdf",
          classification: "private",
          linkedAt: "2026-08-24T10:30:00Z",
        },
      ],
      evidence: {
        ...dcr.evidence,
        documentTypes: Array.from(new Set([...dcr.evidence.documentTypes, "technical_evidence"])),
      },
    }));
    toast.success("Synthetic technical evidence linked", {
      description: "No customer document was uploaded or persisted.",
    });
  };

  const assignReviewers = () => {
    updateSelected((dcr) => ({
      ...dcr,
      reviewer: "Demo finance reviewer",
      evidence: {
        ...dcr.evidence,
        assignmentRoles: Array.from(
          new Set([...dcr.evidence.assignmentRoles, "owner", "reviewer", "approver"] as const),
        ),
      },
    }));
    toast.success("Required demo assignments recorded");
  };

  const recordApproval = (stage: "technical" | "release") => {
    updateSelected((dcr) => ({
      ...dcr,
      evidence: {
        ...dcr.evidence,
        approvedStages: Array.from(new Set([...dcr.evidence.approvedStages, stage])),
      },
    }));
    toast.success(`${stage === "technical" ? "Technical" : "Release"} approval recorded`, {
      description: "Local demonstration evidence only; no hosted approval was created.",
    });
  };

  const addComment = () => {
    if (!comment.trim()) {
      toast.error("Enter a comment before adding it.");
      return;
    }
    updateSelected((dcr) => ({
      ...dcr,
      comments: [
        ...dcr.comments,
        {
          id: `comment-${dcr.comments.length + 1}`,
          author: "Local reviewer",
          createdAt: `2026-08-24T${String(11 + dcr.comments.length).padStart(2, "0")}:00:00Z`,
          body: comment.trim(),
        },
      ],
    }));
    setComment("");
    toast.success("Demo comment added locally");
  };

  return (
    <AppShell
      title="Design Change Requests"
      description="Evidence-gated engineering changes with affected records, accountable reviewers, comments, and immutable transitions."
      actions={
        <Button ref={createTriggerRef} size="sm" onClick={() => setDialogOpen(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> Create DCR draft
        </Button>
      }
    >
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">DCR pipeline</CardTitle>
          <CardDescription>
            Select a stage to filter the register. Rejected and cancelled records remain searchable
            audit records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex min-w-max items-center gap-2 overflow-x-auto pb-2"
            aria-label="DCR pipeline"
          >
            {PIPELINE.map((status, index) => (
              <div key={status} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                  className={`min-w-28 rounded-lg border p-3 text-left ${statusFilter === status ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
                >
                  <div className="text-xs font-medium">{STATUS_LABELS[status]}</div>
                  <div className="mt-1 text-lg font-semibold">
                    {dcrs.filter((dcr) => dcr.state.status === status).length}
                  </div>
                </button>
                {index < PIPELINE.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search DCRs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search DCR, program, part, or supplier"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as DcrStatus | "all")}
        >
          <SelectTrigger className="sm:w-48" aria-label="Filter DCR status">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="sm:w-40" aria-label="Sort DCR register">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Sort: DCR number</SelectItem>
            <SelectItem value="status">Sort: stage</SelectItem>
            <SelectItem value="owner">Sort: owner</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actorRole} onValueChange={(value) => setActorRole(value as WorkflowRole)}>
          <SelectTrigger className="sm:w-44" aria-label="Synthetic actor role">
            <UserRound className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="administrator">Actor: Administrator</SelectItem>
            <SelectItem value="preparer">Actor: Preparer</SelectItem>
            <SelectItem value="reviewer">Actor: Reviewer</SelectItem>
            <SelectItem value="approver">Actor: Approver</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border p-0.5" aria-label="DCR view">
          <Button
            size="sm"
            variant={view === "table" ? "secondary" : "ghost"}
            onClick={() => setView("table")}
          >
            <Table2 className="mr-1 h-3.5 w-3.5" /> Table
          </Button>
          <Button
            size="sm"
            variant={view === "board" ? "secondary" : "ghost"}
            onClick={() => setView("board")}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Board
          </Button>
        </div>
      </div>

      {view === "board" && (
        <div
          className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
          aria-label="DCR board view"
        >
          <div className="min-w-0 overflow-x-auto pb-2">
            <div className="grid min-w-[1600px] grid-cols-8 gap-3">
              {BOARD_STAGES.map((stage) => {
                const cards = sorted.filter((dcr) => dcr.state.status === stage);
                return (
                  <section
                    key={stage}
                    className="rounded-lg border bg-secondary/20 p-3"
                    aria-label={`${STATUS_LABELS[stage]} column`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dcrId = event.dataTransfer.getData("text/plain");
                      if (dcrId) moveDcr(dcrId, stage);
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold">{STATUS_LABELS[stage]}</h2>
                      <Badge variant="outline">{cards.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {cards.map((dcr) => (
                        <button
                          key={dcr.id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", dcr.id);
                          }}
                          onClick={() => setSelectedId(dcr.id)}
                          aria-label={`Open ${dcr.number}; drag to request a governed stage change`}
                          className={`w-full rounded-md border bg-background p-3 text-left hover:bg-secondary/50 ${selected?.id === dcr.id ? "ring-2 ring-primary" : ""}`}
                        >
                          <div className="font-mono text-[11px]">{dcr.number}</div>
                          <div className="mt-1 text-sm font-medium">{dcr.title}</div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {dcr.program} · {dcr.partNumber}
                          </div>
                          <div className="mt-2 text-xs">Owner: {dcr.owner}</div>
                        </button>
                      ))}
                      {!cards.length && (
                        <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                          No records
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Drag a card to request a stage change, or use the accessible stage control in the
              record panel. Every move is validated by the fixed lifecycle and cannot bypass role,
              evidence, agreement, or recovery-setup gates; blocked cards remain in their prior
              column.
            </p>
          </div>
          {selected && (
            <Card className="h-fit xl:sticky xl:top-4">
              <CardHeader>
                <CardTitle className="text-base">Selected board record</CardTitle>
                <CardDescription className="font-mono">{selected.number}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="font-medium">{selected.title}</div>
                <Badge variant="outline">{STATUS_LABELS[selected.state.status]}</Badge>
                <div className="text-muted-foreground">
                  {selected.program} · {selected.partNumber}
                </div>
                <div>Owner: {selected.owner}</div>
                <div>Reviewer: {selected.reviewer}</div>
                <div>
                  Agreement: {selected.agreement?.number ?? "Not linked"} · setup{" "}
                  {selected.recoverySetupComplete ? "complete" : "incomplete"}
                </div>
                <p className="text-xs text-muted-foreground">
                  The complete evidence, comments, approvals, activity, and accessible stage control
                  are in the record panel below.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div
        className={
          view === "table"
            ? "grid gap-5 xl:grid-cols-[minmax(620px,1.2fr)_minmax(480px,0.8fr)]"
            : "grid gap-5"
        }
      >
        {view === "table" && (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">DCR table</CardTitle>
              <CardDescription>
                {filtered.length} of {dcrs.length} organization records · select a DCR for its
                governed detail panel
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[720px] overflow-auto p-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>DCR</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Program / model</TableHead>
                    <TableHead>Part / revision</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Reviewer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((dcr) => (
                    <TableRow
                      key={dcr.id}
                      data-state={selected?.id === dcr.id ? "selected" : undefined}
                    >
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedId(dcr.id)}
                          className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {dcr.number}
                        </button>
                      </TableCell>
                      <TableCell className="min-w-52 font-medium">{dcr.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABELS[dcr.state.status]}</Badge>
                      </TableCell>
                      <TableCell className="min-w-40">{dcr.program}</TableCell>
                      <TableCell className="font-mono text-xs">{dcr.partNumber}</TableCell>
                      <TableCell>{dcr.owner}</TableCell>
                      <TableCell>{dcr.reviewer}</TableCell>
                    </TableRow>
                  ))}
                  {!sorted.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No DCRs match the current search and status filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {selected && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{selected.title}</CardTitle>
                    <Badge>{STATUS_LABELS[selected.state.status]}</Badge>
                  </div>
                  <CardDescription className="mt-1 font-mono">{selected.number}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={stageTarget}
                    onValueChange={(value) => setStageTarget(value as DcrStatus)}
                    disabled={!stageTargets(selected.state.status).length}
                  >
                    <SelectTrigger className="w-44" aria-label="Move DCR to stage">
                      <SelectValue
                        placeholder={
                          stageTargets(selected.state.status).length
                            ? "Move to stage"
                            : "Terminal stage"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {stageTargets(selected.state.status).map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={stageReason}
                    onChange={(event) => setStageReason(event.target.value)}
                    className="w-64"
                    aria-label="Stage transition reason"
                    placeholder="Reason for terminal move"
                  />
                  <Button
                    size="sm"
                    disabled={
                      !stageTarget || !stageTargets(selected.state.status).includes(stageTarget)
                    }
                    onClick={() => {
                      if (stageTarget) advance(stageTarget);
                      setStageTarget("");
                    }}
                  >
                    Move stage <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Detail icon={ClipboardCheck} label="Program" value={selected.program} />
                <Detail icon={FilePlus2} label="Part / revision" value={selected.partNumber} />
                <Detail
                  icon={Clock3}
                  label="Model years"
                  value={selected.modelYears.join(", ") || "Not assigned"}
                />
                <Detail icon={UserRound} label="Owner" value={selected.owner} />
                <Detail icon={UserRound} label="Reviewer" value={selected.reviewer} />
              </CardContent>
              <CardContent className="flex flex-wrap gap-2 border-t pt-4">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/programs"
                    search={{
                      oem: undefined,
                      programId: undefined,
                      modelYear: undefined,
                      partId: undefined,
                      view: undefined,
                    }}
                  >
                    Open program
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/parts" search={{}}>
                    Open part
                  </Link>
                </Button>
                {selected.agreement ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/contracts">Open {selected.agreement.number}</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/contracts">Create agreement link</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Paperclip className="h-4 w-4" /> Transition requirements
                  </CardTitle>
                  <CardDescription>
                    A DCR can be drafted without a contract. Configured evidence gates approval and
                    release.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Gate
                    label="Technical evidence"
                    met={selected.evidence.documentTypes.includes("technical_evidence")}
                  />
                  <Gate
                    label="Reviewer and approver assigned"
                    met={
                      selected.evidence.assignmentRoles.includes("reviewer") &&
                      selected.evidence.assignmentRoles.includes("approver")
                    }
                  />
                  <Gate
                    label="Technical approval"
                    met={selected.evidence.approvedStages.includes("technical")}
                  />
                  <Gate
                    label="Release approval"
                    met={selected.evidence.approvedStages.includes("release")}
                  />
                  <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground">Private attachment metadata</div>
                    {selected.attachments.length
                      ? selected.attachments.map((attachment) => (
                          <div key={`${attachment.name}-${attachment.linkedAt}`} className="mt-1">
                            {attachment.name} · {attachment.classification} · linked{" "}
                            {attachment.linkedAt}
                          </div>
                        ))
                      : "No private attachment metadata linked."}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={addEvidence}>
                      Link demo evidence
                    </Button>
                    <Button size="sm" variant="outline" onClick={assignReviewers}>
                      Assign reviewers
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recordApproval("technical")}>
                      Record technical approval
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recordApproval("release")}>
                      Record release approval
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" /> Recovery agreement
                  </CardTitle>
                  <CardDescription>
                    Direct link to the canonical agreement record; terms are not duplicated in the
                    DCR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="agreement-selector" className="text-xs">
                    Controlled agreement link
                  </Label>
                  <Select
                    value={selected.agreement?.number ?? "none"}
                    onValueChange={(value) =>
                      updateSelected((dcr) => ({
                        ...dcr,
                        agreement:
                          value === "none"
                            ? undefined
                            : { number: value, status: "approved", effective: true },
                      }))
                    }
                  >
                    <SelectTrigger id="agreement-selector" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No agreement linked</SelectItem>
                      <SelectItem value="RA-2026-0041">
                        RA-2026-0041 · approved demo agreement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selected.agreement ? (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-semibold">{selected.agreement.number}</span>
                        <Badge variant="outline">{selected.agreement.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Recovery activation requires this agreement to be approved and effective,
                        plus complete linked recovery setup.
                      </p>
                      {selected.recoverySetupComplete ? (
                        <Badge className="mt-3" variant="secondary">
                          Recovery setup complete
                        </Badge>
                      ) : (
                        <Button asChild size="sm" className="mt-3" variant="outline">
                          <Link to="/contracts" search={{ dcr: selected.number }}>
                            Set up / activate recovery
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No agreement linked. This does not block drafting or submission; activation
                      remains unavailable until an approved effective agreement and setup exist.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquarePlus className="h-4 w-4" /> Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.comments.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3 text-sm">
                      <p>{entry.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {entry.author} · {entry.createdAt}
                      </p>
                    </div>
                  ))}
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add review context"
                    aria-label="DCR comment"
                  />
                  <Button size="sm" variant="outline" onClick={addComment}>
                    Add comment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-4 w-4" /> Transition history
                    </CardTitle>
                    <Select
                      value={historyFilter}
                      onValueChange={(value) => setHistoryFilter(value as DcrStatus | "all")}
                    >
                      <SelectTrigger className="w-36" aria-label="Filter transition history">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All events</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CardDescription>
                    Actor, time, workflow id, and version remain attached to every transition.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No matching local transitions in this review session.
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {filteredHistory.map((entry, index) => (
                        <li
                          key={`${entry.occurredAt}-${index}`}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="font-medium">
                            {STATUS_LABELS[entry.from]} → {STATUS_LABELS[entry.to]}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.actorId} · {entry.occurredAt} · {entry.workflowId} v
                            {entry.workflowVersion}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DCR draft</DialogTitle>
            <DialogDescription>
              Creates a DCR draft against controlled existing records. An agreement is not required
              at this stage; new master data is governed in recovery setup.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="DCR number">
              <Input value={number} onChange={(event) => setNumber(event.target.value)} />
            </Field>
            <Field label="Affected program">
              <Select
                value={programId}
                onValueChange={(value) => {
                  setProgramId(value);
                  setPartId("");
                }}
              >
                <SelectTrigger aria-label="Affected program">
                  <SelectValue placeholder="Select existing program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.slice(0, 200).map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.oem} · {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Affected part number / revision">
              <Select value={partId} onValueChange={setPartId} disabled={!programId}>
                <SelectTrigger aria-label="Affected part number or revision">
                  <SelectValue placeholder="Select existing part" />
                </SelectTrigger>
                <SelectContent>
                  {parts
                    .filter((candidate) => candidate.programId === programId)
                    .slice(0, 200)
                    .map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.partNumber} · {candidate.description}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Change title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDraft}>Validate draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Gate({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span>{label}</span>
      <Badge variant={met ? "secondary" : "outline"}>
        {met ? (
          <>
            <Check className="mr-1 h-3 w-3" /> Ready
          </>
        ) : (
          "Required"
        )}
      </Badge>
    </div>
  );
}

function stageTargets(status: DcrStatus): DcrStatus[] {
  const targets: DcrStatus[] = [];
  const next = NEXT_STATUS[status];
  if (next) targets.push(next);
  if (["draft", "submitted", "under_review", "approved"].includes(status)) {
    targets.push("cancelled");
  }
  if (status === "submitted" || status === "under_review") targets.push("rejected");
  return targets;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const labelledChildren = Children.toArray(children).map((child, index) =>
    index === 0 && isValidElement<{ id?: string }>(child) ? cloneElement(child, { id }) : child,
  );
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{labelledChildren}</div>
    </div>
  );
}
