// ตรวจไฟล์ภาพฝั่ง server — ตรรกะล้วน (magic bytes ไม่ใช่นามสกุล/ MIME ที่ client อ้าง)

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // client ย่อ ≤768px แล้ว ปกติ ~100-300KB

export type ImageKind = "image/jpeg" | "image/png" | "image/webp";

/** ระบุชนิดภาพจาก magic bytes จริง — ไม่รู้จัก = null (ปฏิเสธ ไม่เดา) */
export function sniffImageType(buf: Uint8Array): ImageKind | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // WebP: "RIFF" .... "WEBP"
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}

/** แกะ base64 (รับทั้ง data URL และ base64 ล้วน) → buffer · พัง/ใหญ่เกิน = null */
export function decodeImageBase64(input: string): { buf: Buffer; base64: string } | null {
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(input.trim());
  const base64 = (m ? m[1] : input.trim()).replace(/\s/g, "");
  if (!base64 || base64.length > (MAX_IMAGE_BYTES * 4) / 3 + 16) return null;
  // Buffer.from ไม่ throw กับอักขระเพี้ยน (มันข้ามเงียบๆ) — ต้องตรวจ charset เองก่อน
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  try {
    const buf = Buffer.from(base64, "base64");
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
    return { buf, base64 };
  } catch {
    return null;
  }
}
