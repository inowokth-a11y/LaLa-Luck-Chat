// เทสต์คำถามชวนถามต่อ (lib/chat/suggest.ts) — เทมเพลต ฿0 ห้ามพึ่ง AI

import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestQuestions, SUGGESTION_MAX_LEN } from "../lib/chat/suggest";

test("ทุกฟังก์ชันที่มีแชท (1,7,8,20,21) มีคำถามชวน 2-3 ข้อ ไม่ซ้ำ ไม่ว่าง", () => {
  for (const id of [1, 7, 8, 20, 21]) {
    const qs = suggestQuestions(id);
    assert.ok(qs.length >= 2 && qs.length <= 3, `logic ${id} ได้ ${qs.length} ข้อ`);
    assert.equal(new Set(qs).size, qs.length, `logic ${id} มีคำถามซ้ำ`);
    for (const q of qs) assert.ok(q.trim().length > 0);
  }
});

test("ไม่มีผลบนหน้า (null) หรือ logic ที่ไม่รู้จัก → ชุดคำถามทั่วไป", () => {
  const general = suggestQuestions(null);
  assert.ok(general.length >= 2);
  assert.deepEqual(suggestQuestions(999), general);
});

test("ความยาวทุกข้อไม่เกินเพดานชิป (ต้องพอดีจอมือถือ)", () => {
  for (const id of [1, 7, 8, 20, 21, null] as const) {
    for (const q of suggestQuestions(id)) {
      assert.ok([...q].length <= SUGGESTION_MAX_LEN, `"${q}" ยาว ${[...q].length} > ${SUGGESTION_MAX_LEN}`);
    }
  }
});

test("ไม่มีอักขระต่างภาษาปลอมปน (กัน Cyrillic о ที่เคยหลุด)", () => {
  for (const id of [1, 7, 8, 20, 21, null] as const) {
    for (const q of suggestQuestions(id)) {
      assert.ok(!/[Ѐ-ӿ]/.test(q), `พบอักขระ Cyrillic ใน "${q}"`);
    }
  }
});

// ---- heuristic เส้น hybrid (lib/chat/plan.ts — 2 ส.ค. 2569) ----
import { questionSuggestsComputation } from "../lib/chat/plan";

test("questionSuggestsComputation — จับคำถามที่มีเลข/ทะเบียน/เบอร์ (เปิดเส้น hybrid)", () => {
  assert.ok(questionSuggestsComputation('ฉันใช้รถทะเบียน "จง 6266" และอยู่บ้านเลขที่ 444 ส่งผลยังไง'));
  assert.ok(questionSuggestsComputation("เบอร์โทรของฉันดีไหม")); // มีคำ "เบอร์" แม้ไม่มีเลข
  assert.ok(questionSuggestsComputation("บ้านเลขที่ของฉันเข้ากับธาตุไหม"));
  assert.ok(questionSuggestsComputation("เลข ๙๙ ดีไหม")); // เลขไทย
  // คำถามที่ตอบจาก context ได้ — ไม่ต้องจ่ายค่า planner เพิ่ม
  assert.equal(questionSuggestsComputation("ธาตุที่ฉันขาดควรเสริมยังไงดี"), false);
  assert.equal(questionSuggestsComputation("การ์ดใบนี้บอกนิสัยอะไรของฉัน"), false);
});
