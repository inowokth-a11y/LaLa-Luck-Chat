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
  assert.ok(p.includes("adult woman"));
  assert.ok(p.includes("Thai appearance"), "default = ลุคไทย (พฤติกรรมเดิม)");
  assert.ok(p.includes("modest"));
  assert.ok(p.includes("no text"));
  const any = soulmateImagePrompt({ gender: "any", element: "Fire" });
  assert.ok(any.includes("adult person") && any.includes("Thai appearance"));
  // ป้ายกำกับบังคับต้องประกาศชัดว่าไม่ใช่บุคคลจริงและไม่ได้มาจากตำรา
  assert.ok(SOULMATE_IMAGE_DISCLAIMER.includes("ไม่ใช่บุคคลจริง"));
  assert.ok(SOULMATE_IMAGE_DISCLAIMER.includes("ไม่ได้มาจากตำรา"));
});

test("ขอบเขต — SCOPE_NOTE เหลือปิดหัวข้อเดียว (อายุ) · พื้นเพ/ฐานะ/การงานเปิดผ่าน Bhavat Bhavam + นรลักษณ์ครบ 5 ธาตุ", () => {
  assert.ok(SOULMATE_SCOPE_NOTE.includes("อายุ"), "อายุยังปิด (ระบุแน่นอนไม่ได้)");
  assert.ok(SOULMATE_SCOPE_NOTE.includes("พื้นเพ") && SOULMATE_SCOPE_NOTE.includes("ฐานะ"), "พื้นเพ/ฐานะต้องประกาศว่าเปิดผ่านชั้นเสริม");
  assert.ok(!SOULMATE_SCOPE_NOTE.includes("รูปลักษณ์"), "รูปลักษณ์เปิดแล้ว — ห้ามอยู่ในรายการปิด");
  assert.ok(SOULMATE_SCOPE_NOTE.includes("ชั้นเสริม") && !SOULMATE_SCOPE_NOTE.includes("Jyotish"), "ประกาศชั้นเสริมโดยไม่เอ่ยชื่อศาสตร์ (ผู้ใช้สั่ง 25 ส.ค. 2569)");
  // ตาราง ค.1 คัดลอกตรงตำรา (spot-check คำต่อคำ)
  assert.equal(Object.keys(PHYSIOGNOMY_BY_ELEMENT).length, 5);
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Fire.faceTh, "รูปสามเหลี่ยมหรือรูปไข่, หน้าผากกว้างและสูง, คางเล็กแหลม");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Water.bodyTh, "ท้วม, มีเนื้อ");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Wood.faceTh, "ยาวและแคบ, โหนกแก้มและกรามไม่เด่นชัด");
  // readings แนบรูปลักษณ์ + caveat นรลักษณ์
  const r = soulmateReading("เมษ", "Fire", ["Water"]); // คู่ตุลย์ = Wood
  assert.equal(r.appearance.faceTh, PHYSIOGNOMY_BY_ELEMENT.Wood.faceTh);
  assert.ok(r.caveats.includes(APPEARANCE_CAVEAT));
  const el = soulmateElementReading("Fire", ["Water"]);
  assert.equal(el.appearance.faceTh, PHYSIOGNOMY_BY_ELEMENT[el.rankedElements[0].element].faceTh);
  assert.ok(el.caveats.includes(APPEARANCE_CAVEAT));
  // prompt ภาพใส่รูปหน้าตามธาตุ (ค.1) + ผิวละเอียด/รูขุมขน (ผู้ใช้ขอ)
  const p = soulmateImagePrompt({ gender: "female", element: "Water" });
  assert.ok(p.includes(PHYSIOGNOMY_BY_ELEMENT.Water.promptEn));
  assert.ok(/visible pores/i.test(p), "ต้องมีรายละเอียดผิว/รูขุมขน");
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
  assert.ok(caps[0].includes("รูปร่าง"), "ภาพ 1 ต้องมีรูปร่างตามนรลักษณ์ ค.1 (ผู้ใช้ขอ 23 ส.ค. 2569)");
  assert.ok(caps[1].includes(lagna.partner.strengths), "ภาพ 2 = จุดแข็งจาก ข.2");
  assert.ok(caps[2].includes(lagna.chemistry.score.relation_th), "ภาพ 3 = เคมีจาก wuXing จริง");
  const el = soulmateElementReading("Fire", ["Water"]);
  const caps2 = soulmateImageCaptions(el);
  assert.ok(caps2[0].includes(el.rankedElements[0].thai));
  assert.ok(caps2[1].includes(el.rankedElements[1].thai));
});

