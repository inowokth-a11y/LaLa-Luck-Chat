// เทสต์ถังคำถามรวม (lib/chat/questions.ts) — โมเดล 1 ฟรี +โบนัส (ผู้ใช้ตัดสิน 1 ส.ค. 2569)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FREE_QUESTIONS_TOTAL,
  QUESTIONS_BUCKET,
  checkQuestionPool,
  questionPoolExhaustedMessage,
  questionNeedsLoginMessage,
} from "../lib/chat/questions";

test("เริ่มต้นได้คำถามฟรี 1 ข้อ (ผูกกับโมเมนต์การ์ด Logic 1)", () => {
  assert.equal(FREE_QUESTIONS_TOTAL, 1);
  const q = checkQuestionPool(0);
  assert.equal(q.allowed, true);
  assert.equal(q.remaining, 1);
});

test("ใช้ครบแล้วถูกปิด — ไม่มีถังแยกราย Logic อีกแล้ว", () => {
  const q = checkQuestionPool(1);
  assert.equal(q.allowed, false);
  assert.equal(q.remaining, 0);
});

test("โบนัสจากแชร์/รางวัลขยายเพดาน (+2 → รวม 3)", () => {
  const q = checkQuestionPool(1, 2);
  assert.equal(q.allowed, true);
  assert.equal(q.remaining, 2);
  assert.equal(q.limit, 3);
});

test("🔴 ค่าเพี้ยน (ติดลบ/NaN/ทศนิยม) ต้องไม่ทำให้ได้โควตาเพิ่ม", () => {
  assert.equal(checkQuestionPool(-5).remaining, 1, "used ติดลบ = 0");
  assert.equal(checkQuestionPool(NaN).remaining, 1);
  assert.equal(checkQuestionPool(0, -9).limit, 1, "bonus ติดลบ = 0");
  assert.equal(checkQuestionPool(0.9).remaining, 1, "ทศนิยมปัดลง");
});

test("bucket ชื่อ questions — route/แถบสถานะ/รางวัลต้องใช้ค่านี้ตัวเดียว", () => {
  assert.equal(QUESTIONS_BUCKET, "questions");
});

test("ข้อความหมดโควตาบอกทางไปต่อ (เครดิต) · ข้อความชวนล็อกอินบอกจำนวนฟรี", () => {
  assert.ok(/เครดิต/.test(questionPoolExhaustedMessage()));
  assert.ok(questionNeedsLoginMessage().includes(String(FREE_QUESTIONS_TOTAL)));
});
