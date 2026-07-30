// Logic 20 — unit test ของ lib/engine/compatibility.ts
//
// ⚠️ **ไม่ใช่ golden parity test** ต่างจากเทสต์อื่นในโฟลเดอร์นี้ — Logic 20 ไม่มี engine
//    ฝั่ง Python ให้เทียบ (ต้นฉบับคือ JS ใน compatibility_dashboard.html) เทสต์นี้จึงคุม
//    "พฤติกรรมที่ตั้งใจ" ไม่ใช่ "ตรงกับภาษาต้นทาง"

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggregateScore,
  entityElementFromNumber,
  scoreEntities,
  relationColorVar,
  ENTITY_ICONS,
  ENTITY_LABELS,
  type Entity,
  type EntityType,
} from "../lib/engine/compatibility";
import { wuXingScore, type Element5 } from "../lib/engine/element";

const ent = (over: Partial<Entity> = {}): Entity => ({
  id: 1,
  name: "บ้านเลขที่ 47",
  type: "house",
  element: "Earth",
  shared: false,
  ...over,
});

test("ธาตุวัตถุจากเลข — ใช้ตาราง Logic 2 ที่ผ่าน golden test แล้ว", () => {
  // 47 → 4+7=11 → 1+1=2 → Earth
  assert.equal(entityElementFromNumber(47), "Earth");
  // 82 → 8+2=10 → 1+0=1 → Fire
  assert.equal(entityElementFromNumber(82), "Fire");
});

test("ธาตุจากเลขไม่มีวันเป็น 'ทอง' (ข้อจำกัดของตารางต้นฉบับ ไม่ใช่บั๊ก)", () => {
  const got = new Set<string>();
  for (let n = 0; n <= 500; n++) got.add(entityElementFromNumber(n));
  assert.ok(!got.has("Metal"), `ไม่ควรมี Metal แต่ได้ ${[...got].join(",")}`);
  assert.deepEqual([...got].sort(), ["Earth", "Fire", "Water", "Wood"]);
});

test("ยังไม่มี entity → ไม่มีคะแนน ไม่ใช่ 0 (0 แปลว่า 'แย่มาก' คนละความหมาย)", () => {
  const r = aggregateScore([], "Fire", []);
  assert.equal(r.score, null);
  assert.equal(r.tone, "empty");
});

test("entity ที่ส่งเสริมล้วน → คะแนนสูง", () => {
  // ทาง "ค" (2026-07-30): ไม้ให้กำเนิดไฟ = บำรุงเรา +2 เต็ม → 100
  const r = aggregateScore([ent({ element: "Wood" })], "Fire", []);
  assert.equal(r.score, 100);
  assert.equal(r.tone, "good");
});

test("ทาง ค: entity ที่เราให้กำเนิด (ผู้ให้) = +1 → 75 ไม่ใช่คะแนนเต็ม", () => {
  // ไฟให้กำเนิดดิน = ดีแบบผู้ให้ +1 → (1+2)/4×100 = 75
  const r = aggregateScore([ent({ element: "Earth" })], "Fire", []);
  assert.equal(r.score, 75);
});

test("entity ที่พิฆาตล้วน → คะแนนต่ำ", () => {
  // ไฟพิฆาตทอง (dist 2) = -2 → 0
  const r = aggregateScore([ent({ element: "Metal" })], "Fire", []);
  assert.equal(r.score, 0);
  assert.equal(r.tone, "bad");
});

test("Productive Clash — ธาตุที่ขาดพลิกคะแนนจากพิฆาตเป็นส่งเสริม", () => {
  const without = aggregateScore([ent({ element: "Metal" })], "Fire", []);
  const withMissing = aggregateScore([ent({ element: "Metal" })], "Fire", ["Metal"]);
  assert.equal(without.score, 0);
  assert.equal(withMissing.score, 100, "ธาตุที่ขาดควรกลายเป็นยา ไม่ใช่พิษ");
});

test("shared ถ่วงน้ำหนัก 1.5 เท่า — ตัวที่อยู่ด้วยทุกวันมีผลมากกว่า", () => {
  const good: Entity = ent({ id: 1, element: "Wood" }); // +2 กับ Fire (ไม้บำรุงไฟ — ทาง ค)
  const bad: Entity = ent({ id: 2, element: "Metal" }); // -2 กับ Fire

  const even = aggregateScore([good, bad], "Fire", []);
  const goodShared = aggregateScore([{ ...good, shared: true }, bad], "Fire", []);
  const badShared = aggregateScore([good, { ...bad, shared: true }], "Fire", []);

  assert.equal(even.score, 50, "น้ำหนักเท่ากันควรหักล้างพอดี");
  assert.ok(goodShared.score! > even.score!, "ตัวดีที่ shared ควรดันคะแนนขึ้น");
  assert.ok(badShared.score! < even.score!, "ตัวแย่ที่ shared ควรดึงคะแนนลง");
});

test("คะแนนอยู่ในช่วง 0-100 เสมอ ไม่ว่าจะใส่ entity กี่ตัว", () => {
  const many: Entity[] = Array.from({ length: 30 }, (_, i) => ent({ id: i, element: "Metal", shared: true }));
  const r = aggregateScore(many, "Fire", []);
  assert.ok(r.score !== null && r.score >= 0 && r.score <= 100);
});

test("scoreEntities คืนผลตรงกับ wuXingScore ตัวจริง (ไม่ได้คำนวณเอง)", () => {
  const e = ent({ element: "Water" });
  const [scored] = scoreEntities([e], "Wood", []);
  assert.deepEqual(scored.result, wuXingScore("Wood", "Water", []));
  assert.equal(scored.entity.id, e.id);
});

test("สีความสัมพันธ์คืนชื่อ CSS variable ไม่ใช่ hex (กฎธีม §2)", () => {
  const clash = wuXingScore("Fire", "Metal", ["Metal"]);
  assert.equal(relationColorVar(clash), "var(--clash)");
  assert.equal(relationColorVar(wuXingScore("Fire", "Earth", [])), "var(--good)");
  assert.equal(relationColorVar(wuXingScore("Fire", "Metal", [])), "var(--bad)");
  for (const el of ["Wood", "Fire", "Earth", "Metal", "Water"] as Element5[]) {
    assert.match(relationColorVar(wuXingScore("Fire", el, [])), /^var\(--/);
  }
});

test("ทุกประเภท entity มีทั้งไอคอนและป้ายชื่อครบ", () => {
  const types: EntityType[] = ["house", "vehicle", "colleague", "romantic", "company"];
  for (const t of types) {
    assert.ok(ENTITY_ICONS[t], `ขาดไอคอน ${t}`);
    assert.ok(ENTITY_LABELS[t], `ขาดป้ายชื่อ ${t}`);
  }
});