// ---- เช็คกับคนที่คุณสนใจ (ผู้ใช้เคาะ 23 ส.ค. 2569) ----
import { partnerMatchReading, PARTNER_PRIVACY_NOTE, NAME_TABLE_CAVEAT, PHYSIOGNOMY_BY_ELEMENT, APPEARANCE_CAVEAT } from "../lib/engine/soulmate";
import { personSeedFromBirthDate, personalEnergyNumber } from "../lib/engine/network-holistic";
import { nameElement } from "../lib/engine/naming";

test("partnerMatchReading — เคมี/เลขตัวตน/ธาตุเขา ตรง engine จริงทุกชั้น + caveat ครบ", () => {
  const user = { userDominant: "Fire" as const, userMissing: ["Water" as const], userBirthDate: "1986-10-07" };
  const r = partnerMatchReading({ ...user, partnerBirthDate: "1992-05-20", partnerName: "สมชาย" });
  assert.ok(r);
  const pSeed = personSeedFromBirthDate("1992-05-20")!;
  assert.equal(r!.partner.dominantTh, {"Fire":"ไฟ","Earth":"ดิน","Wood":"ไม้","Water":"น้ำ"}[pSeed.dominant]);
  assert.equal(r!.partner.identityNumber, String(personalEnergyNumber("1992-05-20", { name: "สมชาย" })).padStart(2, "0"));
  assert.equal(r!.chemistry.final_score, wuXingScore("Fire", pSeed.dominant, ["Water"]).final_score);
  assert.equal(r!.parts.length, 2);
  assert.equal(r!.coherence.length, 5);
  // ธาตุชื่อ (ชั้นเสริม) ตรง nameElement + caveat ตารางชื่อติดมา
  const nEl = nameElement("สมชาย")!;
  assert.equal(r!.nameLayer!.fit.final_score, wuXingScore("Fire", nEl, ["Water"]).final_score);
  assert.ok(r!.caveats.includes(NAME_TABLE_CAVEAT));
  assert.ok(r!.caveats.includes(PARTNER_PRIVACY_NOTE));
  assert.ok(r!.caveats.includes(SOULMATE_CAVEAT));
  assert.ok(r!.caveats.some((c) => c.includes("ไม่ใช่คำตัดสินความสัมพันธ์")));
  // ไม่ให้ชื่อ = ไม่มีชั้นชื่อ + ไม่มี caveat ตารางชื่อ (ไม่แบกเกินจำเป็น)
  const r2 = partnerMatchReading({ ...user, partnerBirthDate: "1992-05-20" });
  assert.equal(r2!.nameLayer, null);
  assert.ok(!r2!.caveats.includes(NAME_TABLE_CAVEAT));
  // วันเกิดเขาเป็น พ.ศ. = null (ไม่เดา)
  assert.equal(partnerMatchReading({ ...user, partnerBirthDate: "2535-05-20" }), null);
});

test("ภพปัตนิเช็คไขว้ — ตรง (กันย์↔มีน) ขึ้นจุดแข็ง · ไม่ตรงไม่ขึ้น · ไม่รู้ลัคนา = null ไม่เดา", () => {
  const base = { userDominant: "Fire" as const, userMissing: [] as ("Fire")[], userBirthDate: "1986-10-07", partnerBirthDate: "1992-05-20" };
  const match = partnerMatchReading({ ...base, userLagna: "กันย์", partnerLagna: "มีน" })!;
  assert.ok(match.patni && match.patni.match === true);
  assert.ok(match.advice.strengths.some((s) => s.includes("ภพคู่ครอง")), "ตรงปัตนิต้องขึ้นจุดแข็ง");
  const noMatch = partnerMatchReading({ ...base, userLagna: "กันย์", partnerLagna: "เมษ" })!;
  assert.ok(noMatch.patni && noMatch.patni.match === false);
  assert.ok(!noMatch.advice.strengths.some((s) => s.includes("ภพคู่ครอง")));
  const unknown = partnerMatchReading(base)!;
  assert.equal(unknown.patni, null);
});

