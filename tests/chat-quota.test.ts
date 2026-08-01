// เทสต์โควตาคำถาม AI Chat (lib/chat/quota.ts)
// ⚠️ ไม่ใช่ golden parity — ตรรกะใหม่ ไม่มีต้นฉบับ Python เทสต์คุมพฤติกรรมที่ตั้งใจ

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkQuota,
  quotaExhaustedMessage,
  FREE_QUESTIONS_PER_LOGIC,
  CHAT_ENABLED_LOGICS,
  CHAT_LOGIC_NAMES,
} from "../lib/chat/quota";

test("เริ่มต้นถามได้ 2 คำถามต่อฟังก์ชัน", () => {
  const q = checkQuota({}, 4);
  assert.equal(q.allowed, true);
  assert.equal(q.remaining, 2);
  assert.equal(q.limit, FREE_QUESTIONS_PER_LOGIC);
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

test("ใช้ครบ 2 แล้วถูกปิด (state สังเคราะห์จาก DB แบบที่ route สร้าง)", () => {
  assert.equal(checkQuota({ "4": 1 }, 4).allowed, true);
  const q = checkQuota({ "4": 2 }, 4);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "quota_exhausted");
});
