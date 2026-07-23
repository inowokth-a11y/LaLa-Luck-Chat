// เทสต์เสี่ยงทายวงแหวนคู่ (lib/engine/oracle.ts)
//
// ⚠️ ไม่ใช่ golden parity — ต้นฉบับเป็น JS ฝังใน oracle_dual_ring.html ไม่มี Python
//    เทสต์นี้คุมพฤติกรรมที่พอร์ตมา + ล็อกข้อสังเกตที่พบระหว่างพอร์ตไว้ไม่ให้หลุดหาย

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  shuffleDigits,
  digitAtReticle,
  slotPosition,
  spinTarget,
  easeOutQuint,
  cardIdFromDigits,
  personalEnergyComponent,
  timeEnergyComponent,
  otherInfluencesComponent,
  cardComponent,
  resolveLayerElement,
  computeCombinedReading,
  SLOT_COUNT,
  SLOT_ANGLE,
  MIN_SPIN_ROTATION_DEG,
  LAYER_LABEL,
  type LayerType,
} from "../lib/engine/oracle";
import type { Element5 } from "../lib/engine/element";

// ---- กลไกวงแหวน ----

test("สลับเลขได้ครบ 0-9 ไม่ซ้ำไม่หาย", () => {
  for (let i = 0; i < 50; i++) {
    const m = shuffleDigits();
    assert.equal(m.length, SLOT_COUNT);
    assert.deepEqual([...m].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }
});

test("เข็มที่ 12 นาฬิกาอ่านช่องแรกเมื่อยังไม่หมุน", () => {
  const map = [7, 3, 1, 9, 0, 5, 2, 8, 4, 6];
  assert.equal(digitAtReticle(map, 0), 7);
});

test("หมุนไป 1 ช่อง (36°) เข็มต้องอ่านช่องถัดไป", () => {
  const map = [7, 3, 1, 9, 0, 5, 2, 8, 4, 6];
  // หมุนตามเข็ม +36° → ช่องเลื่อนถอย → เข็มไปเจอ index 9
  assert.equal(digitAtReticle(map, SLOT_ANGLE), map[9]);
  assert.equal(digitAtReticle(map, -SLOT_ANGLE), map[1]);
});

test("หมุนครบรอบกลับมาที่เดิม และรองรับค่าติดลบ/เกิน 360", () => {
  const map = shuffleDigits();
  const base = digitAtReticle(map, 0);
  for (const r of [360, 720, -360, 3600]) {
    assert.equal(digitAtReticle(map, r), base, `หมุน ${r}° ควรได้ค่าเดิม`);
  }
});

test("ทุกมุมที่เป็นไปได้ต้องอ่านค่าได้เสมอ ไม่มี undefined", () => {
  const map = shuffleDigits();
  for (let deg = -1080; deg <= 1080; deg += 7) {
    const d = digitAtReticle(map, deg);
    assert.ok(Number.isInteger(d) && d >= 0 && d <= 9, `มุม ${deg} ได้ ${d}`);
  }
});

test("ช่อง 0 อยู่บนสุด และช่องกระจายรอบวง", () => {
  const p0 = slotPosition(0, 100);
  assert.ok(Math.abs(p0.x) < 1e-9 && Math.abs(p0.y + 100) < 1e-9, "ช่อง 0 ต้องอยู่บนสุด");
  const p5 = slotPosition(5, 100); // ตรงข้าม
  assert.ok(Math.abs(p5.y - 100) < 1e-9, "ช่อง 5 ต้องอยู่ล่างสุด");
});

test("ปัดแรงขึ้นต้องหมุนไกลขึ้น และหมุนขั้นต่ำเสมอ", () => {
  const slow = spinTarget(0, 1);
  const fast = spinTarget(0, 5);
  assert.ok(Math.abs(fast) > Math.abs(slow), "ปัดแรงต้องหมุนไกลกว่า");
  assert.ok(Math.abs(slow) >= MIN_SPIN_ROTATION_DEG, "ต้องหมุนอย่างน้อย 900°");
});

test("ปัดค่า 0 (แตะเฉยๆ) ยังหมุนได้ โดยสุ่มทิศ", () => {
  assert.equal(spinTarget(0, 0, () => 0.1), MIN_SPIN_ROTATION_DEG);
  assert.equal(spinTarget(0, 0, () => 0.9), -MIN_SPIN_ROTATION_DEG);
});

test("การชะลอตัวเริ่มที่ 0 จบที่ 1 และช้าลงเรื่อยๆ", () => {
  assert.equal(easeOutQuint(0), 0);
  assert.equal(easeOutQuint(1), 1);
  // ช่วงต้นต้องเคลื่อนเร็วกว่าช่วงท้าย
  assert.ok(easeOutQuint(0.2) - easeOutQuint(0) > easeOutQuint(1) - easeOutQuint(0.8));
});

test("เลขการ์ดรวมสองวงเป็น 2 หลักเสมอ", () => {
  assert.equal(cardIdFromDigits(0, 0), "00");
  assert.equal(cardIdFromDigits(9, 9), "99");
  assert.equal(cardIdFromDigits(0, 7), "07");
});

// ---- การให้คะแนน ----

test("ยิ่งขาดธาตุมาก คะแนนพลังงานส่วนบุคคลยิ่งต่ำ", () => {
  const s = (n: number) => personalEnergyComponent(Array(n).fill("Water") as Element5[]).score;
  assert.equal(s(0), 2);
  assert.equal(s(1), 1);
  assert.equal(s(2), 0);
  assert.equal(s(3), -1);
  assert.equal(s(4), -2);
});

test("ไม่รู้วันที่ถาม → คะแนนกาลเวลาเป็นกลาง ไม่ใช่ติดลบ", () => {
  const c = timeEnergyComponent("ไม่มีวันนี้", "Fire", []);
  assert.equal(c.score, 0);
  assert.match(c.detail, /ไม่ทราบ/);
});

test("🔴 ใช้ DAY_ELEMENT ที่แก้บั๊ก B2 แล้ว — วันพฤหัสบดีต้องไม่ถูกข้าม", () => {
  // HTML ต้นฉบับไม่มี "พฤหัสบดี" ในตาราง → คนเกิดวันนี้จะได้ score 0 เงียบๆ
  const c = timeEnergyComponent("พฤหัสบดี", "Fire", []);
  assert.notEqual(c.detail, "ไม่ทราบวันที่ถาม", "พฤหัสบดีต้องอยู่ในตาราง");
  assert.match(c.detail, /ธาตุวันนี้/);
});

test("ไม่ผูกเลเยอร์ → เป็นกลาง · ผูกแต่กรอกไม่ครบ → เป็นกลางพร้อมบอกเหตุผล", () => {
  assert.equal(otherInfluencesComponent({}, "Fire", []).score, 0);
  const partial = otherInfluencesComponent({ place: {} }, "Fire", []);
  assert.equal(partial.score, 0);
  assert.match(partial.detail, /ยังกรอกข้อมูลไม่ครบ/);
});

test("ผูกหลายเลเยอร์ → เฉลี่ยคะแนน และบอกทุกตัวใน detail", () => {
  const c = otherInfluencesComponent(
    { place: { number: "47" }, vehicle: { number: "82" } },
    "Fire",
    []
  );
  assert.ok(c.detail.includes(LAYER_LABEL.place) && c.detail.includes(LAYER_LABEL.vehicle));
});

test("ธาตุเลเยอร์: คนอื่นใช้วันเกิด · ที่เหลือใช้เลข", () => {
  assert.equal(resolveLayerElement("other_person", { day: "อังคาร" }), "Fire");
  assert.equal(resolveLayerElement("other_person", {}), null, "ไม่มีวันเกิด → null");
  assert.equal(resolveLayerElement("place", { number: "47" }), "Earth");
  assert.equal(resolveLayerElement("place", {}), null, "ไม่มีเลข → null");
  assert.equal(resolveLayerElement("place", { number: "ไม่ใช่ตัวเลข" }), null);
});

test("ธาตุการ์ดมาจากเลขหลักหน่วย ไม่ใช่ทั้งเลข", () => {
  // 47 → หลักหน่วย 7 → Wood ; 07 ก็ต้องได้ Wood เหมือนกัน
  const a = cardComponent("x", 0.3, "47", "Fire", []);
  const b = cardComponent("x", 0.3, "07", "Fire", []);
  assert.equal(a.cardElement, b.cardElement);
});

test("คะแนนรวมอยู่ในช่วง 0-100 เสมอ ไม่ว่าจะป้อนอะไร", () => {
  const layers: Array<Record<string, { number: string }>> = [{}, { place: { number: "5" } }];
  for (const dominant of ["Wood", "Fire", "Earth", "Metal", "Water"] as Element5[]) {
    for (const missing of [[], ["Water"], ["Water", "Metal"]] as Element5[][]) {
      for (const day of ["อังคาร", "พฤหัสบดี", "ไม่รู้"]) {
        for (const L of layers) {
          const r = computeCombinedReading({
            card1Id: "47", card2Id: "82", dominant, missing, dayOfWeek: day, boundLayers: L,
          });
          assert.ok(r.aggregate >= 0 && r.aggregate <= 100, `ได้ ${r.aggregate}`);
          assert.ok(r.label.length > 0);
        }
      }
    }
  }
});

test("น้ำหนักรวมของ 5 องค์ประกอบ = 1.00 พอดี", () => {
  const r = computeCombinedReading({
    card1Id: "47", card2Id: "82", dominant: "Fire", missing: [], dayOfWeek: "อังคาร", boundLayers: {},
  });
  assert.equal(r.components.length, 5);
  const sum = r.components.reduce((a, c) => a + c.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `รวมได้ ${sum}`);
});

test("การ์ดใบที่ 2 (เรื่องที่ถาม) ต้องมีน้ำหนักมากที่สุด", () => {
  const r = computeCombinedReading({
    card1Id: "47", card2Id: "82", dominant: "Fire", missing: [], dayOfWeek: "อังคาร", boundLayers: {},
  });
  const w = Object.fromEntries(r.components.map((c) => [c.component, c.weight]));
  const max = Math.max(...r.components.map((c) => c.weight));
  assert.equal(w["การ์ดใบที่ 2 (เรื่องที่ถาม)"], max);
  assert.ok(w["การ์ดใบที่ 2 (เรื่องที่ถาม)"] > w["การ์ดใบที่ 1 (ตัวคุณ)"]);
});

test("🔴 ข้อสังเกตที่ล็อกไว้ — Productive Clash ไม่ทำงานในหน้าเสี่ยงทาย", () => {
  // ต้นฉบับเรียก wuXingScore(อีกฝ่าย, dominant, missing) → object คือ dominant
  // ซึ่งไม่มีวันอยู่ใน missing → เงื่อนไข clash จึงไม่มีทางเป็นจริง
  // เทสต์นี้ล็อกพฤติกรรมไว้ ถ้าวันหนึ่งแก้ให้ clash ทำงานจะได้รู้ตัวว่ากำลังเปลี่ยนคะแนนทั้งระบบ
  const withMissing = computeCombinedReading({
    card1Id: "44", card2Id: "44", dominant: "Fire", missing: ["Water"], dayOfWeek: "อังคาร", boundLayers: {},
  });
  const cards = withMissing.components.filter((c) => c.component.startsWith("การ์ด"));
  for (const c of cards) {
    assert.ok(!/Productive Clash/.test(c.detail), "ยังไม่ควรมี clash ในเวอร์ชันที่พอร์ตตามต้นฉบับ");
  }
});

test("ทุกประเภทเลเยอร์มีป้ายชื่อภาษาไทย", () => {
  for (const t of ["place", "vehicle", "organization", "other_person"] as LayerType[]) {
    assert.ok(LAYER_LABEL[t]);
  }
});
