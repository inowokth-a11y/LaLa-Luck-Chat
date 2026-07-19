// รัน migration/seed เข้า Supabase Postgres ทีละไฟล์ (แต่ละไฟล์ห่อด้วย transaction)
// ใช้: node --env-file=.env.local scripts/db-migrate.mjs [--seed] [--dry]
//   (ไม่ใส่ flag = รัน supabase/migrations/*.sql, ใส่ --seed = รัน supabase/seed/*.sql)
//
// ต้องมี SUPABASE_DB_URL ใน .env.local (Dashboard → Project Settings → Database → Connection string)

import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const isSeed = process.argv.includes("--seed");
const isDry = process.argv.includes("--dry");

// อาร์กิวเมนต์ที่ไม่ใช่ flag = ตัวกรองชื่อไฟล์ (substring) เช่น `... 000_ 002_ 010_`
const filters = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const dir = join(ROOT, "supabase", isSeed ? "seed" : "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && !f.startsWith("_")) // ข้าม _bundle_*.sql
  .filter((f) => filters.length === 0 || filters.some((p) => f.includes(p)))
  .sort();

console.log(`📁 ${isSeed ? "SEED" : "MIGRATION"} — พบ ${files.length} ไฟล์ใน ${dir}`);
if (isDry) {
  files.forEach((f) => console.log("   -", f));
  process.exit(0);
}

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error("❌ ไม่พบ SUPABASE_DB_URL — ตั้งค่าใน .env.local ก่อน");
  process.exit(1);
}

const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await client.connect();

let failed = 0;
for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf-8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`✅ ${f}`);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    failed++;
    console.error(`❌ ${f}\n   → ${e.message}`);
  }
}

await client.end();
console.log(failed === 0 ? `\n✅ สำเร็จทั้งหมด ${files.length} ไฟล์` : `\n⚠️ ล้มเหลว ${failed}/${files.length} ไฟล์`);
process.exit(failed === 0 ? 0 : 1);
