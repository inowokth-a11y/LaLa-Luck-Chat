// คำทำนายแรกพบ — วัตถุดิบพื้นดวง ฿0 (เทมเพลตธาตุ + จังหวะ 7 วัน engine ล้วน)
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFirstReading,
  weekOutlook,
  ELEMENT_PERSONA,
  MISSING_GROWTH,
  FIRST_READING_CAVEAT,
} from "../lib/engine/first-reading";

const ELS = ["Fire", "Water", "Earth", "Metal", "Wood"] as const;

test("ครบทุกธาตุ: บุคลิก/พลัง/ระวัง/อาชีพ ≥3 แนว + จุดฝึกเมื่อขาด", () => {
  for (const el of ELS) {
    const p = ELEMENT_PERSONA[el];
    assert.ok(p.นิสัยเด่น.length > 10 && p.พลังพิเศษ.length > 10 && p.ระวังนิสัย.length > 5);
    assert.ok(p.อาชีพแนว.length >= 3);
    assert.ok(MISSING_GROWTH[el].includes("ฝึก"), "จุดฝึกต้องเป็นมุมพัฒนา ไม่ใช่คำตำหนิ");
  }
});

test("weekOutlook — 7 วันติดเริ่มวันนี้ (เวลาไทย) คะแนนจาก wuXingScore จริง", () => {
  const w = weekOutlook("Fire", ["Water"]);
  assert.equal(w.รายวัน.length, 7);
  const bkkToday = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  assert.equal(w.รายวัน[0].dateISO, bkkToday);
  for (const d of w.รายวัน) assert.ok(d.คะแนน >= -2 && d.คะแนน <= 2);
  // ผู้ใช้ไฟขาดน้ำ: วันจันทร์/ศุกร์ (ธาตุน้ำ) ต้องเป็น Productive Clash +2 = วันเป็นมิตร
  const monday = w.รายวัน.find((d) => d.วัน === "จันทร์");
  assert.equal(monday?.คะแนน, 2);
});

test("buildFirstReading — โครงครบ + จุดฝึกอิงธาตุที่ขาดจริง", () => {
  const r = buildFirstReading("Fire", ["Water"]);
  assert.equal(r.ธาตุเด่น, "ไฟ");
  assert.equal(r.จุดที่ควรฝึก.length, 1);
  assert.ok(r.จุดที่ควรฝึก[0].includes("น้ำ"));
  assert.equal(r.สัปดาห์นี้.รายวัน.length, 7);
});

test("ห้ามคำคลินิก/คำฟันธงในทุกข้อความ + caveat ประกาศว่าเป็นแนวทาง", () => {
  const all = JSON.stringify(ELEMENT_PERSONA) + JSON.stringify(MISSING_GROWTH) + FIRST_READING_CAVEAT;
  for (const w of ["โรค", "วินิจฉัย", "ซึมเศร้า", "ผิดปกติ", "ชะตาขาด", "ดวงแตก"]) {
    assert.ok(!all.includes(w), `ห้ามมีคำ "${w}"`);
  }
  assert.ok(FIRST_READING_CAVEAT.includes("ไม่ใช่คำตัดสิน"));
  assert.ok(!/[Ѐ-ӿ]/.test(all), "ห้าม Cyrillic homoglyph");
});
