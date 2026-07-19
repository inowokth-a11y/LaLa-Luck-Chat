// เทสต์การจับคู่แบบรู้ขอบเขตคำไทย (lib/engine/dream-match.ts)
//
// ⚠️ **ไม่ใช่ golden parity test** — จงใจให้ผลต่างจาก Python เพราะ Python ยังใช้ substring
//    ที่มีบั๊ก over-match อยู่ (Python ไม่มีตัวตัดคำไทยในตัว) การบังคับให้ตรงกัน = คงบั๊กไว้

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hasThaiSegmentation,
  segmentThai,
  phraseInText,
  findSymbolMatchesSegmented,
} from "../lib/engine/dream-match";
import { findSymbolMatches, interpretDream } from "../lib/engine/dream";
import dreamDb from "../data/dream_master_db.json";

const DB = dreamDb as Parameters<typeof findSymbolMatchesSegmented>[1];

test("runtime นี้ตัดคำไทยได้ (ถ้าเทสต์นี้ตก แปลว่า Node ถูก build แบบ small-icu)", () => {
  assert.equal(hasThaiSegmentation(), true);
});

test("ตัดคำไทยถูกต้อง — 'เข้ามา' ต้องไม่กลายเป็น 'ข้าม'", () => {
  const words = segmentThai("ฝันว่างูเลื้อยเข้ามาในบ้าน");
  assert.deepEqual(words, ["ฝัน", "ว่า", "งู", "เลื้อย", "เข้า", "มา", "ใน", "บ้าน"]);
  assert.ok(!words.includes("ข้าม"));
});

test("phraseInText — จับวลีหลายคำที่ติดกันได้", () => {
  const words = segmentThai("ฝันว่ากระโดดข้ามรั้ว");
  assert.equal(phraseInText("ข้าม", words), true);
  assert.equal(phraseInText("กระโดด", words), true);
  assert.equal(phraseInText("รั้ว", words), true);
  assert.equal(phraseInText("งู", words), false);
});

test("🐛 บั๊กที่ต้องแก้: substring จับ 'ข้าม' ใน 'เข้ามา' — ตัดคำต้องไม่จับ", () => {
  const dream = "ฝันว่างูเลื้อยเข้ามาในบ้าน";

  const old = findSymbolMatches(dream).map((m) => m.dream_object);
  const neu = findSymbolMatchesSegmented(dream, DB)!.map((m) => m.dream_object);

  assert.ok(old.includes("กระโดด / ข้าม"), "เดิมต้องจับผิด (ยืนยันว่าบั๊กมีจริง)");
  assert.ok(!neu.includes("กระโดด / ข้าม"), "ใหม่ต้องไม่จับผิดแล้ว");
});

test("ของจริงยังจับได้ครบ ไม่ได้แก้บั๊กแล้วพลาดของถูก", () => {
  for (const [dream, expected] of [
    ["ฝันว่ากระโดดข้ามรั้ว", "กระโดด / ข้าม"],
    ["เมื่อคืนฝันเห็นน้ำท่วมบ้าน", "น้ำท่วม"],
    ["ฝันว่าฟันหลุด", "ฟัน"],
  ] as const) {
    const got = findSymbolMatchesSegmented(dream, DB)!.map((m) => m.dream_object);
    assert.ok(got.includes(expected), `"${dream}" ควรเจอ "${expected}" แต่ได้ ${got.join(",")}`);
  }
});

test("interpretDream — โหมดเริ่มต้นยังเป็น substring (คง parity กับ Python)", () => {
  const dream = "ฝันว่างูเลื้อยเข้ามาในบ้าน";
  const objs = interpretDream(dream).symbol_matches!.map((m) => m.object);
  assert.ok(objs.includes("กระโดด / ข้าม"), "โหมดเริ่มต้นต้องเหมือน Python เป๊ะ");
});

test("interpretDream — เปิดโหมดตัดคำแล้วบั๊กหาย (โหมดที่ production ใช้)", () => {
  const dream = "ฝันว่างูเลื้อยเข้ามาในบ้าน";
  const objs = interpretDream(dream, null, false, true).symbol_matches!.map((m) => m.object);
  assert.ok(!objs.includes("กระโดด / ข้าม"));
  assert.ok(objs.includes("บ้าน / ที่อยู่อาศัย"), "ของจริงต้องยังอยู่");
});

test("Safety Gate ยังมาก่อนเสมอ แม้เปิดโหมดตัดคำ", () => {
  const r = interpretDream("ฝันเห็นงู แล้วตื่นมาอยากฆ่าตัวตาย", null, false, true);
  assert.equal(r.intercepted, true);
  assert.ok(r.crisis_resource_message);
});

test("ข้อความว่าง/ไม่มีคำไทยไม่ทำให้พัง", () => {
  assert.deepEqual(segmentThai(""), []);
  assert.equal(phraseInText("งู", []), false);
  assert.equal(phraseInText("", ["ฝัน"]), false);
  assert.deepEqual(findSymbolMatchesSegmented("", DB), []);
});
