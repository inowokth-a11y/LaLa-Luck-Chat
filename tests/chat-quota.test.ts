// เทสต์โควตาคำถาม AI Chat (lib/chat/quota.ts)
// ⚠️ ไม่ใช่ golden parity — ตรรกะใหม่ ไม่มีต้นฉบับ Python เทสต์คุมพฤติกรรมที่ตั้งใจ

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseQuota,
  serializeQuota,
  checkQuota,
  consumeQuota,
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

test("ถามครบ 2 แล้วถูกปิด", () => {
  let s = {};
  s = consumeQuota(s, 4);
  assert.equal(checkQuota(s, 4).remaining, 1);
  s = consumeQuota(s, 4);
  const q = checkQuota(s, 4);
  assert.equal(q.allowed, false);
  assert.equal(q.remaining, 0);
  assert.equal(q.reason, "quota_exhausted");
});

test("โควตาแยกกันคนละฟังก์ชัน — ใช้หมดที่หนึ่งไม่กระทบอีกที่", () => {
  let s = {};
  s = consumeQuota(s, 4);
  s = consumeQuota(s, 4);
  assert.equal(checkQuota(s, 4).allowed, false, "ฝันควรหมดแล้ว");
  assert.equal(checkQuota(s, 21).allowed, true, "เสี่ยงทายต้องยังถามได้");
  assert.equal(checkQuota(s, 8).remaining, 2);
});

test("Logic ที่ไม่ได้เปิดแชท ถามไม่ได้เลย", () => {
  const q = checkQuota({}, 99);
  assert.equal(q.allowed, false);
  assert.equal(q.reason, "logic_not_enabled");
});

test("🔴 ค่าติดลบใน cookie ต้องไม่ทำให้ได้โควตาเพิ่ม (กันปลอมแปลง)", () => {
  const s = parseQuota(JSON.stringify({ "4": -100 }));
  assert.equal(s["4"], undefined, "ค่าติดลบต้องถูกทิ้ง ไม่ใช่เชื่อตาม");
  assert.equal(checkQuota(s, 4).remaining, 2, "ต้องได้แค่โควตาปกติ ไม่ใช่ 102");
});

test("cookie พังรูปแบบต่างๆ ต้องไม่ throw และไม่ให้โควตาเกิน", () => {
  for (const bad of [undefined, null, "", "ไม่ใช่ json", "[1,2,3]", "null", '{"4":"abc"}', '{"4":1e999}']) {
    const s = parseQuota(bad as string);
    assert.doesNotThrow(() => checkQuota(s, 4));
    assert.ok(checkQuota(s, 4).remaining <= FREE_QUESTIONS_PER_LOGIC, `"${bad}" ให้โควตาเกิน`);
  }
});

test("ค่าทศนิยมถูกปัดลง (กันส่ง 1.9 เพื่อให้เหลือโควตามากขึ้น)", () => {
  const s = parseQuota(JSON.stringify({ "4": 1.9 }));
  assert.equal(s["4"], 1);
});

test("serialize แล้ว parse กลับได้ค่าเดิม", () => {
  const s = consumeQuota(consumeQuota({}, 4), 21);
  assert.deepEqual(parseQuota(serializeQuota(s)), s);
});

test("consumeQuota ไม่แก้ state เดิม (immutable)", () => {
  const before = { "4": 1 };
  const after = consumeQuota(before, 4);
  assert.equal(before["4"], 1, "ของเดิมต้องไม่ถูกแก้");
  assert.equal(after["4"], 2);
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
