import { useSyncExternalStore } from "react";

import {
  createPartRevisionProposal,
  createProgramProposal,
  type MasterDataProposal,
  type PartRevisionProposalInput,
  type ProgramProposalInput,
} from "@/domain/master-data-proposals";
import { parts, programs } from "@/lib/demo-data";

const STORAGE_KEY = "tract-demo-master-data-proposals";
const CHANGE_EVENT = "tract-demo-master-data-proposals-change";
const SERVER_PROPOSALS: readonly MasterDataProposal[] = Object.freeze([]);
let cachedSerialized: string | null | undefined;
let cachedProposals: readonly MasterDataProposal[] = SERVER_PROPOSALS;

function storedProposals(value: unknown): readonly MasterDataProposal[] {
  return Array.isArray(value)
    ? Object.freeze(
        value.filter(
          (proposal): proposal is MasterDataProposal =>
            !!proposal &&
            typeof proposal === "object" &&
            (proposal as MasterDataProposal).status === "pending_review" &&
            ((proposal as MasterDataProposal).kind === "program" ||
              (proposal as MasterDataProposal).kind === "part_revision"),
        ),
      )
    : SERVER_PROPOSALS;
}

export function readDemoMasterDataProposals(): readonly MasterDataProposal[] {
  if (typeof window === "undefined") return SERVER_PROPOSALS;
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  if (serialized === cachedSerialized) return cachedProposals;
  try {
    cachedProposals = storedProposals(JSON.parse(serialized ?? "[]"));
  } catch {
    cachedProposals = SERVER_PROPOSALS;
  }
  cachedSerialized = serialized;
  return cachedProposals;
}

function persist(proposals: readonly MasterDataProposal[]): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(proposals);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  cachedSerialized = serialized;
  cachedProposals = Object.freeze([...proposals]);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function proposalMetadata(proposals: readonly MasterDataProposal[]) {
  return {
    id: `demo-proposal-${Date.now()}-${proposals.length + 1}`,
    createdAt: new Date().toISOString(),
  };
}

export function saveProgramProposal(
  input: Omit<ProgramProposalInput, "id" | "createdAt">,
): MasterDataProposal {
  const proposals = readDemoMasterDataProposals();
  const proposal = createProgramProposal(
    { ...input, ...proposalMetadata(proposals) },
    {
      existingPrograms: programs,
      existingParts: parts,
      proposals,
    },
  );
  persist([...proposals, proposal]);
  return proposal;
}

export function savePartRevisionProposal(
  input: Omit<PartRevisionProposalInput, "id" | "createdAt">,
): MasterDataProposal {
  const proposals = readDemoMasterDataProposals();
  const proposal = createPartRevisionProposal(
    { ...input, ...proposalMetadata(proposals) },
    {
      existingPrograms: programs,
      existingParts: parts,
      proposals,
    },
  );
  persist([...proposals, proposal]);
  return proposal;
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useDemoMasterDataProposals(): readonly MasterDataProposal[] {
  return useSyncExternalStore(subscribe, readDemoMasterDataProposals, () => SERVER_PROPOSALS);
}
