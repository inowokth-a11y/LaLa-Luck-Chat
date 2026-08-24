// Golden parity test — Logic 3: auspicious.ts + kalayoke.ts เทียบกับ engine Python

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { checkAuspiciousTime, bestTimeToday } from "../lib/engine/auspicious";
import {
  toChulasakarat,
  calculateKalaYoke,
  checkDayKalaYoke,
  checkCombinedAuspiciousTime,
  checkFullAuspiciousTimeNoLagna,
} from "../lib/engine/kalayoke";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "timing.fixture.json"), "utf-8"));
const A = fx.auspicious;
const K = fx.kalayoke;

test("ubakong — specific times", () => {
  assert.deepEqual(checkAuspiciousTime("จันทร์", { hour: 7, minute: 0 }), A.mon_0700);
  assert.deepEqual(checkAuspiciousTime("อาทิตย์", { hour: 16, minute: 0 }), A.sun_1600);
  assert.deepEqual(checkAuspiciousTime("เสาร์", { hour: 9, minute: 0 }), A.sat_0900);
  assert.deepEqual(checkAuspiciousTime("พุธ", { hour: 20, minute: 0 }), A.wed_2000_night);
  assert.deepEqual(checkAuspiciousTime("อาทิตย์", { hour: 7, minute: 0 }), A.sun_0700);
});

test("ubakong — best/worst time of day", () => {
  assert.deepEqual(bestTimeToday("จันทร์"), A.best_mon);
  assert.deepEqual(bestTimeToday("อาทิตย์"), A.best_sun);
});

test("kala yoke — calculate จ.ศ. 1369 (verified vs Wikipedia)", () => {
  assert.deepEqual(calculateKalaYoke(1369), K.calc_1369);
});

test("kala yoke — CE/BE conversion", () => {
  assert.equal(toChulasakarat({ ce_year: 2007 }), K.chula_ce_2007);
  assert.equal(toChulasakarat({ be_year: 2550 }), K.chula_be_2550);
  assert.equal(toChulasakarat({ be_year: 2569 }), K.cs_2569);
});

test("kala yoke — check day (จันทร์, จ.ศ. 1388)", () => {
  assert.deepEqual(checkDayKalaYoke("จันทร์", K.cs_2569), K.day_mon_2569);
});

test("kala yoke — combined (Kala Yoke + Ubakong)", () => {
  assert.deepEqual(
    checkCombinedAuspiciousTime("จันทร์", { hour: 9, minute: 0 }, K.cs_2569),
    K.combined_mon_0900
  );
});

test("kala yoke — full without lagna (graceful skip)", () => {
  assert.deepEqual(
    checkFullAuspiciousTimeNoLagna("จันทร์", { hour: 9, minute: 0 }, K.cs_2569),
    K.full_no_lagna_mon_0900
  );
});

// ---- ชั้นข้อมูลส่วนตัว/รายหมวด (ผู้ใช้สั่ง 22 ส.ค. 2569) ----
import { rankAuspiciousDays, ACTIVITY_FIELDS, ACTIVITIES } from "../lib/engine/timing";
import { kalakiniRuledSigns, getMoonSign } from "../lib/engine/daily";

test("timing personal — ไม่กรอกข้อมูลเสริม = ผลเท่าเดิมเป๊ะ (ไม่มี personalNotes)", () => {
  const base = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-14", emphasis: "thanchai" });
  const explicit = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-14", emphasis: "thanchai", birthDate: null, refNumber: "", businessName: null });
  assert.deepEqual(base, explicit);
  assert.ok(base.days.every((d) => d.personalNotes === undefined));
});

test("timing personal — วันเกิดเปิดชั้นกาลกิณี+ธาตุ: notes ตรง engine จริง + caveat บอกชั้นที่รวม", () => {
  const birthDate = "1986-10-07"; // อังคาร
  const r = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-10-15", emphasis: "any", birthDate });
  assert.ok(r.caveat.includes("กาลกิณี"), "caveat ต้องบอกว่ารวมชั้นกาลกิณีแล้ว");
  assert.ok(r.days.every((d) => Array.isArray(d.personalNotes)));
  // wiring กาลกิณี: วันที่ engine บอกว่าจันทร์จรเข้าเรือนกาลกิณี ต้องมีโน้ตเตือน (และกลับกัน)
  const kk = kalakiniRuledSigns("อังคาร")!;
  assert.ok(kk.signs.length > 0);
  let checked = 0;
  for (const d of r.days) {
    const [y, m, day] = d.dateISO.split("-").map(Number);
    const moon = getMoonSign({ year: y, month: m, day, hour: 5 });
    const expectHit = kk.signs.includes(moon);
    const hasNote = (d.personalNotes ?? []).some((n) => n.includes("กาลกิณี"));
    assert.equal(hasNote, expectHit, `${d.dateISO} moon=${moon}`);
    if (expectHit) checked++;
  }
  assert.ok(checked > 0, "ช่วง 45 วันต้องมีวันจันทร์จรเข้าเรือนกาลกิณีบ้าง (จันทร์ครบรอบ ~27 วัน)");
});

test("timing personal — เกิดวันศุกร์ (ราหู) ตรวจกาลกิณีไม่ได้ → ไม่มีโน้ตกาลกิณี + caveat บอกตรง", () => {
  // 1986-10-10 = วันศุกร์
  const r = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-30", emphasis: "any", birthDate: "1986-10-10" });
  assert.ok(r.days.every((d) => !(d.personalNotes ?? []).some((n) => n.includes("กาลกิณี"))));
  assert.ok(r.caveat.includes("ราหู"));
});

test("timing personal — ธาตุวัตถุ/ชื่อกิจการเข้าเป็นโน้ต + ACTIVITY_FIELDS ครบทุกหมวด", () => {
  for (const a of ACTIVITIES) assert.ok(ACTIVITY_FIELDS[a.key] !== undefined, `ไม่มี fields ของ ${a.key}`);
  const r = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-14", emphasis: "thanchai", refNumber: "จง 6266", refLabel: "รถ" });
  assert.ok(r.days.some((d) => (d.personalNotes ?? []).some((n) => n.includes("รถ"))), "ต้องมีวันที่ธาตุวันมีผลกับรถ");
  const rn = rankAuspiciousDays({ fromISO: "2026-09-01", toISO: "2026-09-14", emphasis: "thanchai", businessName: "รุ่งเรือง" });
  assert.ok(rn.caveat.includes("เลขกลุ่มอักษร"), "ใช้ธาตุชื่อ → caveat ที่มาตาราง (ทาง ค) ต้องติดมา");
});