// ---- ตัวเลือกรูปลักษณ์ (23 ส.ค. 2569 — "แนวดารา" แบบปลอดภัย: preset เท่านั้น) ----
import { LOOK_STYLES, FACE_STYLES, AGE_STYLES, SOULMATE_LOOK_NOTE } from "../lib/engine/soulmate";

test("สัญชาติ/สไตล์ลุค — preset เข้า prompt ตรงตัว · ค่านอก enum ตกเป็นลุคไทย (กันอ้างชื่อบุคคลจริง)", () => {
  // ครบ 8 สัญชาติ/สไตล์ (ผู้ใช้เคาะ: เกาหลี ฝรั่ง ไทย ญี่ปุ่น อาหรับ และอื่นๆ)
  assert.equal(Object.keys(LOOK_STYLES).length, 8);
  for (const k of ["thai", "korean", "japanese", "western", "arab"]) assert.ok(k in LOOK_STYLES);
  const p = soulmateImagePrompt({ gender: "female", element: "Water", look: "korean" });
  assert.ok(p.includes(LOOK_STYLES.korean.en));
  assert.ok(!p.includes("Thai appearance"), "เลือกเกาหลีแล้วต้องไม่มีลุคไทยปน");
  // 🔴 ค่าที่ไม่ใช่ preset (เช่น ชื่อดาราจริง) ต้องไม่มีทางเข้า prompt — ตกเป็น default ไทย
  const inj = soulmateImagePrompt({ gender: "female", element: "Water", look: "looks like Nadech Kugimiya" });
  assert.ok(!inj.includes("Nadech"));
  const base = soulmateImagePrompt({ gender: "female", element: "Water" });
  assert.equal(inj, base, "ค่านอก enum = เหมือนไม่ได้เลือกเลย (default ไทย)");
  // สไตล์ทุกตัวเป็นคำบรรยายภูมิภาค/สไตล์ล้วน ห้ามอ้างอิงชื่อบุคคลจริง
  for (const v of Object.values(LOOK_STYLES)) {
    assert.ok(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(v.en.replace(/Thai|Korean|Japanese|Chinese|Western|Caucasian|European|Middle Eastern|South Asian|Asian-Western|Southeast Asian/g, "")), `ห้ามมีชื่อบุคคล: ${v.en}`);
  }
  // โครงหน้า/วัยยังรับได้ทาง engine (ทางเลือกอนาคต) แต่ไม่บังคับ — และโน้ตบังคับยังครบ
  assert.ok(SOULMATE_LOOK_NOTE.includes("ไม่ใช่คำทำนาย"));
});

import { soulmateCollagePrompt, OUTFIT_MOOD_BY_ELEMENT } from "../lib/engine/soulmate";

