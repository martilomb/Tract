import { useState, type ReactNode } from "react";
import { Calendar, Layers } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProgramProposalInput } from "@/domain/master-data-proposals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OEMS = ["Ford", "GM", "Stellantis", "Toyota", "Honda", "Rivian", "Nissan", "Hyundai"];

export function CreateProgramDialog({
  trigger,
  onValidated,
}: {
  trigger: ReactNode;
  onValidated: (input: Omit<ProgramProposalInput, "id" | "createdAt">) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [oem, setOem] = useState(OEMS[0]!);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [modelYears, setModelYears] = useState("2027, 2028");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2031-12-31");
  const [confidential, setConfidential] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const [aliases, setAliases] = useState("");

  const submit = () => {
    const years = modelYears
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger);
    if (!code.trim() || !name.trim() || years.length === 0 || !reviewReason.trim()) {
      toast.error("Program code, carline name, model year, and review reason are required.");
      return;
    }
    try {
      onValidated({
        organizationId: "demo-org",
        oem,
        code,
        name,
        vehicleArchitecture: platform,
        modelYears: years,
        effectiveFrom: startDate,
        effectiveTo: endDate,
        confidential,
        reviewReason,
        aliases: aliases.split(",").map((alias) => alias.trim()),
      });
      toast.success(`Program proposal saved for review — ${name.trim()}`, {
        description: `${oem} · ${code.trim()} · ${years.join(", ")}. Browser-local pending review; no database record, approval, part, DCR, or recovery agreement was created.`,
      });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Program proposal could not be saved.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand" /> Admin program maintenance
          </DialogTitle>
          <DialogDescription>
            Authorized administrators only: create a controlled OEM vehicle or carline master-data
            record. Ordinary recovery work starts in Set up / activate recovery.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization">
            <Input value="Demonstration organization" disabled />
          </Field>
          <Field label="OEM">
            <Select value={oem} onValueChange={setOem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OEMS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Program code">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="PROGRAM-2027"
            />
          </Field>
          <Field label="Carline name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Vehicle carline"
            />
          </Field>
          <Field label="Vehicle architecture (optional)">
            <Input
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              placeholder="Optional shared vehicle architecture"
            />
          </Field>
          <Field label="Model years">
            <Input
              value={modelYears}
              onChange={(event) => setModelYears(event.target.value)}
              aria-describedby="model-year-help"
            />
            <p id="model-year-help" className="mt-1 text-xs text-muted-foreground">
              Comma-separated governed model years.
            </p>
          </Field>
          <Field label="Program start">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </Field>
          <Field label="Program end">
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </Field>
          <Field label="Known aliases (optional)">
            <Input
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              placeholder="Legacy code, provider identifier"
            />
          </Field>
          <Field label="Review reason">
            <Input
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              placeholder="Why this new or confidential proposal needs review"
            />
          </Field>
          <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border p-3">
            <Checkbox
              id="confidential-proposal"
              checked={confidential}
              onCheckedChange={(checked) => setConfidential(checked === true)}
            />
            <Label htmlFor="confidential-proposal" className="cursor-pointer text-sm font-normal">
              Confidential or unannounced proposal
            </Label>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
          The validated proposal stays pending review in this browser only. It never creates a part,
          DCR, agreement, accrual, financial posting, database record, or approval.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save pending proposal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
