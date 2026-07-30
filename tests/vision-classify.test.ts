// เทสต์ชั้นจำแนกภาพ (lib/vision/classify.ts + image.ts) — ตรรกะล้วน ไม่ยิง AI
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MOTIF_KEYS,
  SHAPE_KEYS,
  buildVisionSystemPrompt,
  validateVisionResult,
  visionComposition,
  VISION_CAVEAT,
} from "../lib/vision/classify";
import { sniffImageType, decodeImageBase64, MAX_IMAGE_BYTES } from "../lib/vision/image";
import { MOTIF_TO_ELEMENT } from "../lib/engine/label";

test("prompt สร้างจากตารางจริง — ทุก key ของ MOTIF/SHAPE ต้องอยู่ใน prompt (กัน drift)", () => {
  const p = buildVisionSystemPrompt();
  for (const k of MOTIF_KEYS) assert.ok(p.includes(k), `motif "${k}" หายจาก prompt`);
  for (const k of SHAPE_KEYS) assert.ok(p.includes(k), `shape "${k}" หายจาก prompt`);
  assert.ok(p.includes("ห้ามตัดสิน \"ธาตุ\" เอง") || p.includes("ห้ามตัดสิน"), "ต้องมีเส้นแบ่ง §16 ใน prompt");
  assert.ok(p.includes("face_detected"), "ต้องมีนโยบายใบหน้า");
});

test("คำตอบถูก enum ทั้งหมด → ผ่าน + ค่าครบ", () => {
  const v = validateVisionResult({ face_detected: false, motifs: ["กนกเปลว", "ดอกไม้"], shape: "โค้ง", confidence: 0.9 });
  assert.ok(v.ok);
  if (v.ok) {
    assert.deepEqual(v.result.motifs, ["กนกเปลว", "ดอกไม้"]);
    assert.equal(v.result.shape, "โค้ง");
    assert.equal(v.result.droppedCount, 0);
  }
});

test("🔴 ค่านอก enum ถูกทิ้ง ไม่ใช่ถูกเดา — และนับ droppedCount", () => {
  const v = validateVisionResult({ motifs: ["กนก", "ลายมังกรทอง", "dragon"], shape: "รูปทรงประหลาด", confidence: 0.5 });
  assert.ok(v.ok);
  if (v.ok) {
    assert.deepEqual(v.result.motifs, ["กนก"], "เหลือเฉพาะ key ที่มีในตาราง");
    assert.equal(v.result.shape, null);
    assert.equal(v.result.droppedCount, 3);
  }
});

test("🔴 เจอใบหน้า → ปฏิเสธ (reason face) ไม่ว่า motifs จะมีอะไร", () => {
  const v = validateVisionResult({ face_detected: true, motifs: ["กนก"], confidence: 1 });
  assert.ok(!v.ok && v.reason === "face");
});

test("JSON พัง/ไม่ใช่ object → invalid_json ไม่ throw", () => {
  for (const bad of [null, "text", 42, ["a"]]) {
    const v = validateVisionResult(bad);
    assert.ok(!v.ok && v.reason === "invalid_json", JSON.stringify(bad));
  }
  // confidence เพี้ยน → clamp เป็น 0-1 ไม่พัง
  const v = validateVisionResult({ motifs: [], confidence: 99 });
  assert.ok(v.ok && v.ok === true);
});

test("visionComposition ใช้ engine จริง — ธาตุมาจากตาราง ไม่ใช่จาก AI", () => {
  const v = validateVisionResult({ motifs: ["กนกใบเทศ"], shape: null, confidence: 0.8 });
  assert.ok(v.ok);
  if (v.ok) {
    // แบรนด์ไฟ + กนกใบเทศ (ไม้) → ไม้บำรุงไฟ = +2 ตามทาง "ค"
    const comp = visionComposition(v.result, "Fire");
    assert.ok(comp);
    assert.equal(comp!.components[0].element, MOTIF_TO_ELEMENT["กนกใบเทศ"]);
    assert.equal(comp!.components[0].score, 2);
    // ไม่พบอะไรเลย → null ไม่ใช่คะแนนมั่ว
    const empty = validateVisionResult({ motifs: [], confidence: 0.2 });
    assert.ok(empty.ok);
    if (empty.ok) assert.equal(visionComposition(empty.result, "Fire"), null);
  }
});

test("sniffImageType อ่าน magic bytes จริง — นามสกุล/ข้อความปลอมไม่ผ่าน", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const text = new Uint8Array(Buffer.from("<script>alert(1)</script>"));
  assert.equal(sniffImageType(jpeg), "image/jpeg");
  assert.equal(sniffImageType(png), "image/png");
  assert.equal(sniffImageType(webp), "image/webp");
  assert.equal(sniffImageType(text), null);
  assert.equal(sniffImageType(new Uint8Array([1, 2])), null, "สั้นเกิน = null");
});

test("decodeImageBase64 รับทั้ง data URL และ base64 ล้วน + กันใหญ่เกิน", () => {
  const raw = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const b64 = raw.toString("base64");
  assert.ok(decodeImageBase64(b64));
  assert.ok(decodeImageBase64(`data:image/jpeg;base64,${b64}`));
  assert.equal(decodeImageBase64(""), null);
  assert.equal(decodeImageBase64("!!!ไม่ใช่ base64!!!"), null);
  const huge = "A".repeat(Math.ceil(((MAX_IMAGE_BYTES + 100) * 4) / 3) + 32);
  assert.equal(decodeImageBase64(huge), null, "เกิน MAX_IMAGE_BYTES ต้องปฏิเสธ");
});

test("caveat: บอกว่าไม่เก็บภาพ + AI ไม่ตัดสินธาตุ", () => {
  assert.ok(VISION_CAVEAT.includes("ไม่เก็บตัวภาพ"));
  assert.ok(VISION_CAVEAT.includes("จำแนก"));
});
