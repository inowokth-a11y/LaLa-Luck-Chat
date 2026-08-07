// จับคำประสม + ลดสัญญาณรบกวนในการจับสัญลักษณ์ความฝัน (เฟส 2, 7 ส.ค. 2569)
import test from "node:test";
import assert from "node:assert/strict";
import { interpretDream, PRODUCTION_DREAM_DB } from "../lib/engine/dream";
import { rankAndDedupeSymbols } from "../lib/engine/dream-match";

const objectsOf = (text: string, day = "อังคาร") =>
  (interpretDream(text, day, false, true).symbol_matches ?? []).map((m) => m.object);

test("🔴 คำประสมหมวดสัตว์: 'งูเห่า' ต้องจับ 'งู' ได้ (ช่องว่างที่พบจากฝันจริงของผู้ใช้)", () => {
  const got = objectsOf("ฝันว่ามีคนจับงูเห่าใส่ถุงมาวางไว้ข้างโต๊ะทำงาน");
  assert.ok(got.some((o) => o.startsWith("งู")), `ควรจับงูได้ แต่ได้ ${got.join(",")}`);
  // งู + ไฟไหม้ มาจากตำราแก้เคล็ด (ฐาน 457 ไม่มีทั้งคู่) — ต้องอยู่ในฐาน production
  assert.ok(PRODUCTION_DREAM_DB.some((r) => r.dream_object === "งู / พญานาค" && r.kangxi_strokes === 11));
  assert.ok(objectsOf("ฝันว่าไฟไหม้บ้าน").includes("ไฟไหม้"));
});

test("กฎคำประสมต้องไม่ลามไปคำทั่วไป — 'งาน' ห้ามกลายเป็น 'งา'", () => {
  assert.ok(!objectsOf("ฝันว่าทำงานเสร็จแล้วกลับบ้าน").some((o) => o.includes("งา")));
  // แต่คำประสมจริงยังจับได้
  assert.ok(objectsOf("ฝันว่าเห็นงาช้างวางอยู่").some((o) => o.includes("งา")));
});

test("คำพ้องรูปในกับดัก: 'แผ่แม่เบี้ย' ไม่ใช่ 'แม่' · 'ต่อไป' ไม่ใช่ตัวต่อ · ของจริงยังจับได้", () => {
  assert.ok(!objectsOf("งูเห่าแผ่แม่เบี้ยและแลบลิ้น").some((o) => o.startsWith("แม่")));
  assert.ok(!objectsOf("ทำงานให้เสร็จ ต่อไปจะไปหาหมอ").some((o) => o.includes("ต่อ / แตน")));
  assert.ok(objectsOf("ฝันว่าแม่มาหาที่บ้าน").some((o) => o.startsWith("แม่")), "แม่ของจริงต้องยังจับได้");
});

test("จัดลำดับ+ตัดซ้ำ: คำนามรูปธรรมมาก่อนกริยา · ไม่ซ้ำ · ไม่เกิน 8 รายการ", () => {
  const rows = [
    { category: "การกระทำ", dream_object: "เดิน", chinese_char: "", kangxi_strokes: 1, element: "ไฟ", meaning_keyword: "" },
    { category: "สัตว์ร้าย", dream_object: "งู / พญานาค", chinese_char: "", kangxi_strokes: 11, element: "ไฟ", meaning_keyword: "" },
    { category: "สัตว์ร้าย", dream_object: "งู / พญานาค", chinese_char: "", kangxi_strokes: 11, element: "ไฟ", meaning_keyword: "" },
  ];
  const out = rankAndDedupeSymbols(rows);
  assert.deepEqual(out.map((r) => r.dream_object), ["งู / พญานาค", "เดิน"]);
  const many = Array.from({ length: 20 }, (_, i) => ({ ...rows[0], dream_object: `สิ่ง${i}`, category: "สถานที่" }));
  assert.equal(rankAndDedupeSymbols(many).length, 8);
});
