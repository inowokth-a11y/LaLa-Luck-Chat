// เก็บชุดภาพเนื้อคู่ลง Supabase Storage bucket ส่วนตัว (service role เท่านั้น) — โครงเดียวกับ
// lib/face-card/store.ts · token/validator ใช้ร่วมกับ face-card (สุ่ม 22 ตัว base64url)
//
// ภาพเป็นบุคคลสมมติจาก FLUX ล้วน (ไม่มีชีวมิติ) — เก็บถาวรจนลบบัญชี · เสิร์ฟผ่าน signed URL
// หรืออ่านฝั่ง server สำหรับหน้าแชร์/OG

import { createServiceClient } from "@/lib/supabase/server";

export const SOULMATE_BUCKET = "soulmate_images";

export { newShareToken, isValidShareToken } from "@/lib/face-card/store";

/** สร้าง bucket ถ้ายังไม่มี (idempotent) */
export async function ensureSoulmateBucket(): Promise<void> {
  const svc = createServiceClient();
  const { data } = await svc.storage.getBucket(SOULMATE_BUCKET);
  if (!data) {
    const { error } = await svc.storage.createBucket(SOULMATE_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

/** อัปโหลดภาพจาก URL ชั่วคราวของ fal — คืน path ใน bucket */
export async function storeSoulmateImage(authUid: string, genId: string, index: number, sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`ดึงภาพจากแหล่งชั่วคราวไม่สำเร็จ (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  // 🔴 ห้ามเชื่อ content-type ของ fal (เคยส่ง PNG ใน header jpeg) — ดู magic bytes เอง
  const ct = buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 ? "image/png" : "image/jpeg";
  const path = `${authUid}/${genId}-${index}.${ct.includes("png") ? "png" : "jpg"}`;

  const svc = createServiceClient();
  const { error } = await svc.storage.from(SOULMATE_BUCKET).upload(path, buf, { contentType: ct, upsert: true });
  if (error) throw new Error(`เก็บภาพลง Storage ไม่สำเร็จ: ${error.message}`);
  return path;
}

/** signed URL อายุสั้นให้เจ้าของ/หน้าแชร์แสดงภาพ (bucket private) */
export async function soulmateSignedUrl(path: string, expiresInSec = 86400): Promise<string | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.storage.from(SOULMATE_BUCKET).createSignedUrl(path, expiresInSec);
  if (error) {
    console.warn("[soulmate/store] สร้าง signed URL ไม่สำเร็จ", error.message);
    return null;
  }
  return data.signedUrl;
}

/** อ่านภาพเป็น Buffer ฝั่ง server (วาด OG) */
export async function readSoulmateImage(path: string): Promise<Buffer | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.storage.from(SOULMATE_BUCKET).download(path);
  if (error || !data) {
    console.warn("[soulmate/store] อ่านภาพไม่สำเร็จ", error?.message);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

/** ลบภาพทั้งหมดของผู้ใช้ (เรียกตอนลบบัญชี — cascade ลบแค่แถว DB ไม่ลบไฟล์) */
export async function deleteSoulmateImages(authUid: string): Promise<void> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.storage.from(SOULMATE_BUCKET).list(authUid);
    const files = (data ?? []).map((f) => `${authUid}/${f.name}`);
    if (files.length) await svc.storage.from(SOULMATE_BUCKET).remove(files);
  } catch (e) {
    console.warn("[soulmate/store] ลบไฟล์ตอนลบบัญชีไม่สำเร็จ (ไม่บล็อกการลบบัญชี)", e);
  }
}
