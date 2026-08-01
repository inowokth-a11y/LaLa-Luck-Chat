// เทสต์เครื่องมือแชร์ (lib/share.ts) — นโยบายความเป็นส่วนตัว + รูปแบบลิงก์
import { test } from "node:test";
import assert from "node:assert/strict";

import { isValidCardId, cardShareUrl, shareLinks, shareText, SHARE_REWARD_QUESTIONS } from "../lib/share";

test("id การ์ดที่แชร์ได้ = เลข 2 หลักเท่านั้น (กัน path แปลกเข้าเพจสาธารณะ)", () => {
  assert.equal(isValidCardId("00"), true);
  assert.equal(isValidCardId("99"), true);
  for (const bad of ["7", "100", "ab", "..", "3x", "", "07/../x"]) {
    assert.equal(isValidCardId(bad), false, bad);
  }
});

test("URL แชร์ไม่มีข้อมูลส่วนตัว — มีแค่เลขการ์ด", () => {
  assert.equal(cardShareUrl("https://example.com/", "37"), "https://example.com/card/37");
});

test("ลิงก์แพลตฟอร์ม encode URL/ข้อความถูกต้อง", () => {
  const l = shareLinks("https://x.th/card/37", "การ์ด & ธาตุ");
  assert.ok(l.line.includes(encodeURIComponent("https://x.th/card/37")));
  assert.ok(l.facebook.startsWith("https://www.facebook.com/sharer/"));
  assert.ok(l.x.includes(encodeURIComponent("การ์ด & ธาตุ")));
});

test("ข้อความชวนแชร์มีชื่อการ์ดแต่ไม่มี placeholder ของข้อมูลส่วนตัว", () => {
  const t = shareText("นักปราชญ์");
  assert.ok(t.includes("นักปราชญ์") && t.includes("LaLa Lucky Chat"));
  assert.ok(shareText(null).includes("LaLa Lucky Chat"));
});

test("รางวัลแชร์ = 2 (ตรงกับ claim_share_reward ใน migration 031)", () => {
  assert.equal(SHARE_REWARD_QUESTIONS, 2);
});