test("คอลลาจรูปเดียวหลายอิริยาบถ — คนเดียวกันทุกช่อง + แต่งกาย/อารมณ์ตามธาตุ + injection-safe", () => {
  const p = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "korean" });
  assert.ok(p.includes("one single person"), "ต้องยืนยันว่าเป็นคนเดียว");
  assert.ok(p.includes("2x2 grid"), "ต้องเป็นคอลลาจ 2x2");
  assert.ok(p.includes("Identical face"), "หน้าเหมือนกันทุกช่อง");
  assert.ok(p.includes("side profile"), "มีมุมภาพต่างกัน");
  assert.ok(p.includes("adult woman"));
  assert.ok(p.includes("Korean"), "สไตล์เกาหลีต้องเข้า prompt");
  assert.ok(p.includes(PHYSIOGNOMY_BY_ELEMENT.Fire.promptEn), "นรลักษณ์ ค.1 ตามธาตุต้องเข้า prompt");
  assert.ok(p.includes(OUTFIT_MOOD_BY_ELEMENT.Fire.outfitEn), "การแต่งกายตามธาตุ");
  assert.ok(p.includes(OUTFIT_MOOD_BY_ELEMENT.Fire.moodEn), "อารมณ์ภาพตามธาตุ");
  assert.ok(p.includes("modest"), "ต้องสุภาพเสมอ");
  // รายละเอียดผิว/รูขุมขน = ของสไตล์ภาพถ่าย (default เปลี่ยนเป็นสเก็ตช์ 2 ก.ย. 2569)
  const pPhoto = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "korean", style: "photo" });
  assert.ok(pPhoto.includes("visible pores"), "สไตล์ภาพถ่ายต้องมีรายละเอียดผิว/รูขุมขน");
  assert.ok(p.includes("no text"), "ห้ามตัวอักษรในภาพ");
  const p2 = soulmateCollagePrompt({ gender: "female", element: "Water", look: "korean" });
  assert.notEqual(p, p2, "ธาตุต่างกันชุด/อารมณ์ต้องต่างกัน");
  assert.ok(p2.includes(OUTFIT_MOOD_BY_ELEMENT.Water.outfitEn));
  // ทุกธาตุต้องมีวลีรูปร่างใน prompt ภาพ (สูงโปร่ง/ล่ำสัน/มีน้ำมีนวล ฯลฯ — ผู้ใช้ขอ)
  for (const el of ["Wood", "Fire", "Earth", "Metal", "Water"] as const) {
    assert.ok(/build|figure|waist|shoulders/.test(PHYSIOGNOMY_BY_ELEMENT[el].promptEn), `ธาตุ ${el} ต้องมีวลีรูปร่างใน promptEn`);
  }
  // วลีเสริมจากชั้น Jyotish เข้า prompt · ไม่ส่ง = prompt เดิมเป๊ะ (backward compat)
  const plain = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai" });
  const withTraits = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", extraTraitsEn: ["tall lean composed mature appearance"] });
  assert.ok(withTraits.includes("tall lean composed mature appearance"));
  assert.equal(soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", extraTraitsEn: [] }), plain);
  const evil = soulmateCollagePrompt({ gender: "male", element: "Earth", look: "Kim Soo-hyun lookalike" });
  const def = soulmateCollagePrompt({ gender: "male", element: "Earth", look: null });
  assert.equal(evil, def, "look นอก preset ต้องเท่ากับ default ไทย");
});

import { nameElement as nameElementFn } from "../lib/engine/naming";
import { namePower as namePowerFn, reduceTo99 as reduceTo99Fn } from "../lib/engine/card-id";
import { lookup2digit as lookup2digitFn } from "../lib/engine/numerology";
import { OUTFIT_MOOD_TH } from "../lib/engine/soulmate";

