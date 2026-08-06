// สูตรเบอร์โทรทางการ (เจ้าของตำรายืนยัน 6 ส.ค. 2569) — ตัด 2 หน้า/รายคู่/น้ำหนัก 40-25-15-10
import test from "node:test";
import assert from "node:assert/strict";
import { phoneOfficialReading, PHONE_OFFICIAL_NOTE } from "../lib/engine/phone-official";

test("แตกคู่ตรงตามสูตร: 0123456789 → ตัด 01 → คู่ 23,45,67,89 น้ำหนัก 10/10/15/25", () => {
  const r = phoneOfficialReading("0123456789")!;
  assert.equal(r.เลขที่ตัดออก, "01");
  assert.deepEqual(r.รายคู่.map((p) => p.คู่), ["23", "45", "67", "89"]);
  assert.deepEqual(r.รายคู่.map((p) => p.น้ำหนัก), ["10%", "10%", "15%", "25%"]);
  assert.equal(r.เลขกำลังรวม.น้ำหนัก, "40%");
  assert.equal(r.เลขกำลังรวม.ผลรวม, 45); // 0+1+...+9
});

test("คะแนนภาพรวม = ถ่วงน้ำหนักตรงคณิต และอยู่ใน 0-10", () => {
  const r = phoneOfficialReading("0812345678", "Fire", ["Water"])!;
  const expected =
    Math.round(r.รายคู่[0].คะแนน * 10 + r.รายคู่[1].คะแนน * 10 + r.รายคู่[2].คะแนน * 15 + r.รายคู่[3].คะแนน * 25 + r.เลขกำลังรวม.คะแนน * 40) / 100;
  assert.equal(r.คะแนนภาพรวมถ่วงน้ำหนัก, expected);
  assert.ok(r.คะแนนภาพรวมถ่วงน้ำหนัก >= 0 && r.คะแนนภาพรวมถ่วงน้ำหนัก <= 10);
  assert.ok(r.รายคู่.every((p) => p.ความหมาย)); // ทุกคู่ 00-99 มีในตารางจริง
});

test("ไม่ครบ 10 หลัก = null (ให้ fallback) · ขีดคั่นถูกล้าง · หมายเหตุระบุที่มาสูตร", () => {
  assert.equal(phoneOfficialReading("12345"), null);
  const r = phoneOfficialReading("081-234-5678")!;
  assert.equal(r.เบอร์, "0812345678");
  assert.ok(PHONE_OFFICIAL_NOTE.includes("เจ้าของตำรา"));
});
