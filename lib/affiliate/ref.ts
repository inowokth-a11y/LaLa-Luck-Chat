// เลเยอร์การแชร์ต่อ — pure helpers สำหรับพก "ทางที่มา" (via) ไปกับ ref cookie/URL
//
// เส้นทางเต็ม (3 ส.ค. 2569):
//   คลิกลิงก์พันธมิตรตรง  /?ref=CODE            → via 'link'
//   กดการ์ดที่ถูกแชร์ต่อ   /card/88?ref=CODE     → redirect /?ref=CODE&via=share → via 'share'
//   สมัคร → attribution เก็บ via ด้วย → แดชบอร์ดแยกได้ว่าลิงก์ไหน viral จริง
//
// cookie kruth_ref เก็บค่าเดียว: "CODE" (คลิกตรง) หรือ "CODE|s" (มาจากแชร์ต่อ)
// — first-touch เดิมไม่เปลี่ยน: cookie แรกชนะ ตั้งซ้ำได้แต่ attribution upsert ignoreDuplicates

import { isValidCode } from "./code";

export type RefVia = "link" | "share";

const SHARE_SUFFIX = "|s";

/** ค่านอกเหนือ "share" ทั้งหมด = "link" — ห้ามเดา */
export function toRefVia(v: unknown): RefVia {
  return v === "share" ? "share" : "link";
}

export function encodeRefCookie(code: string, via: RefVia): string {
  return via === "share" ? `${code}${SHARE_SUFFIX}` : code;
}

export function parseRefCookie(value: unknown): { code: string; via: RefVia } | null {
  if (typeof value !== "string" || !value) return null;
  const share = value.endsWith(SHARE_SUFFIX);
  const code = share ? value.slice(0, -SHARE_SUFFIX.length) : value;
  if (!isValidCode(code)) return null;
  return { code, via: share ? "share" : "link" };
}
