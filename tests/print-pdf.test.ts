// เทสต์ไฟล์พิมพ์ PDF (bleed + TrimBox + CMYK) — lib/print/pdf.ts
// ตรวจทั้งคณิตศาสตร์ (mm→pt, RGB→CMYK) และโครงสร้าง PDF (xref ต้องชี้ offset จริงทุกไบต์)

import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync, inflateSync } from "node:zlib";
import { mmToPt, rgbaToCmyk, buildPrintPdf, PRINT_BLEED_MM, PRINT_CMYK_CAVEAT } from "../lib/print/pdf";

test("mmToPt — 25.4 มม. = 1 นิ้ว = 72 pt", () => {
  assert.equal(mmToPt(25.4), 72);
  assert.equal(mmToPt(0), 0);
  // ขนาดจริงที่ใช้: ฉลาก 90×50 + เจียน 3 มม. สองข้าง = 96 มม. ≈ 272.126 pt
  assert.ok(Math.abs(mmToPt(96) - 272.126) < 0.01);
});

test("rgbaToCmyk — ค่ามาตรฐาน: ขาว/ดำ/แดง/น้ำเงิน", () => {
  const rgba = new Uint8ClampedArray([
    255, 255, 255, 255, // ขาว → ไม่มีหมึกเลย
    0, 0, 0, 255, // ดำ → K เต็ม
    255, 0, 0, 255, // แดง → M+Y เต็ม
    0, 0, 255, 255, // น้ำเงิน → C+M เต็ม
  ]);
  const cmyk = rgbaToCmyk(rgba);
  assert.deepEqual([...cmyk.slice(0, 4)], [0, 0, 0, 0]);
  assert.deepEqual([...cmyk.slice(4, 8)], [0, 0, 0, 255]);
  assert.deepEqual([...cmyk.slice(8, 12)], [0, 255, 255, 0]);
  assert.deepEqual([...cmyk.slice(12, 16)], [255, 255, 0, 0]);
});

test("rgbaToCmyk — พิกเซลโปร่งใสถูก composite ลงพื้นขาว (งานพิมพ์ไม่มี alpha)", () => {
  // ดำโปร่ง 50% บนพื้นขาว = เทากลาง → K ประมาณครึ่ง ไม่ใช่ K เต็ม
  const cmyk = rgbaToCmyk(new Uint8ClampedArray([0, 0, 0, 128]));
  assert.equal(cmyk[0], 0);
  assert.equal(cmyk[1], 0);
  assert.equal(cmyk[2], 0);
  assert.ok(cmyk[3] > 100 && cmyk[3] < 155, `K ควรอยู่กลางๆ ได้ ${cmyk[3]}`);
  // โปร่งใสสนิท → ขาว → ไม่มีหมึก
  assert.deepEqual([...rgbaToCmyk(new Uint8ClampedArray([0, 0, 0, 0]))], [0, 0, 0, 0]);
});

const dummyJpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);

function pdfText(pdf: Uint8Array): string {
  return Buffer.from(pdf).toString("latin1");
}

test("buildPrintPdf — กล่องพิมพ์ถูกต้อง: MediaBox = trim+bleed · TrimBox ร่นเข้าเท่า bleed", () => {
  const pdf = buildPrintPdf({
    trimWidthMm: 90,
    trimHeightMm: 50,
    bleedMm: 3,
    image: { kind: "jpeg", data: dummyJpeg(), width: 1134, height: 661 },
  });
  const s = pdfText(pdf);
  assert.ok(s.startsWith("%PDF-1.4"));
  assert.ok(s.trimEnd().endsWith("%%EOF"));
  // 96 มม. = 272.13 pt · 56 มม. = 158.74 pt · bleed 3 มม. = 8.5 pt
  assert.ok(s.includes("/MediaBox [0 0 272.13 158.74]"), "MediaBox ต้องเท่า trim+bleed");
  assert.ok(s.includes("/BleedBox [0 0 272.13 158.74]"));
  assert.ok(s.includes("/TrimBox [8.5 8.5 263.62 150.24]"), "TrimBox ต้องร่นเข้า 3 มม. ทุกด้าน");
  assert.ok(s.includes("/DCTDecode") && s.includes("/DeviceRGB"), "โหมด jpeg = RGB + DCTDecode");
  // ภาพถูกวางเต็ม MediaBox
  assert.ok(s.includes("272.13 0 0 158.74 0 0 cm"));
});

