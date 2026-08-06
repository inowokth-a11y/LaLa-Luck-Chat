// เทสต์โควตาคำถาม AI Chat (lib/chat/quota.ts)
// ⚠️ ไม่ใช่ golden parity — ตรรกะใหม่ ไม่มีต้นฉบับ Python เทสต์คุมพฤติกรรมที่ตั้งใจ

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkQuota,
  quotaExhaustedMessage,
  FREE_QUESTIONS_PER_LOGIC,
  freeLimitForLogic,
  CHAT_ENABLED_LOGICS,
  CHAT_LOGIC_NAMES,
} from "../lib/chat/quota";

test("ค่าเริ่มต้น 2 ครั้ง · ทำนายฝันเหลือ 1 ครั้ง (ผู้ใช้ตัดสิน 6 ส.ค. 2569 — ต้นทุน AI-1 สูงสุด)", () => {
  const dream = checkQuota({}, 4);
  assert.equal(dream.allowed, true);
  assert.equal(dream.remaining, 1);
  assert.equal(freeLimitForLogic(4), 1);
  const oracle = checkQuota({}, 21);
  assert.equal(oracle.remaining, 2);
  assert.equal(freeLimitForLogic(21), FREE_QUESTIONS_PER_LOGIC);
});

test("ฝันใช้ 1 ครั้งแล้วหมดสิทธิ์ · ข้อความบอกจำนวนที่ถูกต้องต่อ logic", () => {
  const q = checkQuota({ "4": 1 }, 4);
  assert.equal(q.allowed, false);
  assert.ok(quotaExhaustedMessage(4).includes("ครบ 1 ครั้ง"));
  assert.ok(quotaExhaustedMessage(21).includes("ครบ 2 ครั้ง"));
});

test("Logic ที่ไม่ได้เปิดแชท ถามไม่ได้เลย", () => {
  const q = checkQuota({}, 99);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "logic_not_enabled");
});

test("ทุก Logic ที่เปิดแชทต้องมีชื่อภาษาไทย", () => {
  for (const id of CHAT_ENABLED_LOGICS) {
    assert.ok(CHAT_LOGIC_NAMES[id], `Logic ${id} ไม่มีชื่อ`);
  }
});

test("ข้อความตอนโควตาหมดต้องบอกตรงๆ ไม่หลอกว่าได้ฟรีเพิ่ม", () => {
  const m = quotaExhaustedMessage(4);
  assert.ok(m.includes("ทำนายฝัน"), "ควรบอกว่าฟังก์ชันไหน");
  assert.ok(/เครดิต|เติม/.test(m), "ควรบอกทางออกว่าต้องเติมเครดิต");
  assert.ok(!/ฟรีไม่จำกัด|unlimited/i.test(m), "ห้ามสัญญาว่าฟรีไม่จำกัด");
});

test("ใช้ครบลิมิตแล้วถูกปิด (state สังเคราะห์จาก DB แบบที่ route สร้าง)", () => {
  assert.equal(checkQuota({ "21": 1 }, 21).allowed, true); // เสี่ยงทาย limit 2
  const q = checkQuota({ "21": 2 }, 21);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "quota_exhausted");
});
