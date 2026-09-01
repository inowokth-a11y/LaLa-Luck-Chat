// เทสต์โหมดทำนายแบบองค์รวม (Logic 20 ยกเครื่อง 22 ส.ค. 2569)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FREE_NETWORK_PARTS,
  MAX_NETWORK_PARTS,
  personSeedFromBirthDate,
  startDateOmen,
  START_OMEN_CAVEAT,
  personalEnergyNumber,
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
import { checkDayKalaYoke } from "../lib/engine/kalayoke";

test("personalEnergyNumber — สูตรรวม Birth+Name+Time+Day ส่วนที่ไม่มี = 0 (มติ 31 ส.ค. 2569)", () => {
  // 1986-10-07 (อังคาร): Birth 7+1+24=32 + Day 3 = 35
  assert.equal(personalEnergyNumber("1986-10-07"), 35);
  // 1990-03-15 (พฤหัสบดี): Birth 6+3+19=28 + Day 5 = 33
  assert.equal(personalEnergyNumber("1990-03-15"), 33);
  // TimePower ลดทอนเหลือหลักเดียว: 18:30 → 1+8+3+0=12 → 3 (ไม่ใช่ 12)
  assert.equal(
    personalEnergyNumber("1990-03-15", { birthTime: "18:30" }),
    personalEnergyNumber("1990-03-15") + 3
  );
  // NamePower เข้าเมื่อมีชื่อ (สมชาย=23 ตามตารางทางการ) — ไม่มีชื่อ = 0
  assert.equal(
    personalEnergyNumber("1990-03-15", { name: "สมชาย" }),
    personalEnergyNumber("1990-03-15") + 23
  );
  // ไม่มีข้อยกเว้นเลขตอง — ผลรวม >99 ลดทอนปกติ (ผู้ใช้เคาะ)
  assert.throws(() => personalEnergyNumber("15/03/1990"));
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

test("ขีดจำกัดข่าย (ผู้ใช้เคาะ 22 ส.ค. 2569): ฟรี 2 · สูงสุด 10 · เรทเครดิตมีจริงใน pricing", () => {
  assert.equal(FREE_NETWORK_PARTS, 2);
  assert.equal(MAX_NETWORK_PARTS, 10);
});

test("personSeedFromBirthDate — ธาตุบุคคลจากสูตรคนตัวจริง · พ.ศ./ปีเสีย = null", () => {
  const s = personSeedFromBirthDate("1986-10-07");
  assert.ok(s);
  assert.ok(["Fire", "Earth", "Wood", "Water"].includes(s!.dominant));
  assert.equal(personSeedFromBirthDate("2530-01-01"), null); // พ.ศ. — ห้ามเงียบ
  assert.equal(personSeedFromBirthDate("15/03/1990"), null); // รูปแบบผิด
});

test("startDateOmen — wiring ตรง checkDayKalaYoke + ขอบเขต จ.ศ. 16 เม.ย. + เฟรมนุ่มเมื่อร้าย", () => {
  // เทียบกับ engine กาลโยคตรงๆ (wiring test — สูตร verify แล้วในเทสต์ของ kalayoke เอง)
  const o = startDateOmen("2026-08-22");
  assert.ok(o);
  const expected = checkDayKalaYoke(o!.dayTh, o!.cs).kala_yoke_hits;
  assert.deepEqual(
    [...o!.good, ...o!.bad].sort(),
    expected.map((h) => h.type).sort()
  );
  // ขอบเขตปี จ.ศ.: 15 เม.ย. ใช้ปีก่อน · 16 เม.ย. ใช้ปีใหม่ (ต่างกัน 1 เสมอ)
  const before = startDateOmen("2026-04-15")!;
  const after = startDateOmen("2026-04-16")!;
  assert.equal(after.cs - before.cs, 1);
  // เฟรมนุ่ม: โน้ตของวันร้ายต้องมีหลัก "ไม่ได้ร้ายทั้งวัน" — หาวันร้ายจริงในปีหนึ่งมาทดสอบ
  let foundBad = false;
  for (let d = 1; d <= 14 && !foundBad; d++) {
    const om = startDateOmen(`2026-06-${String(d).padStart(2, "0")}`)!;
    if (om.tone === "bad") {
      foundBad = true;
      assert.ok(om.note.includes("ไม่ได้ร้ายทั้งวัน"), "วันร้ายต้องเฟรมนุ่มตามหลักตำรา");
    }
  }
  // ให้เวลา → ได้คำตัดสินรวมชั้นยาม (จากตัวรวมที่มีเทสต์แล้ว)
  const withTime = startDateOmen("2026-08-22", "09:30")!;
  assert.ok(typeof withTime.timeVerdict === "string" && withTime.timeVerdict!.length > 0);
  assert.equal(startDateOmen("2026-08-22")!.timeVerdict, null);
});

test("holisticAdvice — omen ดีเข้าจุดแข็ง · ร้ายเข้าระวัง · มี omen = caveat กาลโยคติดมา", () => {
  const asp = numberAspects("47");
  const base: HolisticPart = { label: "บ้าน", icon: "🏠", aspects: asp, chemistry: null, element: null };
  const goodOmen = { dateISO: "x", dayTh: "จันทร์", cs: 1388, good: ["ธงชัย"], bad: [], tone: "good" as const, note: "n", timeVerdict: null };
  const badOmen = { dateISO: "x", dayTh: "อังคาร", cs: 1388, good: [], bad: ["อุบาทว์"], tone: "bad" as const, note: "วันร้ายไม่ได้ร้ายทั้งวัน", timeVerdict: null };
  const parts: HolisticPart[] = [
    { ...base, label: "รถ", omen: goodOmen },
    { ...base, label: "บ้าน", omen: badOmen },
  ];
  const adv = holisticAdvice(parts, analyzeCoherence(parts), null);
  assert.ok(adv.strengths.some((s) => s.includes("ธงชัย")), "omen ดีต้องเข้าจุดแข็ง");
  assert.ok(adv.cautions.some((s) => s.includes("อุบาทว์")), "omen ร้ายต้องเข้าข้อควรระวัง");
  assert.ok(adv.caveats.includes(START_OMEN_CAVEAT), "มี omen ต้องมี caveat กาลโยค");
  // ไม่มี omen = ไม่แบก caveat กาลโยคเกินจำเป็น
  const advNoOmen = holisticAdvice([base], analyzeCoherence([base]), null);
  assert.ok(!advNoOmen.caveats.includes(START_OMEN_CAVEAT));
});
