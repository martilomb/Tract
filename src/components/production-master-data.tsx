import {
  ArrowLeft,
  ArrowUpDown,
  Download,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseProductionMasterDataWorkspace,
  type ProductionMasterDataWorkspace,
} from "@/domain/production-master-data";
import { isApplicationSession, type ApplicationSession } from "@/domain/application-session";

type AuthenticatedSession = Extract<ApplicationSession, { status: "authenticated" }>;
type WorkspaceView = "programs" | "parts";
type QueryState = {
  q: string;
  asOf: string;
  sort: string;
  direction: "asc" | "desc";
  offset: number;
  program?: string;
  part?: string;
};

export function ProductionMasterData({
  session,
  view,
  initialSearch,
  onSignedOut,
}: {
  session: AuthenticatedSession;
  view: WorkspaceView;
  initialSearch: string;
  onSignedOut: (session: ApplicationSession) => void;
}) {
  const [query, setQuery] = useState<QueryState>(() => initialQuery(view, initialSearch));
  const [searchDraft, setSearchDraft] = useState(query.q);
  const [workspace, setWorkspace] = useState<ProductionMasterDataWorkspace>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [panel, setPanel] = useState<"program" | "part" | "revision" | "alias">();
  const administrator = session.selectedMembership.role === "administrator";

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/master-data?${apiParams(view, query)}`, {
        credentials: "same-origin",
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(payload));
      setWorkspace(parseProductionMasterDataWorkspace(payload));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuery = useCallback(
    (next: QueryState) => {
      setQuery(next);
      const browserParams = browserQueryParams(next);
      window.history.replaceState(
        null,
        "",
        `${view === "programs" ? "/programs" : "/parts"}${browserParams.size ? `?${browserParams}` : ""}`,
      );
    },
    [view],
  );

  async function postAction(
    action: "create_program" | "create_part" | "create_alias",
    payload: unknown,
  ) {
    setSubmitting(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "The governed change was denied.");
      setPanel(undefined);
      setNotice("The governed master-data change was saved and audited.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The governed change was denied.");
    } finally {
      setSubmitting(false);
    }
  }

  const exportHref = `/api/master-data?${apiParams(view, query, true)}`;
  const selected = view === "programs" ? workspace?.selected_program : workspace?.selected_part;

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {session.selectedMembership.organizationName}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">
                {view === "programs" ? "Programs" : "Part Numbers"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Tenant-persisted canonical master data, effective records, linked recovery evidence,
                and governed provenance. Analysis is shown only where an approved persisted source
                exists.
              </p>
            </div>
            <nav aria-label="Production workspaces" className="flex flex-wrap gap-2">
              <Button asChild variant={view === "programs" ? "default" : "outline"}>
                <a href="/programs">Programs</a>
              </Button>
              <Button asChild variant={view === "parts" ? "default" : "outline"}>
                <a href="/parts">Part Numbers</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/contracts">Contracts</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/">Organization</a>
              </Button>
            </nav>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Role: {session.selectedMembership.role.replace("_", " ")}</span>
            <span>Source: Supabase tenant persistence</span>
            <span>As of: {query.asOf}</span>
            <span>Projection: program-parts-v1</span>
          </div>
        </header>

        {notice && (
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            {notice}
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Retry
            </Button>
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <form
              className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_170px_170px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                updateQuery({ ...query, q: searchDraft.trim(), offset: 0 });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="master-search">
                  Search {view === "programs" ? "programs" : "part numbers"}
                </Label>
                <Input
                  id="master-search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder={
                    view === "programs"
                      ? "Code, name, OEM, model, or alias"
                      : "Part, description, program, or alias"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="master-as-of">Effective as of</Label>
                <Input
                  id="master-as-of"
                  type="date"
                  value={query.asOf}
                  onChange={(event) =>
                    updateQuery({ ...query, asOf: event.target.value, offset: 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="master-sort">Sort by</Label>
                <select
                  id="master-sort"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={query.sort}
                  onChange={(event) =>
                    updateQuery({ ...query, sort: event.target.value, offset: 0 })
                  }
                >
                  {view === "programs" ? (
                    <>
                      <option value="name">Program name</option>
                      <option value="code">Program code</option>
                      <option value="updated_at">Last changed</option>
                    </>
                  ) : (
                    <>
                      <option value="part_number">Part number</option>
                      <option value="program">Program</option>
                      <option value="updated_at">Last changed</option>
                    </>
                  )}
                </select>
              </div>
              <Button type="submit" className="sm:self-end">
                <Search className="mr-2 h-4 w-4" aria-hidden /> Search
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateQuery({
                    ...query,
                    direction: query.direction === "asc" ? "desc" : "asc",
                    offset: 0,
                  })
                }
              >
                <ArrowUpDown className="mr-2 h-4 w-4" aria-hidden />
                {query.direction === "asc" ? "Ascending" : "Descending"}
              </Button>
              <Button asChild variant="outline">
                <a href={exportHref} download>
                  <Download className="mr-2 h-4 w-4" aria-hidden /> Export current scope
                </a>
              </Button>
              {administrator && view === "programs" && (
                <Button
                  type="button"
                  onClick={() => setPanel(panel === "program" ? undefined : "program")}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Governed new program
                </Button>
              )}
              {administrator && view === "parts" && (
                <Button
                  type="button"
                  onClick={() => setPanel(panel === "part" ? undefined : "part")}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden /> Governed new part
                </Button>
              )}
            </div>
          </div>

          {administrator && panel === "program" && workspace && (
            <ProgramForm
              workspace={workspace}
              submitting={submitting}
              onSubmit={(payload) => void postAction("create_program", payload)}
            />
          )}
          {administrator && panel === "part" && workspace && (
            <PartForm
              workspace={workspace}
              submitting={submitting}
              onSubmit={(payload) => void postAction("create_part", payload)}
            />
          )}
        </section>

        {loading ? (
          <section
            className="flex min-h-64 items-center justify-center rounded-xl border border-border bg-card"
            aria-busy
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> Loading authorized
              master data…
            </div>
          </section>
        ) : workspace ? (
          <>
            {selected ? (
              <MasterDetail
                view={view}
                workspace={workspace}
                administrator={administrator}
                panel={panel}
                submitting={submitting}
                setPanel={setPanel}
                postAction={postAction}
                backHref={backHref(view, query)}
              />
            ) : (
              <MasterTable
                view={view}
                workspace={workspace}
                query={query}
                updateQuery={updateQuery}
              />
            )}
          </>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground sm:p-6">
          <h2 className="font-semibold text-foreground">Analysis boundary</h2>
          <p className="mt-2">
            Approved recovery setup is grouped by settlement currency from persisted accruals.
            Actual recovery, forecast curves, variance, and break-even are intentionally absent
            until the ingestion/ledger and explainable forecasting slices produce approved
            calculation records. No production values are synthesized.
          </p>
        </section>

        <Button
          variant="ghost"
          className="min-h-11"
          onClick={async () => {
            const response = await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "same-origin",
            });
            const payload: unknown = await response.json();
            if (isApplicationSession(payload)) onSignedOut(payload);
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
        </Button>
      </div>
    </main>
  );
}

function MasterTable({
  view,
  workspace,
  query,
  updateQuery,
}: {
  view: WorkspaceView;
  workspace: ProductionMasterDataWorkspace;
  query: QueryState;
  updateQuery: (query: QueryState) => void;
}) {
  const count = view === "programs" ? workspace.program_count : workspace.part_count;
  const rows = view === "programs" ? workspace.programs : workspace.parts;
  const pageEnd = Math.min(query.offset + rows.length, count);
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
        <div>
          <h2 className="font-semibold">
            Authorized {view === "programs" ? "programs" : "part numbers"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {count === 0
              ? "No records match this scope."
              : `${query.offset + 1}–${pageEnd} of ${count}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={query.offset === 0}
            onClick={() => updateQuery({ ...query, offset: Math.max(0, query.offset - 50) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={pageEnd >= count}
            onClick={() => updateQuery({ ...query, offset: query.offset + 50 })}
          >
            Next
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No authorized records match the current search and effective date.
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          {view === "programs" ? (
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">OEM / model</th>
                  <th className="px-4 py-3">Model years</th>
                  <th className="px-4 py-3">Parts</th>
                  <th className="px-4 py-3">Approved recovery setup</th>
                  <th className="px-4 py-3">Evidence links</th>
                </tr>
              </thead>
              <tbody>
                {workspace.programs.map((program) => (
                  <tr
                    key={program.id}
                    className="border-t border-border align-top hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <a
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={detailHref("programs", query, program.id)}
                      >
                        {program.name}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">{program.code}</p>
                    </td>
                    <td className="px-4 py-3">
                      {program.oem_name ?? "—"}
                      <p className="text-xs text-muted-foreground">
                        {program.model_name ?? "No vehicle model"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{program.model_years.join(", ") || "—"}</td>
                    <td className="px-4 py-3">{program.part_count}</td>
                    <td className="px-4 py-3">
                      <PositionList positions={program.approved_recovery_by_currency} />
                    </td>
                    <td className="px-4 py-3">
                      {program.active_agreement_count} active agreement
                      {program.active_agreement_count === 1 ? "" : "s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Part number</th>
                  <th className="px-4 py-3">Program</th>
                  <th className="px-4 py-3">Effective revision</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approved recovery setup</th>
                  <th className="px-4 py-3">Evidence links</th>
                </tr>
              </thead>
              <tbody>
                {workspace.parts.map((part) => (
                  <tr key={part.id} className="border-t border-border align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <a
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={detailHref("parts", query, part.id)}
                      >
                        {part.part_number}
                      </a>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {part.description ?? "No description"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {part.program_name ?? "—"}
                      <p className="text-xs text-muted-foreground">{part.program_code ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      {part.current_revision
                        ? `${part.current_revision.revision_code} · ${part.current_revision.effective_from}`
                        : "No effective approved revision"}
                    </td>
                    <td className="px-4 py-3 capitalize">{part.status}</td>
                    <td className="px-4 py-3">
                      <PositionList positions={part.approved_recovery_by_currency} />
                    </td>
                    <td className="px-4 py-3">
                      {part.active_agreement_count} active agreement
                      {part.active_agreement_count === 1 ? "" : "s"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function MasterDetail({
  view,
  workspace,
  administrator,
  panel,
  submitting,
  setPanel,
  postAction,
  backHref,
}: {
  view: WorkspaceView;
  workspace: ProductionMasterDataWorkspace;
  administrator: boolean;
  panel: "program" | "part" | "revision" | "alias" | undefined;
  submitting: boolean;
  setPanel: (panel: "program" | "part" | "revision" | "alias" | undefined) => void;
  postAction: (
    action: "create_program" | "create_part" | "create_alias",
    payload: unknown,
  ) => Promise<void>;
  backHref: string;
}) {
  const program = workspace.selected_program;
  const part = workspace.selected_part;
  const entity = view === "programs" ? program : part;
  if (!entity) return null;
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b border-border bg-card p-4 sm:px-6">
        <div>
          <a
            href={backHref}
            className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to{" "}
            {view === "programs" ? "programs" : "part numbers"}
          </a>
          <h2 className="text-xl font-semibold">{program?.name ?? part?.part_number}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {program?.code ?? part?.description ?? "Canonical part record"}
          </p>
        </div>
        {administrator && (
          <div className="flex flex-wrap gap-2">
            {part && (
              <Button
                variant="outline"
                onClick={() => setPanel(panel === "revision" ? undefined : "revision")}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden /> Effective revision
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setPanel(panel === "alias" ? undefined : "alias")}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Approved alias
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-6 p-4 sm:p-6">
        {administrator && panel === "revision" && part && (
          <RevisionForm
            workspace={workspace}
            partId={part.id}
            programId={part.program_id}
            submitting={submitting}
            onSubmit={(payload) => void postAction("create_part", payload)}
          />
        )}
        {administrator && panel === "alias" && (
          <AliasForm
            entityType={view === "programs" ? "program" : "part"}
            entityId={entity.id}
            submitting={submitting}
            onSubmit={(payload) => void postAction("create_alias", payload)}
          />
        )}

        <section>
          <h3 className="font-semibold">Approved recovery setup</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exact persisted accrual amounts, grouped without mixing currencies.
          </p>
          <div className="mt-3">
            <PositionList
              positions={entity.approved_recovery_by_currency}
              empty="No active recovery setup is linked."
            />
          </div>
        </section>

        {program ? (
          <ProgramDetail program={program} />
        ) : part ? (
          <PartDetail part={part} asOf={workspace.as_of_date} />
        ) : null}
      </div>
    </section>
  );
}

function ProgramDetail({
  program,
}: {
  program: NonNullable<ProductionMasterDataWorkspace["selected_program"]>;
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="OEM" value={program.oem_name ?? "Not linked"} />
        <Fact label="Vehicle model" value={program.model_name ?? "Not linked"} />
        <Fact
          label="Lifecycle"
          value={[program.start_date, program.end_date].filter(Boolean).join(" → ") || "Not dated"}
        />
        <Fact label="Creation path" value={program.creation_path.replaceAll("_", " ")} />
      </section>
      <section>
        <h3 className="font-semibold">Model years and parts</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Model years: {program.model_years.map((year) => year.model_year).join(", ") || "none"}.{" "}
          {program.part_count} authorized part record{program.part_count === 1 ? "" : "s"}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {program.parts.map((part) => (
            <Button key={part.id} asChild variant="outline" size="sm">
              <a href={`/parts?part=${part.id}`}>{part.part_number}</a>
            </Button>
          ))}
        </div>
      </section>
      <EvidenceAndProvenance
        agreements={program.agreements}
        aliases={program.aliases}
        proposals={program.proposals}
        audit={program.audit}
      />
    </>
  );
}

function PartDetail({
  part,
  asOf,
}: {
  part: NonNullable<ProductionMasterDataWorkspace["selected_part"]>;
  asOf: string;
}) {
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <Fact label="Program" value={part.program_name ?? "Not linked"} />
        <Fact label="Part status" value={part.status} />
        <Fact label="Effective date" value={asOf} />
      </section>
      <section>
        <h3 className="font-semibold">Effective-dated revisions</h3>
        <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-border">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Revision</th>
                <th className="px-3 py-2">Effective period</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source DCR</th>
              </tr>
            </thead>
            <tbody>
              {part.revisions.map((revision) => {
                const current =
                  revision.effective_from <= asOf &&
                  (!revision.effective_to || revision.effective_to >= asOf);
                return (
                  <tr key={revision.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {revision.revision_code}
                      {current ? " · effective" : ""}
                    </td>
                    <td className="px-3 py-2">
                      {revision.effective_from} → {revision.effective_to ?? "open"}
                    </td>
                    <td className="px-3 py-2 capitalize">{revision.status}</td>
                    <td className="px-3 py-2">{revision.source_dcr_id ?? "None"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <EvidenceAndProvenance
        agreements={part.agreements}
        aliases={part.aliases}
        proposals={part.proposals}
        audit={part.audit}
      />
    </>
  );
}

function EvidenceAndProvenance({
  agreements,
  aliases,
  proposals,
  audit,
}: {
  agreements: NonNullable<ProductionMasterDataWorkspace["selected_part"]>["agreements"];
  aliases: NonNullable<ProductionMasterDataWorkspace["selected_part"]>["aliases"];
  proposals: NonNullable<ProductionMasterDataWorkspace["selected_part"]>["proposals"];
  audit: NonNullable<ProductionMasterDataWorkspace["selected_part"]>["audit"];
}) {
  return (
    <>
      <section>
        <h3 className="font-semibold">Contracts and evidence</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {agreements.length ? (
            agreements.map((agreement) => (
              <article key={agreement.id} className="rounded-lg border border-border p-4">
                <a
                  className="font-medium text-primary hover:underline"
                  href={`/contracts?agreement=${agreement.id}`}
                >
                  {agreement.agreement_number} · {agreement.title}
                </a>
                <p className="mt-2 text-sm">
                  {agreement.settlement_currency} {agreement.recoverable_cost}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Evidence: {agreement.evidence_reference ?? "No reviewed evidence reference"}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No authorized agreement evidence is linked.
            </p>
          )}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-3">
        <div>
          <h3 className="font-semibold">Approved aliases</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {aliases.length ? (
              aliases.map((alias) => (
                <li key={alias.id} className="rounded border border-border p-2">
                  {alias.alias}
                  <span className="block text-xs text-muted-foreground">
                    Approved {new Date(alias.approved_at).toLocaleString()}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">No aliases recorded.</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Governed provenance</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {proposals.length ? (
              proposals.map((proposal) => (
                <li key={proposal.id} className="rounded border border-border p-2 capitalize">
                  {proposal.status}
                  <span className="block text-xs normal-case text-muted-foreground">
                    {proposal.exception_reason}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                Provenance details require administrator access or no proposal exists.
              </li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Audit history</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {audit.length ? (
              audit.slice(0, 20).map((event) => (
                <li key={event.id} className="rounded border border-border p-2">
                  {event.action}
                  <span className="block text-xs text-muted-foreground">
                    {new Date(event.occurred_at).toLocaleString()} · event {event.id}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">
                Audit history is available to administrators and full-view users.
              </li>
            )}
          </ul>
        </div>
      </section>
    </>
  );
}

function ProgramForm({
  workspace,
  submitting,
  onSubmit,
}: {
  workspace: ProductionMasterDataWorkspace;
  submitting: boolean;
  onSubmit: (payload: unknown) => void;
}) {
  const [oemId, setOemId] = useState(workspace.oems[0]?.id ?? "");
  const models = useMemo(
    () => workspace.models.filter((model) => model.oem_id === oemId),
    [oemId, workspace.models],
  );
  return (
    <form
      className="mt-5 grid gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          oemId: data.get("oemId"),
          modelId: data.get("modelId"),
          programCode: data.get("programCode"),
          programName: data.get("programName"),
          modelYear: Number(data.get("modelYear")),
          effectiveFrom: data.get("effectiveFrom"),
          exceptionReason: data.get("exceptionReason"),
          provenanceReference: data.get("provenanceReference") || undefined,
        });
      }}
    >
      <FormHeading
        title="Governed program exception"
        copy="Search existing records first. This administrator-reviewed path records an immutable exception reason and provenance; it does not activate a recovery."
      />
      <SelectField
        label="OEM"
        name="oemId"
        value={oemId}
        onChange={setOemId}
        options={workspace.oems.map((oem) => ({ value: oem.id, label: oem.name }))}
      />
      <SelectField
        label="Vehicle model"
        name="modelId"
        options={models.map((model) => ({
          value: model.id,
          label: `${model.name} (${model.code})`,
        }))}
      />
      <TextField label="Program code" name="programCode" required />
      <TextField label="Program name" name="programName" required />
      <TextField label="Model year" name="modelYear" type="number" min="1900" max="2200" required />
      <TextField
        label="Effective from"
        name="effectiveFrom"
        type="date"
        defaultValue={today()}
        required
      />
      <TextField label="Provenance reference (optional)" name="provenanceReference" />
      <TextAreaField label="Exception reason" name="exceptionReason" required />
      <Button type="submit" disabled={submitting || models.length === 0} className="sm:col-span-2">
        {submitting ? "Saving…" : "Approve governed program"}
      </Button>
    </form>
  );
}

function PartForm({
  workspace,
  submitting,
  onSubmit,
}: {
  workspace: ProductionMasterDataWorkspace;
  submitting: boolean;
  onSubmit: (payload: unknown) => void;
}) {
  const [programId, setProgramId] = useState(workspace.program_choices[0]?.id ?? "");
  const years = workspace.model_years.filter((year) => year.program_id === programId);
  return (
    <form
      className="mt-5 grid gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          mode: "new_part",
          programId: data.get("programId"),
          modelYearId: data.get("modelYearId"),
          partNumber: data.get("partNumber"),
          partDescription: data.get("partDescription") || undefined,
          revisionCode: data.get("revisionCode"),
          revisionDescription: data.get("revisionDescription") || undefined,
          effectiveFrom: data.get("effectiveFrom"),
          exceptionReason: data.get("exceptionReason"),
          provenanceReference: data.get("provenanceReference") || undefined,
        });
      }}
    >
      <FormHeading
        title="Governed new part"
        copy="The canonical part and its first approved revision are created transactionally. Duplicate numbers or aliases fail without a partial record."
      />
      <SelectField
        label="Program"
        name="programId"
        value={programId}
        onChange={setProgramId}
        options={workspace.program_choices.map((program) => ({
          value: program.id,
          label: `${program.name} (${program.code})`,
        }))}
      />
      <SelectField
        label="Model year"
        name="modelYearId"
        options={years.map((year) => ({ value: year.id, label: String(year.model_year) }))}
      />
      <TextField label="Part number" name="partNumber" required />
      <TextField label="Description (optional)" name="partDescription" />
      <TextField label="Initial revision" name="revisionCode" required />
      <TextField label="Revision description (optional)" name="revisionDescription" />
      <TextField
        label="Effective from"
        name="effectiveFrom"
        type="date"
        defaultValue={today()}
        required
      />
      <TextField label="Provenance reference (optional)" name="provenanceReference" />
      <TextAreaField label="Exception reason" name="exceptionReason" required />
      <Button type="submit" disabled={submitting || years.length === 0} className="sm:col-span-2">
        {submitting ? "Saving…" : "Approve part and revision"}
      </Button>
    </form>
  );
}

function RevisionForm({
  workspace,
  partId,
  programId,
  submitting,
  onSubmit,
}: {
  workspace: ProductionMasterDataWorkspace;
  partId: string;
  programId: string | null;
  submitting: boolean;
  onSubmit: (payload: unknown) => void;
}) {
  const years = workspace.model_years.filter((year) => year.program_id === programId);
  return (
    <form
      className="grid gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          mode: "new_revision",
          programId,
          modelYearId: data.get("modelYearId"),
          partId,
          revisionCode: data.get("revisionCode"),
          revisionDescription: data.get("revisionDescription") || undefined,
          effectiveFrom: data.get("effectiveFrom"),
          exceptionReason: data.get("exceptionReason"),
          provenanceReference: data.get("provenanceReference") || undefined,
        });
      }}
    >
      <FormHeading
        title="New effective-dated revision"
        copy="Approval closes the current revision on the preceding day and creates the new application atomically. Existing contracts retain their exact historical revision link."
      />
      <SelectField
        label="Model year"
        name="modelYearId"
        options={years.map((year) => ({ value: year.id, label: String(year.model_year) }))}
      />
      <TextField label="Revision code" name="revisionCode" required />
      <TextField
        label="Effective from"
        name="effectiveFrom"
        type="date"
        defaultValue={tomorrow()}
        required
      />
      <TextField label="Revision description (optional)" name="revisionDescription" />
      <TextField label="Provenance reference (optional)" name="provenanceReference" />
      <TextAreaField label="Exception reason" name="exceptionReason" required />
      <Button
        type="submit"
        disabled={submitting || !programId || years.length === 0}
        className="sm:col-span-2"
      >
        {submitting ? "Saving…" : "Approve effective revision"}
      </Button>
    </form>
  );
}

function AliasForm({
  entityType,
  entityId,
  submitting,
  onSubmit,
}: {
  entityType: "program" | "part";
  entityId: string;
  submitting: boolean;
  onSubmit: (payload: unknown) => void;
}) {
  return (
    <form
      className="grid gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          entityType,
          entityId,
          alias: data.get("alias"),
          reason: data.get("reason"),
          provenanceReference: data.get("provenanceReference") || undefined,
        });
      }}
    >
      <FormHeading
        title="Approved alias"
        copy="Aliases resolve imported or historical identifiers to this canonical record. Approved aliases are append-only and keep provenance."
      />
      <TextField label="Alias" name="alias" required />
      <TextField label="Provenance reference (optional)" name="provenanceReference" />
      <TextAreaField label="Reason" name="reason" required />
      <Button type="submit" disabled={submitting} className="sm:col-span-2">
        {submitting ? "Saving…" : "Approve alias"}
      </Button>
    </form>
  );
}

function FormHeading({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="sm:col-span-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}
function TextField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`p3-${name}`}>{label}</Label>
      <Input
        id={`p3-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        min={min}
        max={max}
      />
    </div>
  );
}
function TextAreaField({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={`p3-${name}`}>{label}</Label>
      <Textarea id={`p3-${name}`} name={name} required={required} rows={3} />
    </div>
  );
}
function SelectField({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`p3-${name}`}>{label}</Label>
      <select
        id={`p3-${name}`}
        name={name}
        required
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        defaultValue={value === undefined ? options[0]?.value : undefined}
      >
        {options.length ? (
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        ) : (
          <option value="">No authorized choices</option>
        )}
      </select>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm capitalize">{value}</p>
    </div>
  );
}
function PositionList({
  positions,
  empty = "No active setup",
}: {
  positions: { currency: string; approved_recoverable_cost: string }[];
  empty?: string;
}) {
  return positions.length ? (
    <ul className="space-y-1">
      {positions.map((position) => (
        <li key={position.currency} className="font-medium">
          {position.currency} {position.approved_recoverable_cost}
        </li>
      ))}
    </ul>
  ) : (
    <span className="text-muted-foreground">{empty}</span>
  );
}

function initialQuery(view: WorkspaceView, raw: string): QueryState {
  const params = new URLSearchParams(raw);
  return {
    q: params.get("q") ?? "",
    asOf: params.get("asOf") ?? today(),
    sort: params.get("sort") ?? (view === "programs" ? "name" : "part_number"),
    direction: params.get("direction") === "desc" ? "desc" : "asc",
    offset: Math.max(0, Number(params.get("offset") ?? 0) || 0),
    program: params.get("program") ?? undefined,
    part: params.get("part") ?? undefined,
  };
}
function apiParams(view: WorkspaceView, query: QueryState, csv = false): string {
  const params = browserQueryParams(query);
  params.set("view", view);
  params.set("limit", "50");
  if (csv) params.set("format", "csv");
  return params.toString();
}
function browserQueryParams(query: QueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  params.set("asOf", query.asOf);
  params.set("sort", query.sort);
  params.set("direction", query.direction);
  if (query.offset) params.set("offset", String(query.offset));
  if (query.program) params.set("program", query.program);
  if (query.part) params.set("part", query.part);
  return params;
}
function detailHref(view: WorkspaceView, query: QueryState, id: string): string {
  const params = browserQueryParams(query);
  params.set(view === "programs" ? "program" : "part", id);
  return `${view === "programs" ? "/programs" : "/parts"}?${params}`;
}
function backHref(view: WorkspaceView, query: QueryState): string {
  const next = { ...query, program: undefined, part: undefined };
  const params = browserQueryParams(next);
  return `${view === "programs" ? "/programs" : "/parts"}?${params}`;
}
function responseMessage(value: unknown): string {
  return typeof value === "object" && value && "message" in value
    ? String(value.message)
    : "Program and part master data could not be loaded.";
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function tomorrow(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