test("ชั้นเสริมธาตุจากชื่อผู้ใช้ — มีชื่อ = nameLayer + NAME_TABLE_CAVEAT · ไม่มีชื่อ = null ไม่แตะ caveat เดิม", () => {
  // ไม่มีชื่อ → เหมือนเดิมทุกอย่าง (backward compatible)
  const base = soulmateReading("กันย์", "Fire", ["Water"]);
  assert.equal(base.nameLayer, null);
  assert.ok(!base.caveats.includes(NAME_TABLE_CAVEAT));
  // มีชื่อ → ธาตุชื่อจาก engine จริง (Logic 19) + fit จาก wuXingScore มุมเดียวกับเคมีหลัก
  const withName = soulmateReading("กันย์", "Fire", ["Water"], "สมชาย รักดี");
  assert.ok(withName.nameLayer, "ต้องมี nameLayer เมื่อให้ชื่อ");
  const expectEl = nameElementFn("สมชาย รักดี");
  assert.ok(expectEl, "ชื่อทดสอบต้องอ่านธาตุได้");
  const expectFit = wuXingScore(expectEl!, withName.partner.element, ["Water"]);
  assert.deepEqual(withName.nameLayer!.fit, expectFit, "fit ต้องตรง wuXingScore ตัวจริง");
  // เลขศาสตร์+การ์ดต้องมาจาก engine จริง (NamePower verify แล้ว → reduceTo99 → ตาราง 00-99)
  const np = namePowerFn("สมชาย รักดี");
  assert.equal(withName.nameLayer!.namePower, np, "เลขศาสตร์ชื่อต้องตรง namePower");
  const card = lookup2digitFn(reduceTo99Fn(np));
  assert.equal(withName.nameLayer!.card.id, card.input);
  assert.equal(withName.nameLayer!.card.name, card.energy_name, "ไม่มี energy = การ์ดเลขชื่อ (พฤติกรรมเดิม)");
  // มติ 31 ส.ค. 2569 + ผู้ทดลองทัก 1 ก.ย.: มีวันเกิด → การ์ดต้องเป็น "การ์ดพลังงานสูตรรวม"
  // ตัวเดียวกับหน้า /profile (Birth+Name+Time+Day)
  {
    const { personalEnergyNumber } = require("../lib/engine/card-id");
    const withEnergy = soulmateReading("กันย์", "Fire", ["Water"], "สมชาย รักดี", { birthDate: "1990-03-15", birthTime: "18:30" });
    const expectCard = lookup2digitFn(personalEnergyNumber("1990-03-15", { name: "สมชาย รักดี", birthTime: "18:30" }));
    assert.equal(withEnergy.nameLayer!.card.id, expectCard.input, "การ์ดชั้นชื่อต้องตรงการ์ดพลังงานสูตรรวม");
    assert.equal(withEnergy.nameLayer!.namePower, np, "เลขศาสตร์ชื่อยังเป็น NamePower ของชื่อ (ไม่เปลี่ยน)");
    assert.notEqual(withEnergy.nameLayer!.card.id, card.input, "เคสนี้สองการ์ดต้องต่างกันจริง (พิสูจน์ว่า energy มีผล)");
  }
  // มุมธาตุชื่อ: ธาตุคู่ = อันดับ 1 ของ wuXingScore(ธาตุชื่อ, แต่ละธาตุ, ที่ขาด) + ตาราง ค.1/สไตล์ตรงธาตุนั้น
  const lens = withName.nameLayer!.lens!;
  assert.ok(lens, "โหมดเนื้อคู่ต้องมี lens");
  const lensBest = (["Wood", "Fire", "Earth", "Metal", "Water"] as const)
    .map((c) => ({ c, sc: wuXingScore(expectEl!, c, ["Water"]).final_score }))
    .sort((a, b) => b.sc - a.sc)[0].c;
  assert.equal(lens.partnerElement, lensBest, "ธาตุคู่มุมชื่อต้องเป็นอันดับ 1 จาก wuXingScore จริง");
  assert.deepEqual(lens.appearance, PHYSIOGNOMY_BY_ELEMENT[lensBest], "รูปลักษณ์ต้องเป็น ค.1 ของธาตุนั้น");
  assert.equal(lens.styleTh, OUTFIT_MOOD_TH[lensBest]);
  assert.ok(withName.caveats.includes(NAME_TABLE_CAVEAT), "caveat ตารางอักษรต้องติดมาเสมอ");
  // โหมดธาตุ (ไม่มีเวลาเกิด) ก็ได้ชั้นนี้เช่นกัน
  const el = soulmateElementReading("Fire", ["Water"], "สมชาย รักดี");
  assert.ok(el.nameLayer);
  assert.ok(el.caveats.includes(NAME_TABLE_CAVEAT));
  // ชื่อว่าง/ช่องว่างล้วน → null
  assert.equal(soulmateReading("กันย์", "Fire", ["Water"], "   ").nameLayer, null);
});


test("สองเส้นทางเนื้อคู่ (Dual Path 25 ส.ค. 2569) — ทางแยกจริงเท่านั้น · ค่าจาก engine ล้วน · ตำรา = ทาง ก เสมอ", async () => {
  const { soulmateDualPath, DUAL_PATH_CAVEAT, PHYSIOGNOMY_BY_ELEMENT, OUTFIT_MOOD_TH } = await import("../lib/engine/soulmate");
  const { wuXingScore } = await import("../lib/engine/element");
  // เคสจริงของผู้ใช้: ไฟเด่น ขาดน้ำ · ตำราชี้น้ำ · ใจเลือกไม้ → สองทาง +2 เท่ากัน
  const dp = soulmateDualPath("Fire", ["Water"], "Water", "Wood")!;
  assert.equal(dp.a.key, "ก");
  assert.equal(dp.a.element, "Water", "ทาง ก = ทางตำราเสมอ");
  assert.equal(dp.b.element, "Wood");
  assert.equal(dp.a.chemistry.final_score, wuXingScore("Fire", "Water", ["Water"]).final_score);
  assert.equal(dp.b.chemistry.final_score, wuXingScore("Fire", "Wood", ["Water"]).final_score);
  assert.ok(dp.comparisonTh.includes("เท่ากัน"), "เคสนี้สองทาง +2 เท่ากัน");
  assert.ok(dp.comparisonTh.includes("เลือกตามใจได้"), "ต้องสื่อว่าเลือกได้โดยไม่ฝืนดวง");
  assert.equal(dp.a.appearance, PHYSIOGNOMY_BY_ELEMENT.Water, "รูปลักษณ์จาก ค.1 จริง");
  assert.equal(dp.b.styleTh, OUTFIT_MOOD_TH.Wood);
  assert.ok(dp.caveats.includes(DUAL_PATH_CAVEAT));
  // ไม่มีทางแยก = null (ธาตุตรงกัน / ไม่ระบุ)
  assert.equal(soulmateDualPath("Fire", ["Water"], "Water", "Water"), null);
  assert.equal(soulmateDualPath("Fire", ["Water"], "Water", null), null);
});

