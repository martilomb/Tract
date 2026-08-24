import { useState, type ReactNode } from "react";
import { PackagePlus } from "lucide-react";
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
import { programModelYears, programs } from "@/lib/demo-data";

export function CreatePartRevisionDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [partNumber, setPartNumber] = useState("");
  const [revision, setRevision] = useState("");
  const [description, setDescription] = useState("");
  const [program, setProgram] = useState(programs[0]!.id);
  const [modelYears, setModelYears] = useState(
    (programModelYears[programs[0]!.id] ?? []).join(", "),
  );
  const [sourceDcr, setSourceDcr] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-08-24");

  const submit = () => {
    if (!partNumber.trim() || !revision.trim() || !program.trim() || !effectiveFrom) {
      toast.error("Part number, revision, program, and effective date are required.");
      return;
    }
    toast.success(`Part revision draft validated — ${partNumber.trim()} ${revision.trim()}`, {
      description: sourceDcr.trim()
        ? `Linked to ${sourceDcr.trim()}; the historical part remains unchanged.`
        : "No DCR was created. Link an existing approved change request before approving the revision.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-brand" /> Create part or revision
          </DialogTitle>
          <DialogDescription>
            Add a component revision without overwriting history. A redesign links to an existing
            DCR; it does not create a new vehicle program.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Part number">
            <Input
              value={partNumber}
              onChange={(event) => setPartNumber(event.target.value)}
              placeholder="FO-104582"
            />
          </Field>
          <Field label="Revision">
            <Input
              value={revision}
              onChange={(event) => setRevision(event.target.value)}
              placeholder="B"
            />
          </Field>
          <Field label="Program">
            <Select
              value={program}
              onValueChange={(programId) => {
                setProgram(programId);
                setModelYears((programModelYears[programId] ?? []).join(", "));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select governed program" />
              </SelectTrigger>
              <SelectContent>
                {programs.slice(0, 200).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.oem} · {item.name} · {item.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Applicable model years">
            <Input
              value={modelYears}
              onChange={(event) => setModelYears(event.target.value)}
              placeholder="2027, 2028"
            />
          </Field>
          <Field label="Source DCR">
            <Input
              value={sourceDcr}
              onChange={(event) => setSourceDcr(event.target.value)}
              placeholder="Optional for draft; required for redesign approval"
            />
          </Field>
          <Field label="Effective from">
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Component and revision scope"
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Validate part draft</Button>
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
