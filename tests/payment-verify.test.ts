// เทสต์ตัวตรวจ charge ก่อนเติมเครดิต (lib/payment/verify.ts) — ด่านความปลอดภัยของเงินจริง
import { test } from "node:test";
import assert from "node:assert/strict";

import { packageForSatang, verifyChargeForGrant, TOPUP_ACTION } from "../lib/payment/verify";
import { CREDIT_PACKAGES } from "../lib/credits/pricing";
import type { OmiseCharge } from "../lib/payment/omise";

const UID = "12345678-90ab-cdef-1234-567890abcdef";
const paidCharge = (over: Partial<OmiseCharge> = {}): OmiseCharge => ({
  id: "chrg_test_x",
  object: "charge",
  amount: 1500,
  currency: "thb",
  status: "successful",
  paid: true,
  expired: false,
  metadata: { kruth_topup: true, auth_uid: UID },
  ...over,
});

test("packageForSatang — ตรงเป๊ะทุกแพ็ก (สตางค์) และไม่ปัดยอดแปลกให้", () => {
  for (const p of CREDIT_PACKAGES) {
    assert.equal(packageForSatang(p.priceThb * 100)?.credits, p.credits);
  }
  assert.equal(packageForSatang(1499), null);
  assert.equal(packageForSatang(1501), null);
  assert.equal(packageForSatang(0), null);
});

test("charge จ่ายแล้ว ยอดตรงแพ็ก ฿15 → เติม 5 เครดิตให้ auth_uid ใน metadata", () => {
  const v = verifyChargeForGrant(paidCharge());
  assert.ok(v.ok);
  assert.deepEqual(v.ok && v.grant, { authUid: UID, credits: 5, packageThb: 15 });
});

test("แพ็กใหญ่สุด ฿100 → 40 เครดิต", () => {
  const v = verifyChargeForGrant(paidCharge({ amount: 10000 }));
  assert.ok(v.ok && v.grant.credits === 40);
});

test("🔴 ยังไม่จ่าย/สถานะไม่ successful → ปฏิเสธ (กัน webhook ปลอม/charge ค้าง)", () => {
  assert.deepEqual(verifyChargeForGrant(paidCharge({ paid: false })), { ok: false, reason: "not_paid" });
  assert.deepEqual(verifyChargeForGrant(paidCharge({ status: "pending" })), { ok: false, reason: "not_paid" });
});

test("🔴 ยอดไม่ตรงแพ็กไหนเลย → ปฏิเสธ ไม่เดา ไม่ปัดให้ (ต้องให้แอดมินดูรายเคส)", () => {
  const v = verifyChargeForGrant(paidCharge({ amount: 9999 }));
  assert.deepEqual(v, { ok: false, reason: "unknown_amount" });
});

test("🔴 สกุลเงินไม่ใช่ THB → ปฏิเสธ", () => {
  assert.deepEqual(verifyChargeForGrant(paidCharge({ currency: "usd" })), { ok: false, reason: "bad_currency" });
});

test("🔴 metadata ไม่มี auth_uid ที่หน้าตาเป็น UUID → ปฏิเสธ (ไม่รู้จะเติมให้ใคร)", () => {
  assert.equal(verifyChargeForGrant(paidCharge({ metadata: {} })).ok, false);
  assert.equal(verifyChargeForGrant(paidCharge({ metadata: { auth_uid: "DROP TABLE" } })).ok, false);
});

test("TOPUP_ACTION ขึ้นต้น 'topup:' — ให้ unique index (migration 030) คุมกันเติมซ้ำ", () => {
  assert.ok(TOPUP_ACTION.startsWith("topup:"));
});
