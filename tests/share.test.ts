// เทสต์เครื่องมือแชร์ (lib/share.ts) — นโยบายความเป็นส่วนตัว + รูปแบบลิงก์
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isValidCardId,
  cardShareUrl,
  shareLinks,
  shareText,
  SHARE_REWARD_QUESTIONS,
  figureCategoryLabel,
  thaiSoftWrap,
} from "../lib/share";

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

test("ข้อความแชร์ชูชื่อบุคคลต้นแบบเมื่อรู้จัก (ผู้ใช้ตัดสิน 2 ส.ค. 2569)", () => {
  const t = shareText("จักรพรรดิแห่งความมั่งคั่ง", "กษัตริย์ไมดาส (King Midas)");
  assert.ok(t.includes("มีต้นแบบเดียวกับ"), "ต้องขึ้นด้วยประโยคต้นแบบ");
  assert.ok(t.includes("กษัตริย์ไมดาส (King Midas)"));
  assert.ok(t.includes("LaLa Lucky Chat"));
  // ไม่มี figure → fallback ข้อความชื่อการ์ดแบบเดิม
  assert.ok(shareText("นักปราชญ์", null).includes("นักปราชญ์"));
});

test("รางวัลแชร์ = 2 (ตรงกับ claim_share_reward ใน migration 031)", () => {
  assert.equal(SHARE_REWARD_QUESTIONS, 2);
});

test("figureCategoryLabel — role_title/fictional ต้องบอกชัดว่าไม่ใช่บุคคลจริงคนเดียว (§3.7)", () => {
  assert.ok(figureCategoryLabel("role_title")?.includes("ไม่ใช่บุคคลเดียว"));
  assert.ok(figureCategoryLabel("fictional")?.includes("ไม่ใช่บุคคลจริง"));
  assert.ok(figureCategoryLabel("historical"));
  assert.equal(figureCategoryLabel("อื่นๆ"), null); // ค่านอก enum = ไม่แสดงป้าย ไม่เดา
  assert.equal(figureCategoryLabel(null), null);
});

test("thaiSoftWrap — แทรก ZWSP ระหว่างคำไทย (ให้ satori ห่อบรรทัดได้) โดยเนื้อความไม่เปลี่ยน", () => {
  const s = "การสร้างอาณาจักรธุรกิจที่ต้องระวังความโลภ";
  const w = thaiSoftWrap(s);
  assert.ok(w.includes("​"), "ต้องมี ZWSP อย่างน้อยหนึ่งจุด");
  assert.equal(w.replaceAll("​", ""), s, "ลบ ZWSP ออกต้องได้ข้อความเดิมเป๊ะ");
  assert.equal(thaiSoftWrap(""), "");
});
