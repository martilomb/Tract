import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  programs as allPrograms,
  parts as allParts,
  oemSummary as allOemSummary,
  scenarioInsights as allInsights,
  overRecoveryBreakdown as allOverBreakdown,
  overRecoveryTimeline as allOverTimeline,
  type Program,
} from "./demo-data";

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

// Deterministic assignment of commodities to base programs.
export function programCommodity(p: Program): (typeof COMMODITIES)[number] {
  const idx = allPrograms.findIndex((x) => x.id === p.id);
  return COMMODITIES[(idx >= 0 ? idx : 0) % COMMODITIES.length];
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
 * programs are filtered by their assigned commodity, and downstream data
 * (parts, insights, OEM summary, over-recovery pool) is scoped accordingly.
 */
export function useDataset() {
  const { commodity } = useCommodity();
  return useMemo(() => {
    if (commodity === "all") {
      return {
        programs: allPrograms,
        parts: allParts,
        oemSummary: allOemSummary,
        scenarioInsights: allInsights,
        overRecoveryBreakdown: allOverBreakdown,
        overRecoveryTimeline: allOverTimeline,
      };
    }
    const programs = allPrograms.filter((p) => programCommodity(p) === commodity);
    const ids = new Set(programs.map((p) => p.id));
    const parts = allParts.filter((p) => ids.has(p.programId));
    const oemsSet = new Set(programs.map((p) => p.oem));
    const oemSummary = allOemSummary.filter((o) => oemsSet.has(o.oem));
    const scenarioInsights = allInsights.filter((i) => ids.has(i.programId));
    const ratio = allPrograms.length ? programs.length / allPrograms.length : 0;
    const overRecoveryBreakdown = allOverBreakdown.map((b) => ({
      ...b,
      amount: Math.round(b.amount * ratio),
    }));
    const overRecoveryTimeline = allOverTimeline.map((t) => ({
      ...t,
      quarter: +(t.quarter * ratio).toFixed(2),
      cumulative: +(t.cumulative * ratio).toFixed(2),
    }));
    return {
      programs,
      parts,
      oemSummary,
      scenarioInsights,
      overRecoveryBreakdown,
      overRecoveryTimeline,
    };
  }, [commodity]);
}
