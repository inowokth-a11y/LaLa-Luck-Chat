// ตรวจว่า migration + seed รันครบจริง (Phase 1 verify)
// รันหลังตั้ง .env.local + รัน migration 001-015 + seed 01-06 แล้ว:
//   node --env-file=.env.local scripts/verify-db.mjs
//
// คาดหวัง: master_energy_cards=100, dream_symbols=457, dream_psychology_themes=50

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ก่อน");
  console.error("   ลอง: node --env-file=.env.local scripts/verify-db.mjs");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const expected = {
  master_energy_cards: 100,
  dream_symbols: 457,
  dream_psychology_themes: 50,
};

let ok = true;
for (const [table, want] of Object.entries(expected)) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`❌ ${table}: query error — ${error.message}`);
    ok = false;
    continue;
  }
  const pass = count === want;
  ok = ok && pass;
  console.log(`${pass ? "✅" : "❌"} ${table}: ${count} (คาดหวัง ${want})`);
}

console.log(ok ? "\n✅ ฐานข้อมูลพร้อม" : "\n❌ ฐานข้อมูลยังไม่ครบ — ตรวจ migration/seed อีกครั้ง");
process.exit(ok ? 0 : 1);
