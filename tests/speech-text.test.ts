// เตรียมข้อความ TTS — ตัด markdown/อีโมจิ/ZWSP ให้เครื่องอ่านไม่เพี้ยน
import test from "node:test";
import assert from "node:assert/strict";
import { speechText } from "../lib/chat/speech-text";

test("ตัด markdown + อีโมจิ + ZWSP แต่เนื้อความไทยครบ", () => {
  const s = speechText("ลาลา~ **ธาตุไฟ** 🔥 ของคุณ​เด่นมาก ✨\n\n- การเงิน: 9.5/10");
  assert.ok(!s.includes("**") && !s.includes("🔥") && !s.includes("✨") && !s.includes("​"));
  assert.ok(s.includes("ธาตุไฟ") && s.includes("การเงิน: 9.5/10"));
});

test("ลิงก์เหลือแค่ป้าย · URL ดิบหาย", () => {
  const s = speechText("ดูที่ [หน้าฤกษ์](https://lalaluckychat.com/timing) หรือ https://example.com เลย");
  assert.ok(s.includes("หน้าฤกษ์") && !s.includes("http"));
});

test("ข้อความว่าง/สัญลักษณ์ล้วน → สตริงว่าง ไม่ throw", () => {
  assert.equal(speechText("🔥✨🐾"), "");
});
