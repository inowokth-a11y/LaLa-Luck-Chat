// Logic 7 — unit test ของ lib/engine/fengshui.ts
//
// ⚠️ **ไม่ใช่ golden parity test** — Logic 7 ไม่มี engine ฝั่ง Python (มีแค่ pseudocode ในเอกสาร)
//    เทสต์นี้คุม "พฤติกรรมที่ตั้งใจ" รวมถึงจุดที่**จงใจต่างจากสเปก** (คงธาตุทองไว้)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  analyzeFengShui,
  remedyElement,
  DIRECTION_TO_ELEMENT,
  COLOR_TO_ELEMENT,
  SHAPE_TO_ELEMENT,
  ALL_DIRECTIONS,
  PURPOSE_LABELS,
  type Direction,
} from "../lib/engine/fengshui";
import { wuXingScore, type Element5 } from "../lib/engine/element";

const ELEMENTS: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

test("ตารางทิศตรงกับตำราฮวงจุ้ยจีน (ไม่ใช่ฉบับยุบทอง)", () => {
  assert.equal(DIRECTION_TO_ELEMENT["เหนือ"], "Water");
  assert.equal(DIRECTION_TO_ELEMENT["ใต้"], "Fire");
  assert.equal(DIRECTION_TO_ELEMENT["ตะวันออก"], "Wood");
  assert.equal(DIRECTION_TO_ELEMENT["ตะวันตก"], "Metal");
  assert.equal(DIRECTION_TO_ELEMENT["ตะวันตกเฉียงเหนือ"], "Metal");
  assert.equal(DIRECTION_TO_ELEMENT["ตะวันออกเฉียงเหนือ"], "Earth");
});

test("🔴 การตัดสินใจสำคัญ: ธาตุทองต้องไม่ถูกยุบเป็นดิน", () => {
  // เอกสารต้นทางแปลง ทอง→ดิน ทำให้ 4/9 ทิศซ้ำกัน — เทสต์นี้กันไม่ให้ย้อนกลับโดยไม่ตั้งใจ
  const metalDirs = ALL_DIRECTIONS.filter((d) => DIRECTION_TO_ELEMENT[d] === "Metal");
  assert.deepEqual(metalDirs.sort(), ["ตะวันตก", "ตะวันตกเฉียงเหนือ"].sort());

  const earthDirs = ALL_DIRECTIONS.filter((d) => DIRECTION_TO_ELEMENT[d] === "Earth");
  assert.equal(earthDirs.length, 3, "ถ้าเป็น 5 แปลว่าทองถูกยุบกลับไปแล้ว");
});

test("ทั้ง 9 ทิศครบและครอบคลุมทั้ง 5 ธาตุ", () => {
  assert.equal(ALL_DIRECTIONS.length, 9);
  const used = new Set(ALL_DIRECTIONS.map((d) => DIRECTION_TO_ELEMENT[d]));
  for (const el of ELEMENTS) assert.ok(used.has(el), `ไม่มีทิศไหนเป็นธาตุ ${el}`);
});

test("ตารางสี/รูปทรงมีธาตุทองจริง (ไม่ถูกยุบ)", () => {
  assert.equal(COLOR_TO_ELEMENT["ขาว"], "Metal");
  assert.equal(COLOR_TO_ELEMENT["ทอง"], "Metal");
  assert.equal(SHAPE_TO_ELEMENT["กลม"], "Metal");
  // ของที่ควรอยู่ธาตุอื่นต้องไม่โดนลาก
  assert.equal(COLOR_TO_ELEMENT["เหลือง"], "Earth");
  assert.equal(SHAPE_TO_ELEMENT["สี่เหลี่ยมจัตุรัส"], "Earth");
});

test("ธาตุแก้ = ธาตุที่ผู้ใช้ให้กำเนิด (ผ่อนแรงปะทะ ไม่ปะทะกลับ)", () => {
  assert.equal(remedyElement("Wood"), "Fire");
  assert.equal(remedyElement("Fire"), "Earth");
  assert.equal(remedyElement("Earth"), "Metal");
  assert.equal(remedyElement("Metal"), "Water");
  assert.equal(remedyElement("Water"), "Wood");
});

test("ทิศที่ส่งเสริม → ไม่มีคำแนะนำให้แก้ แต่มีคำแนะนำเสริม", () => {
  // ทาง "ค" (2026-07-30): ไม้บำรุงไฟ → ทิศตะวันออก (ไม้) มงคลที่สุดสำหรับคนธาตุไฟ
  const r = analyzeFengShui("Fire", [], { direction: "ตะวันออก", purpose: "bedroom" });
  assert.equal(r.aspects[0].result.final_score, 2);
  assert.ok(r.recommendations[0].issue.includes("ไม่พบจุดที่ขัด"));
});

