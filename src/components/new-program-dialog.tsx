import { useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, DollarSign, Calendar, Package } from "lucide-react";
import { formatMoney } from "@/lib/demo-data";

export function NewProgramDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dcrId, setDcrId] = useState("DCR-2026-0148");
  const [oem, setOem] = useState("Ford");
  const [program, setProgram] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [edtCost, setEdtCost] = useState("2400000");
  const [expectedVolume, setExpectedVolume] = useState("380000");
  const [sop, setSop] = useState("2026-06-01");
  const [eop, setEop] = useState("2031-12-31");
  const [notes, setNotes] = useState("");

  const cost = Number(edtCost) || 0;
  const vol = Number(expectedVolume) || 0;
  const perPiece = vol > 0 ? cost / vol : 0;

  const submit = () => {
    if (!program || !partNumber || cost <= 0 || vol <= 0) {
      toast.error("Fill in program, part number, ED&T cost, and expected volume.");
      return;
    }
    toast.info(`Development draft validated — ${program}`, {
      description: `${dcrId} · ${formatMoney(cost, { compact: true })} across ${vol.toLocaleString()} units (${formatMoney(perPiece)}/unit). This demo draft was not persisted.`,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" /> New program from DCR
          </DialogTitle>
          <DialogDescription>
            Amortize OEM-directed engineering, development & testing (ED&T) cost across the expected
            shipment volume for a Design Change Request.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dcr">DCR ID</Label>
            <Input id="dcr" value={dcrId} onChange={(e) => setDcrId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oem">OEM</Label>
            <Select value={oem} onValueChange={setOem}>
              <SelectTrigger id="oem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Ford", "GM", "Stellantis", "Toyota", "Honda", "Rivian", "Nissan", "Hyundai"].map(
                  (o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="program">Program / Carline</Label>
            <Input
              id="program"
              placeholder="e.g. F-150 Lightning Refresh"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pn">Part number</Label>
            <Input
              id="pn"
              placeholder="FO-104582-B"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Change description</Label>
            <Input
              id="desc"
              placeholder="Reinforcement redesign"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edt" className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> ED&T cost (USD)
            </Label>
            <Input
              id="edt"
              type="number"
              value={edtCost}
              onChange={(e) => setEdtCost(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vol" className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" /> Expected volume (pcs)
            </Label>
            <Input
              id="vol"
              type="number"
              value={expectedVolume}
              onChange={(e) => setExpectedVolume(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sop" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Start of production
            </Label>
            <Input id="sop" type="date" value={sop} onChange={(e) => setSop(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eop" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> End of production
            </Label>
            <Input id="eop" type="date" value={eop} onChange={(e) => setEop(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="notes">Contract notes</Label>
            <Textarea
              id="notes"
              placeholder="Contract references, review window, and price-change notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="rounded-lg border border-brand/30 bg-brand/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">
            Amortization preview
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Total to recover</div>
              <div className="font-display text-lg font-bold">
                {formatMoney(cost, { compact: true })}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Per-piece amort</div>
              <div className="font-display text-lg font-bold">
                {perPiece > 0 ? formatMoney(perPiece) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="font-display text-lg font-bold">
                {vol > 0 ? vol.toLocaleString() : "—"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Validate demo draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
