// คะแนนเลข 5 ด้าน — สูตรเสริม deterministic (§16: ตัวเลขมาจาก engine เท่านั้น ห้าม AI แต่ง)
import test from "node:test";
import assert from "node:assert/strict";
import { numberAspects, ASPECT_LABEL_TH, NUMBER_ASPECTS_CAVEAT } from "../lib/engine/number-aspects";

test("โครงผลลัพธ์ครบ: คะแนน 5 ด้าน 0-10 + ภาพรวม + ความหมายเลขท้ายจากตารางจริง", () => {
  const r = numberAspects(6266, "Fire", ["Water"]);
  const labels = Object.values(ASPECT_LABEL_TH);
  assert.deepEqual(Object.keys(r.คะแนน).sort(), [...labels].sort());
  for (const v of Object.values(r.คะแนน)) {
    assert.ok(v >= 0 && v <= 10, `คะแนนต้อง 0-10 ได้ ${v}`);
    assert.equal(v, Math.round(v * 10) / 10);
  }
  assert.ok(r.ภาพรวม >= 0 && r.ภาพรวม <= 10);
  assert.ok(r.ความหมายเลขท้าย && r.ความหมายเลขท้าย.length > 0, "เลขท้าย 66 ต้องเจอในตาราง 2 หลัก");
  assert.ok(r.ความเข้ากับธาตุคุณ, "มีธาตุผู้ใช้ = ต้องอธิบายความเข้ากัน");
});

test("deterministic — เรียกซ้ำได้ผลเดิมเป๊ะ · ไม่ส่งธาตุผู้ใช้ = คิดจากตัวเลขล้วน", () => {
  assert.deepEqual(numberAspects(444, "Fire", ["Water"]), numberAspects(444, "Fire", ["Water"]));
  const noProfile = numberAspects(444);
  assert.equal(noProfile.ความเข้ากับธาตุคุณ, null);
});

test("อุปนิสัยเลขสะท้อนในคะแนน: 888 (ทรัพย์/อำนาจ) เด่นการเงิน+อำนาจกว่า 777 (อุปสรรค)", () => {
  const strong = numberAspects(888);
  const weak = numberAspects(777);
  assert.ok(strong.คะแนน["การเงิน"] > weak.คะแนน["การเงิน"]);
  assert.ok(strong.คะแนน["อำนาจบารมี"] > weak.คะแนน["อำนาจบารมี"]);
  assert.ok(weak.คะแนน["สุขภาพกายและใจ"] < 5, "เลข 7 ล้วนต้องกดด้านสุขภาพต่ำกว่าฐาน");
});

test("Productive Clash — เลขธาตุที่ผู้ใช้ขาดพลิกเป็นบวก ยกคะแนนทั้งภาพ", () => {
  // 22 → ธาตุน้ำ (ตาราง §5.4) · ผู้ใช้ไฟขาดน้ำ → +2 ยา vs ผู้ใช้ไฟไม่ขาด → -2 พิฆาต
  const clash = numberAspects(22, "Fire", ["Water"]);
  const normal = numberAspects(22, "Fire", []);
  assert.ok(clash.ภาพรวม > normal.ภาพรวม);
});

test("caveat ต้องประกาศว่าเป็นแนวทาง ไม่ใช่คำตัดสิน และไม่มีคำคลินิก", () => {
  assert.ok(NUMBER_ASPECTS_CAVEAT.includes("ไม่ใช่คำตัดสิน"));
  for (const w of ["โรค", "วินิจฉัย", "รักษา"]) assert.ok(!NUMBER_ASPECTS_CAVEAT.includes(w));
});

test("เบอร์โทรแบบสตริง — คงเลข 0 นำหน้า และคะแนนเท่ากับหลักชุดเดียวกัน", () => {
  const r = numberAspects("0812345678", "Fire", ["Water"]);
  assert.equal(r.เลข, "0812345678"); // Number() จะตัด 0 ทิ้ง — สตริงต้องคงไว้
  assert.equal(Object.keys(r.คะแนน).length, 5);
  // สตริงคั่นขีดถูกล้างเหลือหลักล้วน
  assert.equal(numberAspects("081-234-5678").เลข, "0812345678");
});