test("buildPrintPdf — โหมด CMYK: DeviceCMYK + FlateDecode และ bytes ถอดกลับได้ตรงต้นฉบับ", () => {
  // ภาพ 2×1 พิกเซล: แดง, ขาว → CMYK 8 ไบต์ → zlib (แบบเดียวกับ CompressionStream("deflate"))
  const cmyk = rgbaToCmyk(new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255]));
  const flated = new Uint8Array(deflateSync(cmyk));
  const pdf = buildPrintPdf({
    trimWidthMm: 50,
    trimHeightMm: 50,
    bleedMm: PRINT_BLEED_MM,
    image: { kind: "cmyk-flate", data: flated, width: 2, height: 1 },
  });
  const s = pdfText(pdf);
  assert.ok(s.includes("/DeviceCMYK") && s.includes("/FlateDecode"));
  assert.ok(s.includes(`/Length ${flated.length}`));
  // stream ในไฟล์ต้อง inflate กลับเป็น CMYK เดิมเป๊ะ
  const start = Buffer.from(pdf).indexOf(Buffer.from(flated));
  assert.ok(start > 0, "ต้องพบ stream ภาพในไฟล์");
  assert.deepEqual([...inflateSync(pdf.slice(start, start + flated.length))], [...cmyk]);
});

test("buildPrintPdf — xref ชี้ offset จริง: ทุก entry ต้องตรงตำแหน่ง 'N 0 obj' และ startxref ตรง 'xref'", () => {
  const pdf = buildPrintPdf({
    trimWidthMm: 60,
    trimHeightMm: 80,
    bleedMm: 3,
    image: { kind: "jpeg", data: dummyJpeg(), width: 780, height: 1016 },
  });
  const s = pdfText(pdf);
  const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(s)?.[1]);
  assert.ok(Number.isFinite(startxref));
  assert.equal(s.slice(startxref, startxref + 4), "xref");
  const entries = [...s.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
  assert.equal(entries.length, 5, "ต้องมี object 1-5");
  entries.forEach((off, i) => {
    assert.equal(s.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`, `offset object ${i + 1} ต้องตรงไบต์`);
  });
});

test("buildPrintPdf — ปฏิเสธ input พัง (ขนาดติดลบ/ภาพว่าง)", () => {
  const img = { kind: "jpeg", data: dummyJpeg(), width: 10, height: 10 } as const;
  assert.throws(() => buildPrintPdf({ trimWidthMm: 0, trimHeightMm: 50, bleedMm: 3, image: img }));
  assert.throws(() => buildPrintPdf({ trimWidthMm: 90, trimHeightMm: 50, bleedMm: -1, image: img }));
  assert.throws(() =>
    buildPrintPdf({ trimWidthMm: 90, trimHeightMm: 50, bleedMm: 3, image: { kind: "jpeg", data: new Uint8Array(0), width: 10, height: 10 } })
  );
});

test("ค่าคงที่พิมพ์ — bleed 3 มม. + caveat CMYK ต้องบอกว่าเป็นการแปลงโดยประมาณ", () => {
  assert.equal(PRINT_BLEED_MM, 3);
  assert.ok(PRINT_CMYK_CAVEAT.includes("3 มม."));
  assert.ok(PRINT_CMYK_CAVEAT.includes("CMYK"));
  assert.ok(PRINT_CMYK_CAVEAT.includes("proof"));
});
