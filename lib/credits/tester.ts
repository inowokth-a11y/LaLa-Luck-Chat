// กลุ่มผู้ทดลองใช้ (มติผู้ใช้ 31 ส.ค. 2569) — อีเมล whitelist ใน DB (migration 043)
// จัดการผ่าน /admin (เพิ่ม/ปิดได้ทันที ไม่ต้อง redeploy — ต่างจาก env UNLIMITED_CREDIT_UIDS)
//
// - เช็คผ่าน RPC is_tester_account: join auth.users ฝั่ง DB → เพิ่มอีเมลก่อนคนนั้นสมัครก็ได้
//   พอสมัครปุ๊บสิทธิ์ติดทันที (ไม่ต้องรู้/ผูก auth_uid เอง)
// - 🔒 fail-closed: RPC พัง/ไม่มี session = ไม่ใช่ tester (หลักเดียวกับ wallet
//   "อ่านพัง → ถือว่า 0 ไม่ใช่ได้ใช้ฟรี")
// - cache ในหน่วยความจำ 60 วิ/uid — getCreditBalance ถูกเรียกทุก status ping ไม่ควรยิง RPC รัว
//   (ข้าม instance ของ serverless cache แยกกัน — การปิดสิทธิ์มีผลช้าสุด ~60 วิ ยอมรับได้)

import { createServiceClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { v: boolean; exp: number }>();

/** normalize + validate อีเมล tester (lowercase — ตรง check constraint ของตาราง) */
export function normalizeTesterEmail(raw: unknown): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  if (!e || e.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return null;
  return e;
}

/** บัญชีนี้อยู่ในกลุ่มผู้ทดลองใช้ (active) ไหม — ใช้ที่ชั้นกระเป๋าจุดเดียว */
export async function isTesterAccount(authUid: string | null | undefined): Promise<boolean> {
  if (!authUid) return false;
  const hit = cache.get(authUid);
  if (hit && hit.exp > Date.now()) return hit.v;
  let v = false;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("is_tester_account", { p_auth_uid: authUid });
    if (error) {
      console.warn("[tester] is_tester_account ไม่สำเร็จ — ถือว่าไม่ใช่ tester", error.message);
    } else {
      v = data === true;
    }
  } catch (e) {
    console.warn("[tester] is_tester_account error — ถือว่าไม่ใช่ tester", e);
  }
  cache.set(authUid, { v, exp: Date.now() + CACHE_TTL_MS });
  return v;
}

/** ล้าง cache หลังแอดมินแก้รายชื่อ — มีผลทันทีบน instance ที่รับคำขอแอดมิน */
export function clearTesterCache(): void {
  cache.clear();
}
