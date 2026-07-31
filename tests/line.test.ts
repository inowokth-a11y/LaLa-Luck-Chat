// เทสต์ชั้น LINE — ตรวจ "ผู้ใช้จะได้เห็นอะไร" โดยไม่ยิง LINE จริง
// ทั้งไฟล์นี้ทดสอบเฉพาะส่วน pure (lib/line/reply.ts + clampText) — ไม่เรียก network

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReply, welcomeMessage, errorMessage, unsupportedMessage, ackMessage, LIFF_PATHS, CHAT_IMPLEMENTED } from "../lib/line/reply";
import { clampText, textMessage, liffButton } from "../lib/line/client";
import { routeByKeyword, LOGIC_NAMES } from "../lib/engine/router";

const BASE = "https://example.test";

test("Safety Gate → ตอบเฉพาะข้อความช่วยเหลือ ห้ามมีปุ่ม/การตลาดพ่วง", () => {
  const route = routeByKeyword("ไม่ไหวแล้ว อยากตาย");
  assert.equal(route.logic_id, -1);

  const msgs = buildReply(route, BASE);
  assert.ok(msgs);
  assert.equal(msgs.length, 1, "ต้องมีข้อความเดียวเท่านั้น");
  assert.equal(msgs[0].type, "text", "ห้ามเป็น template ที่มีปุ่ม");
  assert.ok(
    (msgs[0] as { text: string }).text.includes("1323"),
    "ต้องมีเบอร์สายด่วนสุขภาพจิตในข้อความ"
  );
});

test("Logic ที่มีหน้า LIFF → ส่งปุ่มพร้อมลิงก์ที่ถูกต้อง", () => {
  const route = routeByKeyword("อยากรู้ดวงวันนี้");
  assert.equal(route.logic_id, 8);

  const msgs = buildReply(route, BASE)!;
  assert.equal(msgs[0].type, "template");
  const t = msgs[0] as Extract<typeof msgs[0], { type: "template" }>;
  assert.equal(t.template.actions[0].uri, `${BASE}/fortune`);
});

test("ทุก path ของ LIFF ชี้ไปหน้าที่มีจริงในโปรเจกต์", () => {
  const existing = ["/profile", "/fortune", "/dream", "/oracle", "/compatibility", "/fengshui", "/wellness"];
  for (const [id, path] of Object.entries(LIFF_PATHS)) {
    assert.ok(existing.includes(path), `logic ${id} ชี้ไป ${path} ซึ่งไม่มีหน้าอยู่จริง`);
  }
});

test("Logic 4 (ฝัน) → คืน null เพราะต้องประมวลผล async ต่อ", () => {
  const route = routeByKeyword("เมื่อคืนฝันเห็นงู");
  assert.equal(route.logic_id, 4);
  assert.equal(buildReply(route, BASE), null);
  assert.ok(CHAT_IMPLEMENTED.includes(4));
});

test("Logic 18 (fallback) → แนะนำเมนู ไม่ใช่แต่งคำทำนายมั่ว", () => {
  const route = routeByKeyword("สวัสดีครับ");
  assert.equal(route.logic_id, 18);
  const msgs = buildReply(route, BASE)!;
  assert.equal(msgs[0].type, "text");
  assert.ok((msgs[0] as { text: string }).text.includes("ทำนายฝัน"));
});

test("✅ Logic 12 เปิดแล้ว (30 ก.ค. 2569) → ส่งปุ่มเปิดหน้า /wellness", () => {
  const route = { ...routeByKeyword("กินอะไรดี") };
  assert.equal(route.logic_id, 12);
  const msgs = buildReply(route, BASE)!;
  const m = msgs[0] as { type: string; template?: { actions?: Array<{ uri?: string }> } };
  assert.equal(m.type, "template", "ต้องเป็นปุ่ม LIFF ไม่ใช่ข้อความยังไม่เปิด");
  assert.ok(JSON.stringify(msgs[0]).includes("/wellness"));
});

test("Logic ที่ยังไม่ทำ (13 ลงทุน) → บอกตรงๆ ว่ายังไม่เปิด ไม่แต่งคำตอบ", () => {
  // 13 ไม่อยู่ใน LIFF_PATHS/CHAT_IMPLEMENTED — ใช้เป็นตัวแทนกลุ่มที่ยังไม่ทำ
  const route = { ...routeByKeyword("กินอะไรดี"), logic_id: 13, logic_name: LOGIC_NAMES[13] };
  const msgs = buildReply(route, BASE)!;
  const text = (msgs[0] as { text: string }).text;
  assert.ok(text.includes("ยังไม่เปิดให้บริการ"));
});

