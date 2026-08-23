// เทสต์โหมดเนื้อคู่ (Logic 17 v1) — ล็อกความตรงกับตาราง ข.2 + caveat บังคับ + ขอบเขต v1
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ZODIAC_TRAITS,
  PLANET_MEANINGS,
  seventhSign,
  soulmateReading,
  soulmateElementReading,
  soulmateImagePrompt,
  SOULMATE_CAVEAT,
  SOULMATE_SCOPE_NOTE,
  SOULMATE_NO_TIME_NOTE,
  SOULMATE_IMAGE_DISCLAIMER,
} from "../lib/engine/soulmate";
import { ZODIAC_ORDER } from "../lib/engine/ascendant";
import { wuXingScore } from "../lib/engine/element";

test("ตาราง ข.2 ครบ 12 ราศี — ทุกราศีมี traits/strengths/weaknesses/ดาวเจ้าเรือน", () => {
  assert.equal(Object.keys(ZODIAC_TRAITS).length, 12);
  for (const sign of ZODIAC_ORDER) {
    const t = ZODIAC_TRAITS[sign];
    assert.ok(t.traits.length > 10, `${sign} traits`);
    assert.ok(t.strengths.length > 5, `${sign} strengths`);
    assert.ok(t.weaknesses.length > 5, `${sign} weaknesses`);
    assert.ok(t.rulerIds.length >= 1, `${sign} ruler`);
    for (const id of t.rulerIds) assert.ok(PLANET_MEANINGS[id], `${sign} ruler ${id} มีความหมายดาว`);
  }
  // spot-check ตรงตำราคำต่อคำ (ข.2 = Zodiac_Signs_csv)
  assert.equal(ZODIAC_TRAITS.เมษ.traits, "กล้าหาญ, รักอิสระ, เป็นผู้นำ, ตรงไปตรงมา");
  assert.equal(ZODIAC_TRAITS.พิจิก.weaknesses, "ขี้ระแวง, เจ้าคิดเจ้าแค้น, หึงหวงรุนแรง");
  // กุมภ์เจ้าเรือนคู่ ราหู(8)/เสาร์(7) ตาม ข.2 — ไม่ใช่ข้อมูลซ้ำผิดพลาด
  assert.deepEqual(ZODIAC_TRAITS.กุมภ์.rulerIds, [8, 7]);
});

test("ธาตุราศีตรงตำรา — ลม→Wood ตามแบบแผนระบบ 4 ธาตุเดิม", () => {
  assert.equal(ZODIAC_TRAITS.เมษ.element, "Fire");
  assert.equal(ZODIAC_TRAITS.มิถุน.thaiElement, "ลม");
  assert.equal(ZODIAC_TRAITS.มิถุน.element, "Wood");
  assert.equal(ZODIAC_TRAITS.มังกร.element, "Earth");
  assert.equal(ZODIAC_TRAITS.มีน.element, "Water");
});

test("ราศีที่ 7 (ภพปัตนิ) — เมษ↔ตุลย์ · กันย์↔มีน · วนกลับตัวเองเมื่อนับ 2 รอบ", () => {
  assert.equal(seventhSign("เมษ"), "ตุลย์");
  assert.equal(seventhSign("ตุลย์"), "เมษ");
  assert.equal(seventhSign("กันย์"), "มีน");
  assert.equal(seventhSign("กุมภ์"), "สิงห์");
  for (const sign of ZODIAC_ORDER) assert.equal(seventhSign(seventhSign(sign)), sign);
});

test("soulmateReading — เคมีธาตุมาจาก wuXingScore ตัวจริง + caveat ครบ", () => {
  // ผู้ใช้ไฟเด่น ขาดน้ำ · ลัคนาเมษ → คู่คือตุลย์ (ลม→Wood) — ไม้บำรุงไฟ = +2
  const r = soulmateReading("เมษ", "Fire", ["Water"]);
  assert.equal(r.seventhSign, "ตุลย์");
  assert.equal(r.partner.element, "Wood");
  const expected = wuXingScore("Fire", "Wood", ["Water"]);
  assert.equal(r.chemistry.score.final_score, expected.final_score);
  assert.equal(r.rulers[0].name, "ศุกร์"); // ตุลย์เจ้าเรือนศุกร์ (๖)
  assert.ok(r.caveats.includes(SOULMATE_CAVEAT));
  assert.ok(r.caveats.includes(SOULMATE_SCOPE_NOTE));
  // Productive Clash: คู่ธาตุน้ำที่ผู้ใช้ขาด ต้องพลิกเป็น +2 (มุมเดียวกับ /compatibility)
  const clash = soulmateReading("มิถุน", "Fire", ["Water"]); // มิถุน→ธนู? ไม่ — ตรวจตรงๆ ข้างล่าง
  assert.equal(clash.seventhSign, "ธนู");
  const water = r.chemistry.rankedElements.find((e) => e.element === "Water")!;
  assert.equal(water.score, wuXingScore("Fire", "Water", ["Water"]).final_score);
});

