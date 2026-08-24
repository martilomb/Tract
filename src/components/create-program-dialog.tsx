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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OEMS = ["Ford", "GM", "Stellantis", "Toyota", "Honda", "Rivian", "Nissan", "Hyundai"];

export function CreateProgramDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [oem, setOem] = useState(OEMS[0]!);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [modelYears, setModelYears] = useState("2027, 2028");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2031-12-31");

  const submit = () => {
    const years = modelYears
      .split(",")
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger);
    if (!code.trim() || !name.trim() || years.length === 0) {
      toast.error("Program code, carline name, and at least one model year are required.");
      return;
    }
    toast.success(`Program draft validated — ${name.trim()}`, {
      description: `${oem} · ${code.trim()} · ${years.join(", ")}. No part, DCR, or recovery agreement was created.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand" /> Create vehicle program
          </DialogTitle>
          <DialogDescription>
            Create only the OEM vehicle or carline record. Parts, change requests, and recovery
            agreements are separate workflows.
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
          <Field label="Platform">
            <Input
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              placeholder="Optional governed platform"
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
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
          This workflow never creates a part, DCR, accrual, or financial posting.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Validate program draft</Button>
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
