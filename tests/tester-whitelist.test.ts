// เทสต์กลุ่มผู้ทดลองใช้ (whitelist อีเมล — 31 ส.ค. 2569) — ส่วน pure เท่านั้น
// (RPC/RLS verify กับ prod จริงแยกต่างหากตอน migrate — บันทึกใน CLAUDE.md)
import { test } from "node:test";
import assert from "node:assert";
import { normalizeTesterEmail } from "../lib/credits/tester";

test("normalizeTesterEmail — lowercase/trim + ปฏิเสธรูปแบบผิด", () => {
  assert.equal(normalizeTesterEmail("  Tester@Example.COM "), "tester@example.com");
  assert.equal(normalizeTesterEmail("a.b+c@x.co"), "a.b+c@x.co");
  assert.equal(normalizeTesterEmail(""), null);
  assert.equal(normalizeTesterEmail("ไม่ใช่อีเมล"), null);
  assert.equal(normalizeTesterEmail("no-at.example.com"), null);
  assert.equal(normalizeTesterEmail("a@b"), null, "ไม่มีโดเมนจุด = ปฏิเสธ");
  assert.equal(normalizeTesterEmail("x@y. c"), null, "มีช่องว่าง = ปฏิเสธ");
  assert.equal(normalizeTesterEmail("a".repeat(255) + "@x.co"), null, "ยาวเกิน 254 = ปฏิเสธ");
  assert.equal(normalizeTesterEmail(null), null);
});
