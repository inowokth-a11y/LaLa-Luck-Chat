// เก็บภาพ face-card ลง Supabase Storage bucket ส่วนตัว + ดึงกลับ (service role เท่านั้น)
//
// 🔴 bucket "face_cards" เป็น **private** (ต่างจาก logos) — ไม่มี storage policy เลย
//    = client เข้าไม่ได้ · เสิร์ฟผ่าน signed URL (เจ้าของ) หรือ stream ฝั่ง server (หน้าแชร์/OG)
// รูปถ่ายใบหน้าต้นฉบับ **ไม่ผ่านไฟล์นี้เด็ดขาด** — เก็บเฉพาะภาพผลงานที่เจนแล้ว (นโยบาย consent)

import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const FACE_CARD_BUCKET = "face_cards";

/** token หน้าแชร์ /s/<token> — 16 ไบต์สุ่ม = 22 ตัวอักษร base64url (เดาไม่ได้) */
export function newShareToken(): string {
  return randomBytes(16).toString("base64url");
}

/** ตรวจรูปแบบ token ก่อน query — กัน path แปลกๆ เข้า service role lookup */
export function isValidShareToken(t: string): boolean {
  return /^[A-Za-z0-9_-]{16,32}$/.test(t);
}

/** สร้าง bucket ถ้ายังไม่มี (idempotent — เรียกก่อนอัปโหลดครั้งแรก) */
export async function ensureFaceCardBucket(): Promise<void> {
  const svc = createServiceClient();
  const { data } = await svc.storage.getBucket(FACE_CARD_BUCKET);
  if (!data) {
    const { error } = await svc.storage.createBucket(FACE_CARD_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

/** อัปโหลดภาพผลงาน (ดึงจาก URL ชั่วคราวของ fal) — คืน path ใน bucket */
export async function storeFaceCardImage(authUid: string, genId: string, sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`ดึงภาพจากแหล่งชั่วคราวไม่สำเร็จ (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  // 🔴 content-type จาก fal เชื่อไม่ได้ (เจอจริง: header บอก jpeg แต่ไฟล์เป็น PNG) — ดู magic bytes เอง
  const sniffed = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 ? "image/png"
    : buf[0] === 0xff && buf[1] === 0xd8 ? "image/jpeg"
    : res.headers.get("content-type") ?? "image/jpeg";
  const ct = sniffed;
  const ext = ct.includes("png") ? "png" : "jpg";
  const path = `${authUid}/${genId}.${ext}`;

  const svc = createServiceClient();
  const { error } = await svc.storage.from(FACE_CARD_BUCKET).upload(path, buf, { contentType: ct, upsert: true });
  if (error) throw new Error(`เก็บภาพลง Storage ไม่สำเร็จ: ${error.message}`);
  return path;
}

/** signed URL อายุสั้นสำหรับเจ้าของดูภาพตัวเอง (bucket private) */
export async function faceCardSignedUrl(path: string, expiresInSec = 3600): Promise<string | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.storage.from(FACE_CARD_BUCKET).createSignedUrl(path, expiresInSec);
  if (error) {
    console.warn("[face-card] สร้าง signed URL ไม่สำเร็จ", error.message);
    return null;
  }
  return data.signedUrl;
}

/** อ่านภาพเป็น Buffer ฝั่ง server (ใช้วาด OG/สตอรี่ — ไม่ต้องเปิด URL สาธารณะ) */
export async function readFaceCardImage(path: string): Promise<Buffer | null> {
  const svc = createServiceClient();
  const { data, error } = await svc.storage.from(FACE_CARD_BUCKET).download(path);
  if (error || !data) {
    console.warn("[face-card] อ่านภาพจาก Storage ไม่สำเร็จ", error?.message);
    return null;
  }
  return Buffer.from(await data.arrayBuffer());
}

/** ลบภาพทั้งหมดของผู้ใช้ (เรียกตอนลบบัญชี — FK cascade ลบแถว DB แต่ไม่ลบไฟล์ Storage) */
export async function deleteFaceCardImages(authUid: string): Promise<void> {
  try {
    const svc = createServiceClient();
    const { data } = await svc.storage.from(FACE_CARD_BUCKET).list(authUid);
    const files = (data ?? []).map((f) => `${authUid}/${f.name}`);
    if (files.length) await svc.storage.from(FACE_CARD_BUCKET).remove(files);
  } catch (e) {
    console.warn("[face-card] ลบไฟล์ตอนลบบัญชีไม่สำเร็จ (ไม่บล็อกการลบบัญชี)", e);
  }
}
