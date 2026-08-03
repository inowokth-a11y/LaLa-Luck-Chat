// เทสต์ตัวตัดสินการหักเครดิต (lib/credits/charge.ts) — ตรรกะล้วน ไม่แตะ DB
import { test } from "node:test";
import assert from "node:assert/strict";

import { decideCharge, creditCost, chargeDeniedMessage } from "../lib/credits/charge";

test("สิทธิ์ฟรียังเหลือ → ฟรีเสมอ ไม่แตะเครดิต (แม้มีเครดิตเต็มกระเป๋า)", () => {
  const d = decideCharge({ freeRemaining: 1, loggedIn: true, balance: 99, cost: 7 });
  assert.deepEqual(d, { mode: "free" });
});

test("ฟรีหมด + ล็อกอิน + เครดิตพอ → หักเครดิตตาม cost", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: true, balance: 7, cost: 7 });
  assert.deepEqual(d, { mode: "credits", cost: 7 });
});

test("ฟรีหมด + ไม่ล็อกอิน → ปฏิเสธ need_login (เครดิตใช้ได้เฉพาะผู้ล็อกอิน)", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: false, balance: 0, cost: 1 });
  assert.equal(d.mode, "denied");
  assert.equal(d.mode === "denied" && d.reason, "need_login");
});

test("ฟรีหมด + ล็อกอิน + เครดิตไม่พอ → ปฏิเสธ insufficient พร้อมยอดจริง", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: true, balance: 3, cost: 7 });
  assert.deepEqual(d, { mode: "denied", reason: "insufficient_credits", cost: 7, balance: 3 });
});

test("เครดิตพอดีเป๊ะ (balance === cost) → หักได้ ไม่ใช่ปฏิเสธ", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: true, balance: 1, cost: 1 });
  assert.equal(d.mode, "credits");
});

test("creditCost อ่านจาก ACTION_RATES จริง — chat 1 · oracle/dream 2 · โลโก้ 1/7 · ฉลาก 7", () => {
  assert.equal(creditCost("chat_question"), 1);
  assert.equal(creditCost("oracle"), 2);
  assert.equal(creditCost("dream"), 2);
  assert.equal(creditCost("logo_preview"), 1);
  assert.equal(creditCost("logo_vector"), 7);
  assert.equal(creditCost("label_artwork"), 7);
});

test("creditCost กับ key ที่ไม่มีจริง → throw ทันที (กันสะกดผิดเงียบๆ)", () => {
  assert.throws(() => creditCost("logo_vecter"));
});

test("ข้อความปฏิเสธ: บอกจำนวนที่ต้องใช้/คงเหลือจริง ไม่หลอกว่าได้ฟรีเพิ่ม", () => {
  const msg = chargeDeniedMessage({ mode: "denied", reason: "insufficient_credits", cost: 7, balance: 2 });
  assert.ok(msg.includes("7 เครดิต") && msg.includes("2 เครดิต"));
  assert.ok(!msg.includes("ฟรี"));
  const login = chargeDeniedMessage({ mode: "denied", reason: "need_login", cost: 1, balance: 0 });
  assert.ok(login.includes("เข้าสู่ระบบ"));
});

// โหมดเปิดตัว (FREE_LAUNCH_MODE — ผู้ใช้ตัดสิน 3 ส.ค. 2569: ยังเชื่อม Omise บริษัทไม่ได้ ไม่หักเครดิตชั่วคราว)
test("freeLaunch: ล็อกอิน+โควตาหมด+เครดิต 0 → ฟรี ไม่ปฏิเสธ (ไม่มีทางตันตอนยังเติมเงินไม่ได้)", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: true, balance: 0, cost: 2, freeLaunch: true });
  assert.deepEqual(d, { mode: "free" });
});

test("freeLaunch: ไม่ล็อกอิน → ยังบังคับล็อกอินเหมือนเดิม (กัน anon spam ของแพง)", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: false, balance: 0, cost: 2, freeLaunch: true });
  assert.equal(d.mode, "denied");
  if (d.mode === "denied") assert.equal(d.reason, "need_login");
});

test("freeLaunch ปิด (ค่าเริ่มต้น) → พฤติกรรมเครดิตเดิมทุกอย่าง", () => {
  const d = decideCharge({ freeRemaining: 0, loggedIn: true, balance: 0, cost: 2 });
  assert.equal(d.mode, "denied");
  if (d.mode === "denied") assert.equal(d.reason, "insufficient_credits");
});
