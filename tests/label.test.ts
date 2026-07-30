// เทสต์คะแนนองค์ประกอบฉลาก (lib/engine/label.ts) — ต่อยอด Logic 7 (ไม่ใช่ golden parity)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  motifElement,
  scoreLabelComposition,
  recommendForBrand,
  MOTIF_TO_ELEMENT,
  LABEL_COMPOSITION_CAVEAT,
} from "../lib/engine/label";

test("จับธาตุจากคำขอลวดลาย (สวนผลไม้=ไม้, น้ำ=น้ำ, ลายกนก=ไฟ)", () => {
  assert.equal(motifElement("อยากได้รูปสวนผลไม้"), "Wood");
  assert.equal(motifElement("มีคลื่นน้ำทะเล"), "Water");
  assert.equal(motifElement("ใส่ลายกนกไทย"), "Fire");
  assert.equal(motifElement("ภูเขาหิน"), "Earth");
  assert.equal(motifElement("ไม่มีลวดลายที่รู้จัก"), null);
});

test("🔴 กนกคำกว้าง = ไฟ (ตรวจกับที่มาของแม่ลายแล้ว 30 ก.ค. 2569 — หางไหล/เปลวไฟ)", () => {
  assert.equal(MOTIF_TO_ELEMENT["ลายกนก"], "Fire");
  assert.equal(MOTIF_TO_ELEMENT["กนก"], "Fire");
  assert.equal(motifElement("ลายกระหนก"), "Fire", 'สะกด "กระหนก" (มี ระ) ต้องแมตช์ด้วย — เดิมเป็นบั๊กหลุด');
  assert.equal(motifElement("กนกเปลว"), "Fire");
});

test("กนกตระกูลพืช = ไม้ (ใบเทศ/ผักกูด) — คำยาวต้องชนะ 'กนก' ที่เป็น substring", () => {
  assert.equal(motifElement("ลายกนกใบเทศ"), "Wood", "ใบเทศมาจากใบฝ้ายเทศ = พืช");
  assert.equal(motifElement("กระหนกผักกูด"), "Wood", "ผักกูดคือยอดเฟิร์น = พืช");
  assert.equal(motifElement("ลายก้านขด"), "Wood");
  // คำกว้างที่ไม่ระบุประเภทย่อย ยังเป็นไฟตามแม่ลาย
  assert.equal(motifElement("ใส่ลายกนกทอง"), "Fire");
});

test("แบรนด์ธาตุเดียวกับองค์ประกอบ → กลมกลืน (score บวก)", () => {
  const r = scoreLabelComposition({
    brandElement: "Fire",
    components: [{ kind: "สี", label: "แดง-ส้ม", element: "Fire" }],
  });
  assert.ok(r.components[0].score >= 1);
  assert.ok(r.harmonious.includes("แดง-ส้ม"));
});

test("🔴 องค์ประกอบพิฆาตแบรนด์ → คะแนนลบ + เข้า clashing", () => {
  // แบรนด์ไฟ + ภาพน้ำ (น้ำพิฆาตไฟ) และแบรนด์ไม่ได้ขาดน้ำ → -2
  const r = scoreLabelComposition({
    brandElement: "Fire",
    brandMissing: [],
    components: [{ kind: "ลวดลาย", label: "สายน้ำ", element: "Water" }],
  });
  assert.ok(r.components[0].score < 0);
  assert.ok(r.clashing.includes("สายน้ำ"));
});

test("🔴 Productive Clash: องค์ประกอบพิฆาตแต่แบรนด์ 'ขาดธาตุนั้น' → พลิกเป็นดี", () => {
  const r = scoreLabelComposition({
    brandElement: "Fire",
    brandMissing: ["Water"], // ขาดน้ำ
    components: [{ kind: "ลวดลาย", label: "สายน้ำ", element: "Water" }],
  });
  assert.equal(r.components[0].productiveClash, true);
  assert.ok(r.components[0].score > 0, "ธาตุที่ขาดแล้วพิฆาต ต้องกลายเป็นยา (+)");
});

test("คะแนนรวม + verdict + caveat", () => {
  const r = scoreLabelComposition({
    brandElement: "Fire",
    components: [
      { kind: "สี", label: "แดง", element: "Fire" },
      { kind: "ลวดลาย", label: "ดวงอาทิตย์", element: "Fire" },
    ],
  });
  assert.equal(typeof r.overallScore, "number");
  assert.ok(["excellent", "good", "mixed", "clash"].includes(r.verdict));
  assert.equal(r.caveat, LABEL_COMPOSITION_CAVEAT);
});

test("recommendForBrand เรียงธาตุที่เข้ากันดีสุดก่อน + มีตัวอย่างลวดลาย/สี", () => {
  const recs = recommendForBrand("Fire", []);
  assert.equal(recs.length, 5);
  for (let i = 1; i < recs.length; i++) assert.ok(recs[i - 1].score >= recs[i].score, "ต้องเรียงคะแนนมากไปน้อย");
  assert.ok(recs[0].motifs.length > 0 && recs[0].colors.length > 0, "ตัวเลือกอันดับต้นต้องมีลวดลาย+สีแนะนำ");
});
