// เทสต์เทคนิคดูแลใจตามสภาวะ (lib/engine/mind-care.ts) — เนื้อหาจาก Grounding_Recovery KB ผู้ใช้

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIND_STATES,
  MIND_STATE_TH,
  STATE_RED_FLAGS,
  toMindState,
  getMindCare,
  MIND_CARE_CAVEAT,
} from "../lib/engine/mind-care";

test("ทุกสภาวะมีเทคนิคหลัก+สำรองครบ พร้อมขั้นตอน/เวลา/ธาตุ/ธงแดง", () => {
  for (const st of MIND_STATES) {
    const r = getMindCare(st, []);
    assert.ok(r.primary.steps.length > 20, `${st}: ขั้นตอนหลักต้องละเอียด`);
    assert.ok(r.alternative.steps.length > 20);
    assert.ok(r.primary.durationMin && r.primary.elements.length > 0);
    assert.ok(r.primary.id !== r.alternative.id, "หลักกับสำรองต้องคนละเทคนิค");
    assert.ok(STATE_RED_FLAGS[st].includes("ผู้เชี่ยวชาญ"), "ธงแดงต้องชี้ผู้เชี่ยวชาญ");
    assert.ok(MIND_STATE_TH[st]);
    assert.equal(r.caveat, MIND_CARE_CAVEAT);
  }
});

test("ปรับตามธาตุ: เทคนิคที่เสริมธาตุที่ขาดถูกยกขึ้นเป็นหลัก", () => {
  // stressed: [GR002 น้ำ+ดิน, GR001 ดิน] — ผู้ใช้ขาด Water → GR002 เป็นหลักอยู่แล้ว
  const a = getMindCare("stressed", ["Water"]);
  assert.equal(a.primary.id, "GR002");
  assert.equal(a.primaryBoostsMissing, true);
  // anxious: [GR001 ดิน, GR003 ลม] — ขาด Wood → GR003 (ลม) ต้องสลับขึ้นเป็นหลัก
  const b = getMindCare("anxious", ["Wood"]);
  assert.equal(b.primary.id, "GR003");
  assert.equal(b.primaryBoostsMissing, true);
  // ไม่ขาดธาตุที่เกี่ยว → ลำดับต้นฉบับคงเดิม
  const c = getMindCare("anxious", []);
  assert.equal(c.primary.id, "GR001");
});

test("toMindState — จำแนกภาษาไทย/อังกฤษ · นอกเหนือ = null ไม่เดา", () => {
  assert.equal(toMindState("เครียдมาก"), null); // มี Cyrillic ปลอม — ต้องไม่ match (กันข้อมูลเพี้ยน)
  assert.equal(toMindState("เครียดมาก"), "stressed");
  assert.equal(toMindState("คิดวนไม่หยุดเลย"), "anxious");
  assert.equal(toMindState("ไม่มั่นใจในตัวเองเลย"), "self_doubt");
  assert.equal(toMindState("หมดไฟสุดๆ"), "drained");
  assert.equal(toMindState("stressed"), "stressed");
  assert.equal(toMindState("อยากรวย"), null);
  assert.equal(toMindState(42), null);
});

test("ไม่มีคำทางคลินิกในข้อความที่ถึงผู้ใช้ (กติกา KB: ห้าม โรค/วินิจฉัย/ผิดปกติ/อาการ)", () => {
  const banned = /โรค|วินิจฉัย|ผิดปกติ|อาการป่วย|ซึมเศร้า|disorder/;
  for (const st of MIND_STATES) {
    const r = getMindCare(st, []);
    for (const text of [r.stateTh, r.primary.steps, r.alternative.steps, r.redFlag, r.primary.caution ?? ""]) {
      assert.ok(!banned.test(text), `พบคำคลินิกใน "${text.slice(0, 50)}"`);
    }
  }
});
