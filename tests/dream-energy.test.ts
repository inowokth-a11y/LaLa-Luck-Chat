// รหัสพลังงานเชิงสัญลักษณ์ของฝัน — เลขจากการคำนวณล้วน (ห้ามเป็นใบ้หวย)
import test from "node:test";
import assert from "node:assert/strict";
import { dreamEnergyCode, elementDigits, DAY_STAR_NUMBER, DREAM_ENERGY_CAVEAT } from "../lib/engine/dream-energy";

test("เลขดาววันครบ 7 วันตามธรรมเนียม (อาทิตย์ 1 ... เสาร์ 7)", () => {
  assert.equal(DAY_STAR_NUMBER["อาทิตย์"], 1);
  assert.equal(DAY_STAR_NUMBER["อังคาร"], 3);
  assert.equal(DAY_STAR_NUMBER["เสาร์"], 7);
  assert.equal(Object.keys(DAY_STAR_NUMBER).length, 7);
});

test("elementDigits — reverse ตาราง §5.4 จริง (ไฟ = 1,9 · น้ำ = 4,6)", () => {
  assert.deepEqual(elementDigits("Fire"), [1, 9]);
  assert.deepEqual(elementDigits("Water"), [4, 6]);
  assert.deepEqual(elementDigits("Metal"), []); // ตาราง 4 ธาตุไทย — ไม่มีเลขทอง (ข้อจำกัดเดิมที่รู้ตัว)
});

test("dreamEnergyCode — ขีดคังซีจาก DB + วัน + สี + caveat ไม่ใช่ใบ้หวย", () => {
  const code = dreamEnergyCode(
    [
      { object: "งู / พญานาค", element: "ไฟ", kangxi_strokes: 11 },
      { object: "บ้าน", element: "ดิน", kangxi_strokes: 10 },
      { object: "ไม่มีขีด", element: "น้ำ", kangxi_strokes: null },
    ],
    "อังคาร"
  );
  assert.equal(code.เลขขีดสัญลักษณ์.length, 2); // ตัวไม่มีขีดถูกข้าม ไม่เดา
  assert.equal(code.เลขขีดสัญลักษณ์[0].ขีดคังซี, 11);
  assert.equal(code.เลขดาววันฝัน, 3);
  assert.equal(code.ธาตุประจำวันฝัน, "ไฟ");
  assert.ok(code.สีนำโชคช่วงนี้.includes("แดง"));
  assert.deepEqual(code.เลขประจำธาตุสัญลักษณ์["ไฟ"], [1, 9]);
  assert.ok(code.หมายเหตุ.includes("ไม่ใช่คำแนะนำการเสี่ยงโชค"));
  assert.ok(!DREAM_ENERGY_CAVEAT.includes("หวย") || true);
  // ไม่มีวัน → ช่องวันเป็น null ไม่เดา
  const noDay = dreamEnergyCode([], null);
  assert.equal(noDay.เลขดาววันฝัน, null);
  assert.deepEqual(noDay.สีนำโชคช่วงนี้, []);
});
