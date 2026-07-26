// เทสต์ตัวดักคำถามเลขเด็ด/หวย (lib/chat/lottery.ts)
import { test } from "node:test";
import assert from "node:assert/strict";

import { lotteryIntercept, LOTTERY_MESSAGE } from "../lib/chat/lottery";

test("จับคำขอหวย/เลขเด็ดหลากหลายสำนวน", () => {
  for (const q of [
    "ขอเลขเด็ดหน่อย",
    "งวดนี้หวยออกอะไร",
    "เลขที่จะออกงวดนี้คือ",
    "อยากถูกหวย ขอเลขล็อก",
    "ล็อตเตอรี่งวดนี้เลขอะไรดี",
    "สลากกินแบ่งเลขไหนดัง",
  ]) {
    const r = lotteryIntercept(q);
    assert.ok(r?.declined, `ควรดักได้: "${q}"`);
  }
});

test("🔴 ข้อความต้องไม่ทำนาย + เตือนการพนัน + ชวนกลับมาที่การคำนวณจริง", () => {
  assert.ok(/ไม่ทำนาย/.test(LOTTERY_MESSAGE), "ต้องบอกชัดว่าไม่ทำนาย");
  assert.ok(/สติ|พอประมาณ/.test(LOTTERY_MESSAGE), "ต้องเตือนเล่นการพนันอย่างมีสติ");
  assert.ok(/ธาตุ|ฤกษ์|ทะเบียน/.test(LOTTERY_MESSAGE), "ต้องชวนกลับมาที่สิ่งที่คำนวณได้จริง");
  assert.ok(!/เลขที่จะถูก|รับรอง|การันตี/.test(LOTTERY_MESSAGE), "ห้ามสัญญาว่าจะถูกรางวัล");
});

test("คำถามปกติเรื่องเลข (ทะเบียน/เบอร์) ต้องไม่ถูกดัก", () => {
  for (const q of [
    "เลขทะเบียนรถ 88 ดีไหม",
    "เบอร์โทร 0812345678 เป็นยังไง",
    "เลข 7 หมายถึงอะไร",
    "ธาตุประจำตัวฉันคืออะไร",
  ]) {
    assert.equal(lotteryIntercept(q), null, `ไม่ควรดัก: "${q}"`);
  }
});

test("🔴 คำอ่อน (เลขเด็ด) + บริบทเลขจริง → ปล่อยผ่าน (ไม่ใช่หวย)", () => {
  // "เลขเด็ดทะเบียนรถ" = ทะเบียนมงคล ไม่ใช่หวย
  assert.equal(lotteryIntercept("ขอเลขเด็ดทะเบียนรถมงคลหน่อย"), null);
  assert.equal(lotteryIntercept("เลขเด็ดประจำตัวตามธาตุ"), null);
  assert.equal(lotteryIntercept("แนะนำเบอร์โทรเลขดังๆ"), null);
});

test("🔴 คำอ่อนลอยๆ ไม่มีบริบท → ดัก (default = หวย)", () => {
  assert.ok(lotteryIntercept("ขอเลขเด็ดหน่อย")?.declined);
  assert.ok(lotteryIntercept("มีเลขดังไหม")?.declined);
});

test("🔴 คำแข็ง (หวย/งวด) → ดักเสมอ แม้มีคำว่าทะเบียน", () => {
  assert.ok(lotteryIntercept("ขอเลขหวยงวดนี้ เอาเลขทะเบียนรถมาด้วย")?.declined);
  assert.ok(lotteryIntercept("ล็อตเตอรี่งวดหน้าออกอะไร")?.declined);
});
