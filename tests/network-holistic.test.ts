// เทสต์โหมดทำนายแบบองค์รวม (Logic 20 ยกเครื่อง 22 ส.ค. 2569)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  birthPowerNumber,
  parseRefInput,
  partAspects,
  analyzeCoherence,
  holisticAdvice,
  bridgeElement,
  HOLISTIC_CAVEAT,
  type HolisticPart,
} from "../lib/engine/network-holistic";
import { numberAspects, NUMBER_ASPECTS_CAVEAT } from "../lib/engine/number-aspects";
import { wuXingScore } from "../lib/engine/element";

test("birthPowerNumber — BirthPower ล้วน ผ่าน reduceTo99 (นิยามเลขตัวตน §4 ข้อ 1)", () => {
  // 1986-10-07: digitSum(7)=7 + digitSum(10)=1 + digitSum(1986)=24 → 32
  assert.equal(birthPowerNumber("1986-10-07"), 32);
  // 1990-03-15: 6 + 3 + 19 = 28
  assert.equal(birthPowerNumber("1990-03-15"), 28);
  assert.throws(() => birthPowerNumber("15/03/1990"));
});

test("parseRefInput — คงเลข 0 นำหน้า + แยกอักษรป้ายไทย + ปฏิเสธเกิน 10 หลัก", () => {
  assert.deepEqual(parseRefInput("0812345678"), { digits: "0812345678", letters: null });
  assert.deepEqual(parseRefInput("จง 6266"), { digits: "6266", letters: "จง" });
  assert.equal(parseRefInput("12345678901"), null);
  assert.equal(parseRefInput("ไม่มีเลข"), null);
});

test("partAspects — ผลตรง numberAspects ตัวจริงทุกค่า (หน้าห้ามคำนวณเอง)", () => {
  const viaPart = partAspects({ digits: "6266", letters: "จง" }, "Fire", ["Water"]);
  const direct = numberAspects("6266", "Fire", ["Water"], "จง");
  assert.deepEqual(viaPart, direct);
});

const mkPart = (label: string, digits: string, chem: HolisticPart["chemistry"] = null, element: HolisticPart["element"] = null): HolisticPart => ({
  label,
  icon: "🔹",
  aspects: numberAspects(digits, "Fire", ["Water"]),
  chemistry: chem,
  element,
});

test("analyzeCoherence — min/max/avg/tone ตรงคณิตจริง", () => {
  const a = mkPart("ก", "99");
  const b = mkPart("ข", "44");
  const co = analyzeCoherence([a, b]);
  assert.equal(co.length, 5);
  for (const c of co) {
    const sa = a.aspects.คะแนน[c.labelTh];
    const sb = b.aspects.คะแนน[c.labelTh];
    assert.equal(c.min, Math.min(sa, sb));
    assert.equal(c.max, Math.max(sa, sb));
    assert.equal(c.avg, Math.round(((sa + sb) / 2) * 10) / 10);
    if (c.min >= 6.5) assert.equal(c.tone, "strong");
    else if (c.min <= 4) assert.equal(c.tone, "caution");
    else assert.equal(c.tone, "neutral");
  }
});

test("bridgeElement — ธาตุสะพานตามวงจรจริง (ไฟพิฆาตทอง → สะพานคือดิน) · คู่ไม่พิฆาต = null", () => {
  assert.equal(bridgeElement("Fire", "Metal"), "Earth");
  assert.equal(bridgeElement("Metal", "Fire"), "Earth"); // สลับฝั่งได้ผลเดียวกัน
  assert.equal(bridgeElement("Water", "Fire"), "Wood");
  assert.equal(bridgeElement("Wood", "Fire"), null); // ให้กำเนิดกัน ไม่ใช่พิฆาต
});

test("holisticAdvice — caveat บังคับครบ 2 ตัว + พิฆาตขึ้นคำเตือนพร้อมธาตุสะพาน + clash เป็นจุดแข็ง", () => {
  // ผู้ใช้ไฟ ขาดน้ำ: entity ทอง = พิฆาตปกติ (−2) · entity น้ำ = Productive Clash (+2)
  const metalChem = wuXingScore("Fire", "Metal", ["Water"]);
  const waterChem = wuXingScore("Fire", "Water", ["Water"]);
  assert.ok(metalChem.final_score <= -2 && !metalChem.productive_clash);
  assert.ok(waterChem.productive_clash);
  const parts: HolisticPart[] = [
    mkPart("ตัวคุณ", "32"),
    mkPart("รถ", "6266", metalChem, "Metal"),
    mkPart("บ้าน", "47", waterChem, "Water"),
  ];
  const advice = holisticAdvice(parts, analyzeCoherence(parts), "Fire");
  assert.ok(advice.caveats.includes(NUMBER_ASPECTS_CAVEAT));
  assert.ok(advice.caveats.includes(HOLISTIC_CAVEAT));
  const cautionText = advice.cautions.join("\n");
  assert.ok(cautionText.includes("พิฆาต"), "พิฆาตต้องขึ้นเป็นข้อควรระวัง");
  assert.ok(cautionText.includes("ธาตุดิน"), "ต้องแนะธาตุสะพาน (ไฟ↔ทอง = ดิน)");
  assert.ok(advice.strengths.join("\n").includes("ยา"), "Productive Clash ต้องเป็นจุดแข็ง");
});
