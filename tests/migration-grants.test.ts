// กติกาสิทธิ์ตารางใน migration (20 ต.ค. 2569) — ดู supabase/migrations/047_explicit_table_grants.sql
// ตั้งแต่ 30 ต.ค. 2569 Supabase ไม่ให้สิทธิ์ Data API กับตารางใหม่อัตโนมัติ → ตารางที่สร้างใน migration
// 048 ขึ้นไปต้องมี GRANT ให้ anon / authenticated / service_role ในไฟล์เดียวกันเสมอ
// ไม่งั้นฟีเจอร์ใหม่จะได้ "permission denied" ทันทีที่ขึ้น prod (รวม service role)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "supabase", "migrations");
const ROLES = ["anon", "authenticated", "service_role"] as const;

function migrationNumber(file: string): number {
  const m = /^(\d+)/.exec(file);
  return m ? Number(m[1]) : -1;
}

/** ชื่อตารางที่ไฟล์สร้าง (ตัด schema public. และเครื่องหมายคำพูดออก) */
export function createdTables(sql: string): string[] {
  const out: string[] = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  for (const m of sql.matchAll(re)) out.push(m[1].toLowerCase());
  return out;
}

/** role ที่ได้ GRANT บนตารางนี้ในไฟล์ (รองรับ grant ... on [table] x, y to a, b) */
export function grantedRoles(sql: string, table: string): Set<string> {
  const roles = new Set<string>();
  const re = /grant\s+[^;]*?\s+on\s+(?:table\s+)?([^;]*?)\s+to\s+([^;]+);/gi;
  for (const m of sql.matchAll(re)) {
    const targets = m[1].split(",").map((s) => s.trim().replace(/"/g, "").replace(/^public\./i, "").toLowerCase());
    if (!targets.includes(table)) continue;
    for (const r of m[2].split(",")) roles.add(r.trim().toLowerCase());
  }
  return roles;
}

test("047 ประกาศสิทธิ์ย้อนหลังครบทุกตาราง/sequence ทั้ง 3 role และไม่ตั้ง default privileges", () => {
  const sql = readFileSync(join(DIR, "047_explicit_table_grants.sql"), "utf8").toLowerCase();
  assert.match(sql, /on all tables in schema public\s+to anon, authenticated, service_role/);
  assert.match(sql, /on all sequences in schema public\s+to anon, authenticated, service_role/);
  assert.ok(!/^\s*alter\s+default\s+privileges/m.test(sql), "ห้ามย้อนการเปลี่ยนแปลงของ Supabase ด้วย default privileges");
  assert.ok(!/grant\s+all\b/.test(sql), "ระบุสิทธิ์รายตัว — ALL จะให้ MAINTAIN เกินของเดิมบน Postgres 17");
});

test("🔴 migration 048+ ที่สร้างตาราง ต้อง GRANT ให้ครบ 3 role ในไฟล์เดียวกัน", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".sql") && migrationNumber(f) >= 48);
  for (const f of files) {
    const sql = readFileSync(join(DIR, f), "utf8");
    for (const t of createdTables(sql)) {
      const got = grantedRoles(sql, t);
      for (const r of ROLES) assert.ok(got.has(r), `${f}: ตาราง ${t} ยังไม่ได้ GRANT ให้ ${r}`);
    }
  }
});

test("ตัวตรวจจับ create table / grant ทำงานถูก (กันเทสต์ผ่านแบบหลอก)", () => {
  const sql = `create table if not exists public.foo_e (id int);
    create table "bar_e" (id int);
    grant select on public.foo_e to anon;
    grant select, insert, update, delete on table public.foo_e, bar_e to authenticated, service_role;`;
  assert.deepEqual(createdTables(sql), ["foo_e", "bar_e"]);
  assert.deepEqual([...grantedRoles(sql, "foo_e")].sort(), ["anon", "authenticated", "service_role"]);
  assert.deepEqual([...grantedRoles(sql, "bar_e")].sort(), ["authenticated", "service_role"]);
});
