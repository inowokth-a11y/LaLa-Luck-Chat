// เทสต์วิเคราะห์สีจริงในภาพ → ธาตุ (lib/engine/color-analysis.ts) — deterministic ไม่ใช้ AI
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COLOR_ANCHORS,
  nearestNamedColor,
  analyzeImagePixels,
  COLOR_ANALYSIS_CAVEAT,
} from "../lib/engine/color-analysis";
import { COLOR_TO_ELEMENT } from "../lib/engine/fengshui";

/** สร้าง RGBA buffer จากรายการ [r,g,b,a,จำนวนพิกเซล] */
function px(specs: Array<[number, number, number, number, number]>): number[] {
  const out: number[] = [];
  for (const [r, g, b, a, n] of specs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return out;
}

test("ทุก anchor มีธาตุใน COLOR_TO_ELEMENT (ตารางไม่ drift จากฮวงจุ้ย)", () => {
  for (const a of COLOR_ANCHORS) {
    assert.ok(COLOR_TO_ELEMENT[a.name], `"${a.name}" ไม่มีใน COLOR_TO_ELEMENT`);
  }
  // ครบทุกสีของตารางฮวงจุ้ยด้วย (28 สี) — เพิ่มสีที่ฟอร์มแล้วต้องเพิ่ม anchor ตาม
  for (const name of Object.keys(COLOR_TO_ELEMENT)) {
    assert.ok(COLOR_ANCHORS.some((a) => a.name === name), `สี "${name}" ในฮวงจุ้ยไม่มี anchor`);
  }
});

test("สีจัดเข้าธาตุถูกตามตาราง: แดง=ไฟ เขียว=ไม้ ขาว=ทอง ดำ=น้ำ น้ำตาล=ดิน", () => {
  assert.equal(nearestNamedColor(230, 30, 40).element, "Fire");
  assert.equal(nearestNamedColor(60, 170, 75).element, "Wood");
  assert.equal(nearestNamedColor(255, 255, 255).element, "Metal");
  assert.equal(nearestNamedColor(10, 10, 12).element, "Water");
  assert.equal(nearestNamedColor(115, 82, 55).element, "Earth");
});

test("ภาพสีเดียวล้วน → dominant ธาตุนั้น share 1.0", () => {
  const r = analyzeImagePixels(px([[220, 40, 50, 255, 100]]));
  assert.equal(r.dominant, "Fire");
  assert.equal(r.elements[0].share, 1);
  assert.equal(r.sampled, 100);
});

test("ภาพผสม 70/30 → สัดส่วนธาตุตรงตามจำนวนพิกเซล และเรียงมาก→น้อย", () => {
  const r = analyzeImagePixels(px([
    [30, 60, 150, 255, 70], // น้ำเงิน = น้ำ
    [70, 160, 80, 255, 30], // เขียว = ไม้
  ]));
  assert.equal(r.dominant, "Water");
  assert.equal(r.elements.length, 2);
  assert.ok(Math.abs(r.elements[0].share - 0.7) < 1e-9);
  assert.ok(Math.abs(r.elements[1].share - 0.3) < 1e-9);
  const total = r.elements.reduce((s, e) => s + e.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, "สัดส่วนรวมต้องเป็น 1");
});

test("พิกเซลโปร่งใสถูกข้าม — พื้นหลังโปร่งของโลโก้ต้องไม่นับเป็นขาว/ทอง", () => {
  const r = analyzeImagePixels(px([
    [255, 255, 255, 0, 500], // โปร่งใสทั้งหมด — ห้ามนับ
    [220, 40, 50, 255, 10],
  ]));
  assert.equal(r.sampled, 10);
  assert.equal(r.dominant, "Fire");
});

test("ภาพว่าง/โปร่งใสหมด → dominant null ไม่ throw", () => {
  assert.equal(analyzeImagePixels([]).dominant, null);
  assert.equal(analyzeImagePixels(px([[0, 0, 0, 0, 50]])).dominant, null);
});

test("deterministic — input เดียวกันได้ผลเหมือนกันทุกครั้ง", () => {
  const buf = px([[205, 170, 80, 255, 5], [30, 60, 150, 255, 5], [246, 238, 216, 255, 5]]);
  const a = JSON.stringify(analyzeImagePixels(buf));
  const b = JSON.stringify(analyzeImagePixels(buf));
  assert.equal(a, b);
});

test("caveat บอกชัดว่าวิเคราะห์แค่สี + ทอง/ดินเป็นการประมาณ", () => {
  assert.ok(COLOR_ANALYSIS_CAVEAT.includes("สี"));
  assert.ok(/ทอง/.test(COLOR_ANALYSIS_CAVEAT));
});
