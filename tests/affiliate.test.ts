// เทสต์ระบบแอฟฟิลิเอต (ตรรกะล้วน) — lib/affiliate/{code,stats}.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidCode, normalizeCodeInput, randomCode, REF_COOKIE, REF_ATTRIBUTION_WINDOW_HOURS } from "../lib/affiliate/code";
import { computeAffiliateStats, thbForTopupCredits, type AffLinkRow } from "../lib/affiliate/stats";
import { CREDIT_PACKAGES } from "../lib/credits/pricing";

test("isValidCode — รับเฉพาะ a-z0-9- ยาว 3-32", () => {
  assert.ok(isValidCode("somchai"));
  assert.ok(isValidCode("page-88"));
  assert.ok(isValidCode("abc"));
  assert.equal(isValidCode("ab"), false); // สั้นไป
  assert.equal(isValidCode("a".repeat(33)), false); // ยาวไป
  assert.equal(isValidCode("Somchai"), false); // ตัวใหญ่ไม่รับ (normalize ก่อน)
  assert.equal(isValidCode("-lead"), false); // ขึ้นต้นด้วยขีดไม่ได้
  assert.equal(isValidCode("มีไทย"), false);
  assert.equal(isValidCode("a b"), false);
  assert.equal(isValidCode(42), false);
  assert.equal(isValidCode(null), false);
});

test("normalizeCodeInput — แปลงวรรค→ขีด + พิมพ์เล็ก · ซ่อมไม่ได้ = null", () => {
  assert.equal(normalizeCodeInput("  Page 88 "), "page-88");
  assert.equal(normalizeCodeInput("SOMCHAI"), "somchai");
  assert.equal(normalizeCodeInput("ร้านป้าแดง"), null); // ไทยใช้ไม่ได้ — บอกตรงๆ ไม่เดา
  assert.equal(normalizeCodeInput("x"), null);
});

test("randomCode — ยาวตามขอ ผ่าน validation และไม่มีอักขระสับสน (0/o/1/l/i)", () => {
  for (let i = 0; i < 50; i++) {
    const c = randomCode();
    assert.equal(c.length, 8);
    assert.ok(isValidCode(c), c);
    assert.ok(!/[01oli]/.test(c), `มีอักขระสับสน: ${c}`);
  }
  assert.equal(randomCode(12).length, 12);
});

test("ค่าคงที่ — cookie ref + หน้าต่างผูกบัญชีใหม่ 24 ชม.", () => {
  assert.equal(REF_COOKIE, "kruth_ref");
  assert.equal(REF_ATTRIBUTION_WINDOW_HOURS, 24);
});

test("thbForTopupCredits — เทียบ delta เครดิตกลับเป็นราคาแพ็กจริง ไม่ตรง = null", () => {
  for (const p of CREDIT_PACKAGES) assert.equal(thbForTopupCredits(p.credits), p.priceThb);
  assert.equal(thbForTopupCredits(5), null); // เช่นแอดมินเติมมือ 5 เครดิต — ไม่ใช่แพ็กขาย
});

const link = (id: string, code: string): AffLinkRow => ({
  id,
  code,
  partner_name: code,
  note: null,
  active: true,
  visit_count: 0,
  created_at: "2026-08-01T00:00:00Z",
});

test("computeAffiliateStats — แยกยอดต่อลิงก์: สมัคร/คนจ่าย/รายรับ", () => {
  const links = [link("L1", "page-a"), link("L2", "page-b"), link("L3", "page-c")];
  const attributions = [
    { auth_uid: "u1", link_id: "L1" },
    { auth_uid: "u2", link_id: "L1" },
    { auth_uid: "u3", link_id: "L2" },
  ];
  const topups = [
    { auth_uid: "u1", delta: 9 }, // ฿29
    { auth_uid: "u1", delta: 51 }, // ฿129 — คนเดิมเติมซ้ำ = payingUsers ยังนับ 1
    { auth_uid: "u3", delta: 21 }, // ฿59 → L2
    { auth_uid: "u9", delta: 51 }, // ผู้ใช้ที่ไม่ได้มาจากลิงก์ — ต้องไม่ถูกนับให้ใคร
  ];
  const [s1, s2, s3] = computeAffiliateStats(links, attributions, topups);
  assert.equal(s1.signups, 2);
  assert.equal(s1.payingUsers, 1);
  assert.equal(s1.topupCount, 2);
  assert.equal(s1.creditsSold, 60);
  assert.equal(s1.revenueThb, 158);
  assert.equal(s1.revenueUncertain, false);
  assert.equal(s2.signups, 1);
  assert.equal(s2.revenueThb, 59);
  // ลิงก์ที่ยังไม่มีใครสมัคร = ศูนย์ทุกช่อง ไม่ใช่หาย
  assert.equal(s3.signups, 0);
  assert.equal(s3.revenueThb, 0);
});

test("computeAffiliateStats — delta ที่เทียบแพ็กไม่ได้ → นับเครดิตแต่ธง revenueUncertain", () => {
  const [s] = computeAffiliateStats(
    [link("L1", "x-page")],
    [{ auth_uid: "u1", link_id: "L1" }],
    [
      { auth_uid: "u1", delta: 9 }, // ฿29 รู้จัก
      { auth_uid: "u1", delta: 7 }, // ไม่ตรงแพ็กไหน (เช่นแพ็กเก่าที่เลิกขาย)
    ]
  );
  assert.equal(s.revenueThb, 29); // เฉพาะที่รู้ราคา — ไม่เดาส่วนที่ไม่รู้
  assert.equal(s.revenueUncertain, true);
  assert.equal(s.creditsSold, 16);
});

test("computeAffiliateStats — delta ติดลบ (การหักใช้) ต้องไม่ปนเข้ารายรับ", () => {
  const [s] = computeAffiliateStats(
    [link("L1", "x-page")],
    [{ auth_uid: "u1", link_id: "L1" }],
    [{ auth_uid: "u1", delta: -2 }] // กันพลาดถ้า query ฝั่ง server ลืมกรอง
  );
  assert.equal(s.topupCount, 0);
  assert.equal(s.payingUsers, 0);
});