// --- นิสัยจากตาราง ค.1 (personaTh) + โทนผิวภาพ (SKIN_TONES) — 25 ส.ค. 2569 (ผู้ใช้เคาะ "ทั้งสองอย่าง") ---
test("personaTh ค.1 คำต่อคำครบ 5 ธาตุ + dual-path/name-lens ใช้ ค.1 จริง", async () => {
  const { PHYSIOGNOMY_BY_ELEMENT, soulmateDualPath } = await import("../lib/engine/soulmate");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Wood.personaTh, "มีความคิดสร้างสรรค์, ชอบเรียนรู้, มีความสามารถเฉพาะทาง, แต่อาจอ่อนไหวและเจ้าอารมณ์");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Fire.personaTh, "เป็นนักคิด, มีจินตนาการสูง, สติปัญญาดี, วางแผนเก่ง, แต่ก็อ่อนไหวและใจร้อนได้ง่าย");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Earth.personaTh, "มีความอดทนสูง, หนักแน่น, มีความรับผิดชอบ, ยึดมั่นในกฎระเบียบ, แต่ไม่ชอบการเปลี่ยนแปลง");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Metal.personaTh, "เป็นคนแข็งแกร่ง, ชัดเจน, ตรงไปตรงมา, เป็นนักจัดการที่ดี, ฉลาด, และกล้าหาญ");
  assert.equal(PHYSIOGNOMY_BY_ELEMENT.Water.personaTh, "พูดเก่ง, มีมนุษยสัมพันธ์ดี, ปรับตัวเก่ง, อารมณ์ดีและสนุกสนาน");
  // สองเส้นทางต้องเล่านิสัยด้วยข้อมูล ค.1 แท้ (ไม่ใช่เทมเพลต ELEMENT_PERSONA)
  const dp = soulmateDualPath("Earth", ["Water"], "Water", "Wood");
  assert.ok(dp, "น้ำ↔ไม้ ต้องเกิดทางแยก");
  assert.equal(dp!.a.traitsTh, PHYSIOGNOMY_BY_ELEMENT.Water.personaTh);
  assert.equal(dp!.b.traitsTh, PHYSIOGNOMY_BY_ELEMENT.Wood.personaTh);
});

