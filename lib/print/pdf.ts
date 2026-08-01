// ไฟล์พิมพ์ฉลาก — สร้าง PDF ระดับส่งโรงพิมพ์: ระยะเจียน (bleed) + TrimBox + สี CMYK
// pure ล้วน (ไม่มี DOM/network) — ฝั่ง browser เตรียมพิกเซล/บีบอัดเอง แล้วส่ง bytes เข้ามา
//
// ⚠️ การแปลง RGB→CMYK เป็นสูตรมาตรฐานทั่วไป (uncalibrated, ไม่มี ICC โปรไฟล์ของโรงพิมพ์)
//    สีบนกระดาษจริงอาจเพี้ยนเล็กน้อย — ต้องแสดง PRINT_CMYK_CAVEAT ให้ผู้ใช้เห็นเสมอ (หลัก §5)

/** ระยะเจียนมาตรฐานที่โรงพิมพ์ไทยใช้ทั่วไป */
export const PRINT_BLEED_MM = 3;

export const PRINT_CMYK_CAVEAT =
  "ไฟล์ PDF นี้เผื่อเจียน 3 มม. รอบด้าน และแปลงสีเป็น CMYK แบบมาตรฐานทั่วไป (ไม่ได้ใช้โปรไฟล์สีของโรงพิมพ์) — สีบนกระดาษจริงอาจต่างจากหน้าจอเล็กน้อย แนะนำขอดูตัวอย่างพิมพ์ (proof) ก่อนพิมพ์จำนวนมาก";

/** มม. → พอยต์ PDF (1 นิ้ว = 72 pt = 25.4 มม.) */
export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

/**
 * RGBA (canvas ImageData) → CMYK 4 ไบต์/พิกเซล (255 = หมึกเต็ม ตรงกับ DeviceCMYK 1.0)
 * พิกเซลโปร่งใสถูก composite ลงพื้นขาวก่อน (งานพิมพ์ไม่มี alpha)
 */
export function rgbaToCmyk(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const px = rgba.length / 4;
  const out = new Uint8Array(px * 4);
  for (let i = 0; i < px; i++) {
    const a = rgba[i * 4 + 3] / 255;
    // composite over white: c' = c*a + 255*(1-a)
    const r = (rgba[i * 4] * a + 255 * (1 - a)) / 255;
    const g = (rgba[i * 4 + 1] * a + 255 * (1 - a)) / 255;
    const b = (rgba[i * 4 + 2] * a + 255 * (1 - a)) / 255;
    const k = 1 - Math.max(r, g, b);
    let c = 0, m = 0, y = 0;
    if (k < 1) {
      c = (1 - r - k) / (1 - k);
      m = (1 - g - k) / (1 - k);
      y = (1 - b - k) / (1 - k);
    }
    out[i * 4] = Math.round(c * 255);
    out[i * 4 + 1] = Math.round(m * 255);
    out[i * 4 + 2] = Math.round(y * 255);
    out[i * 4 + 3] = Math.round(k * 255);
  }
  return out;
}

/** ภาพที่จะฝังลง PDF — เตรียม/บีบอัดมาก่อนแล้ว (โมดูลนี้ไม่บีบอัดเอง) */
export type PrintImage =
  | { kind: "jpeg"; data: Uint8Array; width: number; height: number } // DeviceRGB + DCTDecode (fallback)
  | { kind: "cmyk-flate"; data: Uint8Array; width: number; height: number }; // DeviceCMYK + FlateDecode (zlib)

export interface PrintPdfOptions {
  /** ขนาดสำเร็จ (หลังตัด) หน่วยมม. */
  trimWidthMm: number;
  trimHeightMm: number;
  /** ระยะเจียนรอบด้าน หน่วยมม. — ภาพต้องเรนเดอร์คลุมพื้นที่ trim+bleed มาแล้ว */
  bleedMm: number;
  image: PrintImage;
}

const enc = new TextEncoder(); // โครง PDF เป็น ASCII ล้วน — UTF-8 จึงตรงไบต์

/** เลขพิกัด PDF — ตัดทศนิยม 2 ตำแหน่งพอ (ละเอียด ~0.004 มม.) */
function pt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/**
 * ประกอบ PDF หน้าเดียว: MediaBox = trim+bleed · TrimBox = ขนาดสำเร็จ (โรงพิมพ์ใช้เล็งตัด)
 * ภาพถูกวางเต็ม MediaBox — xref คำนวณ offset จริงทุกไบต์ (เปิดได้กับ viewer ที่เข้มงวด)
 */
export function buildPrintPdf(opts: PrintPdfOptions): Uint8Array {
  const { trimWidthMm, trimHeightMm, bleedMm, image } = opts;
  if (trimWidthMm <= 0 || trimHeightMm <= 0 || bleedMm < 0) throw new Error("ขนาด/ระยะเจียนไม่ถูกต้อง");
  if (image.width <= 0 || image.height <= 0 || image.data.length === 0) throw new Error("ภาพว่าง");

  const W = mmToPt(trimWidthMm + bleedMm * 2);
  const H = mmToPt(trimHeightMm + bleedMm * 2);
  const b = mmToPt(bleedMm);

  const isCmyk = image.kind === "cmyk-flate";
  const colorSpace = isCmyk ? "/DeviceCMYK" : "/DeviceRGB";
  const filter = isCmyk ? "/FlateDecode" : "/DCTDecode";

  const content = enc.encode(`q\n${pt(W)} 0 0 ${pt(H)} 0 0 cm\n/Im0 Do\nQ`);

  // objects 1-5 — เก็บ offset ของแต่ละ object เพื่อเขียน xref ให้ตรงไบต์
  const chunks: Uint8Array[] = [];
  let len = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? enc.encode(part) : part;
    chunks.push(bytes);
    len += bytes.length;
  };
  const offsets: number[] = [0]; // index 0 = free object

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"); // บรรทัด binary comment ตามธรรมเนียม (บอกว่าไฟล์มี binary)

  offsets.push(len);
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets.push(len);
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets.push(len);
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(W)} ${pt(H)}] ` +
      `/BleedBox [0 0 ${pt(W)} ${pt(H)}] /TrimBox [${pt(b)} ${pt(b)} ${pt(W - b)} ${pt(H - b)}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets.push(len);
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
      `/ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter ${filter} /Length ${image.data.length} >>\nstream\n`
  );
  push(image.data);
  push("\nendstream\nendobj\n");

  offsets.push(len);
  push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`);
  push(content);
  push("\nendstream\nendobj\n");

  const xrefStart = len;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(len);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
