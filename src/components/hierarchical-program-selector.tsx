import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { programModelYears, type Part, type Program } from "@/lib/demo-data";

export interface HierarchySelection {
  oem: string;
  programId: string;
  modelYear: string;
  partId?: string;
}

export function HierarchicalProgramSelector({
  programs,
  parts = [],
  value,
  onChange,
  showPart = false,
}: {
  programs: readonly Program[];
  parts?: readonly Part[];
  value: HierarchySelection;
  onChange: (selection: HierarchySelection) => void;
  showPart?: boolean;
}) {
  const [query, setQuery] = useState("");
  const oems = useMemo(
    () => Array.from(new Set(programs.map((program) => program.oem))).sort(),
    [programs],
  );
  const visiblePrograms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return programs.filter(
      (program) =>
        (value.oem === "all" || program.oem === value.oem) &&
        (!normalized ||
          [program.name, program.code, program.platform, program.oem].some((candidate) =>
            candidate.toLowerCase().includes(normalized),
          )),
    );
  }, [programs, query, value.oem]);
  const selectedProgram = programs.find((program) => program.id === value.programId);
  const years = selectedProgram ? (programModelYears[selectedProgram.id] ?? []) : [];
  const visibleParts = parts.filter((part) => part.programId === value.programId);

  const selectOem = (oem: string) => {
    const firstProgram =
      oem === "all" ? undefined : programs.find((program) => program.oem === oem);
    onChange({
      oem,
      programId: firstProgram?.id ?? "all",
      modelYear: firstProgram ? String(programModelYears[firstProgram.id]?.[0] ?? "all") : "all",
      partId: undefined,
    });
  };

  const selectProgram = (programId: string) => {
    const program = programs.find((candidate) => candidate.id === programId);
    onChange({
      oem: program?.oem ?? value.oem,
      programId,
      modelYear: program ? String(programModelYears[program.id]?.[0] ?? "all") : "all",
      partId: undefined,
    });
  };

  return (
    <div className={`grid gap-3 ${showPart ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search program hierarchy"
          placeholder="Search program, code, or platform"
          className="pl-9"
        />
      </div>
      <Select value={value.oem} onValueChange={selectOem}>
        <SelectTrigger aria-label="Select OEM">
          <SelectValue placeholder="OEM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All OEMs</SelectItem>
          {oems.map((oem) => (
            <SelectItem key={oem} value={oem}>
              {oem}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.programId} onValueChange={selectProgram}>
        <SelectTrigger aria-label="Select program or model">
          <SelectValue placeholder="Program / model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All programs / models</SelectItem>
          {visiblePrograms.map((program) => (
            <SelectItem key={program.id} value={program.id}>
              {program.name} · {program.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.modelYear}
        onValueChange={(modelYear) => onChange({ ...value, modelYear })}
      >
        <SelectTrigger aria-label="Select model year">
          <SelectValue placeholder="Model year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All model years</SelectItem>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              Model year {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showPart && (
        <Select
          value={value.partId ?? "all"}
          onValueChange={(partId) =>
            onChange({ ...value, partId: partId === "all" ? undefined : partId })
          }
        >
          <SelectTrigger aria-label="Select part or revision">
            <SelectValue placeholder="Part / revision" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All linked parts</SelectItem>
            {visibleParts.slice(0, 200).map((part) => (
              <SelectItem key={part.id} value={part.id}>
                {part.partNumber} · {part.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