test("fallback ไม่มีเวลาเกิด — บอกตรงว่าเป็นชั้นธาตุ + ไม่แต่งราศี", () => {
  const r = soulmateElementReading("Fire", ["Water"]);
  assert.equal(r.mode, "element");
  assert.ok(r.caveats.includes(SOULMATE_NO_TIME_NOTE));
  assert.ok(r.caveats.includes(SOULMATE_CAVEAT));
  assert.equal(r.rankedElements.length, 5);
  assert.ok(r.supportDirections.length >= 1);
  // ไม่มี field ราศีหลุดออกมา (กันเผลอเดาลัคนา)
  assert.ok(!("seventhSign" in r));
});

test("prompt ภาพเนื้อคู่ — สุภาพ/ผู้ใหญ่/ห้ามตัวอักษร + เพศตามที่ผู้ใช้เลือก (ห้ามเดา)", () => {
  const p = soulmateImagePrompt({ gender: "female", element: "Water" });
  assert.ok(p.includes("adult Thai woman"));
  assert.ok(p.includes("modest"));
  assert.ok(p.includes("no text"));
  const any = soulmateImagePrompt({ gender: "any", element: "Fire" });
  assert.ok(any.includes("adult Thai person"));
  // ป้ายกำกับบังคับต้องประกาศชัดว่าไม่ใช่บุคคลจริงและไม่ได้มาจากตำรา
  assert.ok(SOULMATE_IMAGE_DISCLAIMER.includes("ไม่ใช่บุคคลจริง"));
  assert.ok(SOULMATE_IMAGE_DISCLAIMER.includes("ไม่ได้มาจากตำรา"));
});

test("ขอบเขต v1 — SCOPE_NOTE ระบุครบ 5 หัวข้อที่ตำราไม่มีข้อมูล (ห้ามแต่งเอง)", () => {
  for (const topic of ["รูปลักษณ์", "พื้นเพ", "ฐานะ", "อายุ", "ช่วงเวลา"]) {
    assert.ok(SOULMATE_SCOPE_NOTE.includes(topic), `SCOPE_NOTE ต้องมี "${topic}"`);
  }
});

// ---- ภาพสว่าง-สมจริง 3 ฉาก + คำบรรยายจาก engine (feedback ผู้ใช้ 23 ส.ค. 2569) ----
import { soulmateImageCaptions } from "../lib/engine/soulmate";

test("prompt 3 variant — สว่าง/ธรรมชาติ/สมจริง · ฉากต่างกันทั้ง 3 · ยังสุภาพ+no-text", () => {
  const prompts = [0, 1, 2].map((v) => soulmateImagePrompt({ gender: "female", element: "Water", variant: v }));
  assert.equal(new Set(prompts).size, 3, "3 ฉากต้องต่างกัน");
  for (const p of prompts) {
    assert.ok(/natural daylight/i.test(p), "ต้องสว่างธรรมชาติ");
    assert.ok(/photorealistic|realistic/i.test(p), "ต้องสมจริง");
    assert.ok(!/cinematic|dreamy romantic|artistic illustration/i.test(p), "ห้ามโทนมืดจัดฉากแบบเดิม");
    assert.ok(p.includes("modest") && /no text/i.test(p));
    assert.ok(/accents/i.test(p), "สีธาตุเป็นสีเน้น ไม่ใช่โทนคุมทั้งภาพ");
  }
});

test("คำบรรยายประจำภาพ — ถ้อยคำจาก engine ล้วน (ข.2/เคมี/ทิศ) ทั้งโหมดลัคนาและโหมดธาตุ", () => {
  const lagna = soulmateReading("กันย์", "Fire", ["Water"]);
  const caps = soulmateImageCaptions(lagna);
  assert.equal(caps.length, 3);
  assert.ok(caps[0].includes(lagna.partner.traits), "ภาพ 1 = นิสัยจาก ข.2 คำต่อคำ");
  assert.ok(caps[1].includes(lagna.partner.strengths), "ภาพ 2 = จุดแข็งจาก ข.2");
  assert.ok(caps[2].includes(lagna.chemistry.score.relation_th), "ภาพ 3 = เคมีจาก wuXing จริง");
  const el = soulmateElementReading("Fire", ["Water"]);
  const caps2 = soulmateImageCaptions(el);
  assert.ok(caps2[0].includes(el.rankedElements[0].thai));
  assert.ok(caps2[1].includes(el.rankedElements[1].thai));
});
