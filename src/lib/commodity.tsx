import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { programs as allPrograms, parts as allParts, type Part } from "./demo-data";

export const COMMODITIES = [
  "Wire Harness",
  "SPDJB",
  "Inverter",
  "Body Control Module (BCM)",
  "Infotainment Head Unit",
  "Battery Management System",
  "ADAS Camera Module",
  "Power Distribution Module",
  "HVAC Controller",
  "Telematics Control Unit",
] as const;

export type Commodity = (typeof COMMODITIES)[number] | "all";

// Explicit synthetic part-to-commodity relationships for local demonstration data.
// Programs inherit every commodity represented by their linked parts; a program is
// never assigned one exclusive commodity.
const PART_COMMODITY_RELATIONSHIPS = new Map(
  allParts.map((part, index) => [part.id, COMMODITIES[index % COMMODITIES.length]] as const),
);

export function partCommodity(part: Part): (typeof COMMODITIES)[number] {
  return PART_COMMODITY_RELATIONSHIPS.get(part.id) ?? COMMODITIES[0];
}

type Ctx = {
  commodity: Commodity;
  setCommodity: (c: Commodity) => void;
};

const CommodityContext = createContext<Ctx | null>(null);

export function CommodityProvider({ children }: { children: ReactNode }) {
  const [commodity, setCommodity] = useState<Commodity>("all");
  return (
    <CommodityContext.Provider value={{ commodity, setCommodity }}>
      {children}
    </CommodityContext.Provider>
  );
}

export function useCommodity() {
  const c = useContext(CommodityContext);
  if (!c) throw new Error("useCommodity must be used within CommodityProvider");
  return c;
}

/**
 * Returns commodity-filtered slices of the explicit demo dataset. When commodity is
 * "all", the full dataset is returned. When a specific commodity is selected,
 * parts are filtered by their explicit relationship and a program is included
 * when at least one linked part matches. Downstream summary data follows that set.
 */
export function useDataset() {
  const { commodity } = useCommodity();
  return useMemo(() => {
    if (commodity === "all") {
      return {
        programs: allPrograms,
        parts: allParts,
      };
    }
    const parts = allParts.filter((part) => partCommodity(part) === commodity);
    const ids = new Set(parts.map((part) => part.programId));
    const programs = allPrograms.filter((program) => ids.has(program.id));
    return {
      programs,
      parts,
    };
  }, [commodity]);
}