test("ข้อความยาวเกินลิมิต LINE → ตัดแล้วบอกผู้ใช้ ไม่ตัดเงียบๆ", () => {
  const long = "ก".repeat(6000);
  const out = clampText(long);
  assert.ok(out.length <= 5000, `ยาว ${out.length} เกิน 5000`);
  assert.ok(out.includes("ตัดบางส่วนออก"), "ต้องบอกผู้ใช้ว่าถูกตัด");
});

test("ข้อความปกติไม่ถูกแตะ", () => {
  const s = "สวัสดีค่ะ";
  assert.equal(clampText(s), s);
  assert.deepEqual(textMessage(s), { type: "text", text: s });
});

test("ปุ่ม LIFF ไม่เกินลิมิตความยาวของ LINE (title 40 / text 60 / label 20)", () => {
  const m = liffButton("ก".repeat(80), "ข".repeat(200), "ค".repeat(50), `${BASE}/x`);
  const t = m as Extract<typeof m, { type: "template" }>;
  assert.ok(t.template.title!.length <= 40);
  assert.ok(t.template.text.length <= 60);
  assert.ok(t.template.actions[0].label.length <= 20);
});

test("สื่อที่ยังไม่รองรับ → ตอบสุภาพและบอกว่าทำอะไรได้", () => {
  assert.ok((unsupportedMessage("image")[0] as { text: string }).text.includes("รูปภาพ"));
  assert.ok((unsupportedMessage("sticker")[0] as { text: string }).text.includes("สติกเกอร์"));
  assert.ok((unsupportedMessage("ชนิดที่ไม่รู้จัก")[0] as { text: string }).text.length > 0);
});

test("ข้อความ error ไม่หลุด stack trace ให้ผู้ใช้เห็น", () => {
  const text = (errorMessage()[0] as { text: string }).text;
  assert.ok(!/Error|at |\.ts:|stack/i.test(text), `หลุดรายละเอียดทางเทคนิค: ${text}`);
});

test("ข้อความต้อนรับมีตัวอย่างคำสั่งที่ใช้ได้จริงทุกอัน", () => {
  const text = (welcomeMessage()[0] as { text: string }).text;
  for (const sample of ["ฝัน", "ดวงวันนี้", "รหัสชีวิต", "เสี่ยงทาย"]) {
    assert.ok(text.includes(sample), `ขาดตัวอย่าง "${sample}"`);
    // ตัวอย่างที่โชว์ต้อง route ไปที่ไหนสักที่ที่ไม่ใช่ fallback
    assert.notEqual(routeByKeyword(sample).method, "fallback_no_keyword_match", `ตัวอย่าง "${sample}" route ไม่ติด`);
  }
});

// ---- โครง async: ACK ก่อน แล้วค่อย push (LINE บังคับตอบ 200 ใน 2 วินาที) ----

test("ข้อความตอบรับต้องไม่มีคำทำนายใดๆ (ตอนส่งยังไม่ได้คำนวณอะไรเลย)", () => {
  const text = (ackMessage()[0] as { text: string }).text;
  assert.equal(ackMessage().length, 1);
  // ห้ามมีคำที่สื่อว่ารู้ผลแล้ว
  for (const banned of ["ธาตุ", "หมายถึง", "สัญลักษณ์ที่พบ", "ทำนายว่า", "คุณจะ"]) {
    assert.ok(!text.includes(banned), `ข้อความตอบรับต้องไม่มีคำว่า "${banned}" — ยังไม่ได้คำนวณ`);
  }
  assert.ok(/สักครู่|รอ|กำลัง/.test(text), "ควรบอกผู้ใช้ว่าให้รอสักครู่");
});

test("ทางเร็วทุกทางต้องเป็น pure (ไม่มี await) — buildReply คืนผลทันที ไม่ใช่ Promise", () => {
  for (const msg of ["ไม่ไหวแล้ว อยากตาย", "อยากรู้ดวงวันนี้", "กินอะไรดี", "สวัสดีครับ"]) {
    const out = buildReply(routeByKeyword(msg), BASE);
    assert.ok(!(out instanceof Promise), `"${msg}" ต้องไม่ใช่ Promise`);
  }
});

test("เฉพาะ Logic 4 เท่านั้นที่ต้องไปทางช้า (ack+push) — ทางอื่นตอบด้วย reply ฟรี", () => {
  // ถ้าวันหนึ่งเพิ่ม Logic เข้า CHAT_IMPLEMENTED ต้องรู้ตัวว่ากำลังเพิ่มต้นทุน push
  assert.deepEqual([...CHAT_IMPLEMENTED], [4]);
});
