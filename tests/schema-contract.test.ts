import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrations = migrationFiles.map((file) => ({
  file,
  sql: readFileSync(join(migrationDirectory, file), "utf8"),
}));
const combinedSql = migrations.map(({ sql }) => sql).join("\n");

function createdTables(sql: string): readonly string[] {
  return [...sql.matchAll(/create table public\.([a-z0-9_]+)\s*\(/g)].map((match) => match[1]!);
}

function rowLevelSecurityTables(sql: string): ReadonlySet<string> {
  const protectedTables = new Set(
    [...sql.matchAll(/alter table public\.([a-z0-9_]+) enable row level security/g)].map(
      (match) => match[1]!,
    ),
  );
  const dynamicBlocks = sql.matchAll(
    /foreach table_name in array array\[([\s\S]*?)\]\s+loop\s+execute format\('alter table public\.%I enable row level security'/g,
  );
  for (const block of dynamicBlocks) {
    for (const name of block[1]?.matchAll(/'([a-z0-9_]+)'/g) ?? []) {
      protectedTables.add(name[1]!);
    }
  }
  return protectedTables;
}

describe("static database migration contract", () => {
  it("keeps migrations ordered, transactional, and free of destructive reset statements", () => {
    expect(migrationFiles).toEqual([
      "202608210001_foundation.sql",
      "202608210002_product.sql",
      "202608210003_ingestion_domains.sql",
      "202608240001_milestone10_enterprise_workflows.sql",
      "202608240002_milestone10_integrity_guards.sql",
    ]);
    for (const { file, sql } of migrations) {
      expect(sql.trimStart(), file).toMatch(/^begin;/);
      expect(sql.trimEnd(), file).toMatch(/commit;$/);
      expect(sql, file).not.toMatch(/\b(drop database|drop schema|truncate)\b/i);
    }
  });

  it("enables row-level security for every application table", () => {
    for (const { file, sql } of migrations) {
      const protectedTables = rowLevelSecurityTables(sql);
      for (const table of createdTables(sql)) {
        expect(protectedTables.has(table), `${file}: ${table} has no RLS enablement`).toBe(true);
      }
      expect(sql, file).not.toMatch(/disable row level security/i);
    }
  });

  it("pins search_path on every security-definer function", () => {
    for (const { file, sql } of migrations) {
      for (const match of sql.matchAll(/security definer/g)) {
        const followingDefinition = sql.slice(match.index, match.index + 120);
        expect(followingDefinition, `${file}: unpinned security-definer search_path`).toContain(
          "set search_path = ''",
        );
      }
    }
  });

  it("retains the critical tenant, immutability, and posting guards", () => {
    expect(combinedSql).toContain("organization_id uuid not null");
    expect(combinedSql).toContain("organization_id is immutable");
    expect(combinedSql).toContain("_org_immutable");
    expect(combinedSql).toContain("audit_events_immutable");
    expect(combinedSql).toContain("raw_ingestion_records_immutable");
    expect(combinedSql).toContain("ingestion_postings_immutable");
    expect(combinedSql).toContain("unique (organization_id, economic_event_key)");
    expect(combinedSql).toContain("only an approved same-tenant candidate may be posted");
    expect(combinedSql).toContain("recovery activation requires an effective approved agreement");
    expect(combinedSql).toContain("calculation requires an active recovery agreement");
    expect(combinedSql).toContain("mapping operation is not an approved declarative operation");
    expect(combinedSql).toContain("DCR transition requires document evidence");
    expect(combinedSql).toContain("approved part revision terms are immutable");
    expect(combinedSql).toContain("field mapping contains an unsupported key");
    expect(combinedSql).toContain(
      "connector endpoint host must be present in the exact host allowlist",
    );
    expect(combinedSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(combinedSql).not.toMatch(/with check\s*\(\s*true\s*\)/i);
  });

  it("keeps document objects private and server-signed", () => {
    expect(combinedSql).toMatch(
      /values\s*\(\s*'tract-private-documents',\s*'tract-private-documents',\s*false,/i,
    );
    expect(combinedSql).toContain("file_size_limit = excluded.file_size_limit");
    expect(combinedSql).not.toMatch(/create policy[\s\S]*?on storage\.objects/i);
    expect(combinedSql).toContain("short-lived signed URLs");
  });

  it("contains no credential-shaped values in migration text", () => {
    expect(combinedSql).not.toMatch(
      /service_role_key|supabase_service_role_key|bearer\s+[a-z0-9._-]+/i,
    );
    expect(combinedSql).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  });
});