test("SKIN_TONES — enum ปลอดภัย: ค่านอก enum = prompt เดิมเป๊ะ · ค่าจริง = วลีเข้า prompt", async () => {
  const { SKIN_TONES, soulmateCollagePrompt } = await import("../lib/engine/soulmate");
  assert.deepEqual(Object.keys(SKIN_TONES), ["fair", "medium", "tan", "deep"]);
  const base = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai" });
  // injection: ชื่อบุคคลจริง/ค่านอก enum ถูกเพิกเฉยทั้งหมด
  assert.equal(soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", skin: "like a famous actress" }), base);
  assert.equal(soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", skin: null }), base);
  const withSkin = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", skin: "tan" });
  assert.ok(withSkin.includes(SKIN_TONES.tan.en), "วลีโทนผิวต้องเข้า prompt");
  assert.notEqual(withSkin, base);
});

test("คอลลาจ — เพศถูกย้ำทุกท่า/ทุกช่อง (แก้เพศหลุด 1 ก.ย. 2569)", async () => {
  const { soulmateCollagePrompt } = await import("../lib/engine/soulmate");
  const f = soulmateCollagePrompt({ gender: "female", element: "Water", look: "thai" });
  // "woman" ต้องปรากฏหลายครั้ง (ต้นเรื่อง + บังคับทุกช่อง) และสรรพนาม her ทอทุกท่า
  assert.ok((f.match(/woman/g) ?? []).length >= 3, "ต้องย้ำ woman อย่างน้อย 3 ครั้ง");
  assert.ok((f.match(/\bher\b/g) ?? []).length >= 4, "สรรพนาม her ต้องทอเข้าทุกท่า");
  assert.ok(f.includes("same gender in all four panels"));
  assert.ok(!/\bman\b/.test(f), "prompt หญิงห้ามมีคำ man เดี่ยวๆ (กันเหนี่ยวนำ)");
  const m = soulmateCollagePrompt({ gender: "male", element: "Fire", look: "thai" });
  assert.ok((m.match(/\bman\b/g) ?? []).length >= 3 && (m.match(/\bhis\b/g) ?? []).length >= 4);
  assert.ok(!/woman/.test(m), "prompt ชายห้ามมีคำ woman");
});

test("คำบรรยายภาพตามเส้นทางที่เลือก — ทุกช่องจาก SoulmatePath จริง + ตัวคั่น OG คงเดิม", async () => {
  const { soulmateDualPath, soulmatePathImageCaptions, PHYSIOGNOMY_BY_ELEMENT, OUTFIT_MOOD_TH } = await import("../lib/engine/soulmate");
  const dp = soulmateDualPath("Earth", ["Water"], "Water", "Wood");
  assert.ok(dp);
  const cap = soulmatePathImageCaptions(dp!.b);
  assert.ok(cap[0].includes("แนวทาง ข") && cap[0].includes(dp!.b.traitsTh), "นิสัยต้องเป็นของทาง ข");
  assert.ok(cap[0].includes(" · แนวโน้มรูปลักษณ์ตามนรลักษณ์: "), "ตัวคั่นสำหรับ OG /sm ต้องคงเดิม");
  assert.ok(cap[0].includes(PHYSIOGNOMY_BY_ELEMENT.Wood.faceTh) && cap[0].includes(PHYSIOGNOMY_BY_ELEMENT.Wood.bodyTh), "รูปลักษณ์ต้องเป็น ค.1 ของธาตุทาง ข (ไม่ใช่ทางตำรา)");
  assert.ok(!cap[0].includes(PHYSIOGNOMY_BY_ELEMENT.Water.bodyTh), "ห้ามปนรูปลักษณ์ทางตำราเมื่อเลือก ข");
  assert.ok(cap[1].includes(OUTFIT_MOOD_TH.Wood));
  assert.ok(cap[2].includes(dp!.b.chemistry.relation_th));
});

// --- สไตล์ภาพ (ART_STYLES) — ผู้ใช้เคาะ 2 ก.ย. 2569: สเก็ตช์สีน้ำเป็น default ---
test("ART_STYLES — default สเก็ตช์ · photo เลือกกลับได้ · ค่านอก enum ตกเป็น default", async () => {
  const { ART_STYLES, DEFAULT_ART_STYLE, soulmateCollagePrompt } = await import("../lib/engine/soulmate");
  assert.deepEqual(Object.keys(ART_STYLES), ["sketch", "photo"]);
  assert.equal(DEFAULT_ART_STYLE, "sketch");
  const def = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai" });
  assert.ok(def.includes("pencil sketch") && def.includes("watercolor"), "default ต้องเป็นสเก็ตช์สีน้ำ");
  assert.ok(!def.includes("photorealistic"), "default ต้องไม่ใช่ภาพถ่าย");
  const photo = soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", style: "photo" });
  assert.ok(photo.includes("photo collage") && photo.includes("photorealistic"));
  // injection-safe: ค่านอก enum = default เป๊ะ
  assert.equal(soulmateCollagePrompt({ gender: "female", element: "Fire", look: "thai", style: "van gogh style" }), def);
  // ข้อจำกัดตัวตนต้องคงอยู่ทุกสไตล์ (มิดชิด/ท่าครบ/หัวไม่โดนครอป/no-text)
  for (const p of [def, photo]) {
    assert.ok(p.includes("modest") && p.includes("no text") && p.includes("never cropped"));
  }
});