test("ทาง ค: ทิศที่เราให้กำเนิด (ดิน) = +1 ผู้ให้ ไม่ใช่มงคลสูงสุด และไม่ต้องแก้", () => {
  const r = analyzeFengShui("Fire", [], { direction: "ตะวันออกเฉียงเหนือ", purpose: "bedroom" });
  assert.equal(r.aspects[0].result.final_score, 1);
  assert.ok(r.recommendations[0].issue.includes("ไม่พบจุดที่ขัด"), "ผู้ให้ไม่ใช่ปัญหาที่ต้องแก้");
});

test("ทิศที่พิฆาต → ต้องมีคำแนะนำวิธีแก้ที่เจาะจง", () => {
  // ไฟพิฆาตทอง → ทิศตะวันตก (ทอง) ขัดกับคนธาตุไฟ
  const r = analyzeFengShui("Fire", [], { direction: "ตะวันตก", purpose: "office" });
  assert.ok(r.aspects[0].result.final_score < 0);
  assert.equal(r.recommendations.length, 1);
  assert.ok(r.recommendations[0].issue.includes("ตะวันตก"));
  assert.ok(r.recommendations[0].fix.includes("ดิน"), "คนธาตุไฟต้องแก้ด้วยธาตุดิน");
});

test("Productive Clash — ทิศที่พิฆาตแต่เป็นธาตุที่ขาด ไม่ต้องแก้", () => {
  const without = analyzeFengShui("Fire", [], { direction: "ตะวันตก", purpose: "office" });
  const withMissing = analyzeFengShui("Fire", ["Metal"], { direction: "ตะวันตก", purpose: "office" });

  assert.ok(without.recommendations[0].issue.includes("ขัดกับ"));
  assert.equal(withMissing.aspects[0].result.productive_clash, true);
  assert.equal(withMissing.aspects[0].result.final_score, 2);
  assert.ok(withMissing.recommendations[0].issue.includes("ไม่พบจุดที่ขัด"), "ธาตุที่ขาดเป็นยา ไม่ใช่ปัญหา");
});

test("วิเคราะห์ครบทั้ง 3 ด้านเมื่อกรอกครบ", () => {
  const r = analyzeFengShui("Water", [], {
    direction: "ใต้", shape: "สามเหลี่ยม", color: "แดง", purpose: "living",
  });
  assert.deepEqual(r.aspects.map((a) => a.aspect), ["ทิศ", "รูปทรง", "สี"]);
  // น้ำพิฆาตไฟ ทั้ง 3 ด้านเป็นไฟหมด → ต้องมีคำแนะนำ 3 ข้อ
  assert.equal(r.recommendations.length, 3);
});

test("ค่าที่ไม่มีในตาราง → ข้ามไปเงียบๆ ไม่เดาธาตุ", () => {
  const r = analyzeFengShui("Water", [], {
    direction: "เหนือ", shape: "ทรงที่ไม่มีในตาราง", color: "สีที่ไม่มีในตาราง", purpose: "bedroom",
  });
  assert.equal(r.aspects.length, 1, "ควรเหลือแค่ทิศ");
  assert.equal(r.aspects[0].aspect, "ทิศ");
});

test("ทิศมงคล/ทิศที่ควรระวัง คำนวณจาก wuXingScore ตัวจริง", () => {
  const r = analyzeFengShui("Fire", [], { direction: "เหนือ", purpose: "bedroom" });
  for (const d of r.lucky_directions) {
    const expected = wuXingScore("Fire", DIRECTION_TO_ELEMENT[d.direction as Direction], []).final_score;
    assert.equal(d.score, expected);
  }
  // คนธาตุไฟ: ทิศดิน (ไฟให้กำเนิดดิน) ควรเป็นทิศมงคล
  assert.ok(r.lucky_directions.every((d) => d.score === r.lucky_directions[0].score));
  assert.ok(r.lucky_directions[0].score > 0);
});

test("ทิศที่ควรระวังต้องมีแต่คะแนนติดลบจริง (ไม่ยัดทิศกลางๆ มา)", () => {
  for (const el of ELEMENTS) {
    const r = analyzeFengShui(el, [], { direction: "กลาง", purpose: "living" });
    for (const d of r.caution_directions) assert.ok(d.score < 0, `${el}: ${d.direction} คะแนน ${d.score}`);
  }
});

test("ทุกธาตุผู้ใช้ต้องมีทิศมงคลอย่างน้อย 1 ทิศเสมอ", () => {
  for (const el of ELEMENTS) {
    const r = analyzeFengShui(el, [], { direction: "กลาง", purpose: "bedroom" });
    assert.ok(r.lucky_directions.length > 0, `${el} ไม่มีทิศมงคลเลย`);
    assert.ok(r.lucky_directions[0].score > 0, `${el} ทิศดีที่สุดยังติดลบ`);
  }
});

test("ทุกวัตถุประสงค์มีป้ายชื่อภาษาไทย", () => {
  for (const p of ["bedroom", "office", "living", "entrance"] as const) {
    assert.ok(PURPOSE_LABELS[p]);
  }
});
