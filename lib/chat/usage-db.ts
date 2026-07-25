// โควตาแชทฝั่ง DB (ผูก auth_uid) — ใช้เมื่อผู้ใช้ล็อกอิน (CLAUDE.md §13)
// อ่าน/เขียนด้วย service role (route เป็นคนยืนยัน auth_uid จาก session มาแล้ว) —
// การเขียนต้องผ่าน RPC bump_chat_usage ที่ grant ให้ service role เท่านั้น (migration 022)
//
// 🔴 ไม่ import เข้า client component — service key ต้องไม่หลุด browser

import { createServiceClient } from "@/lib/supabase/server";

/** bucket ของโควตา — คงรูปแบบให้ตรงกับ migration 022 */
export const planBucket = () => "plan";
export const logicBucket = (logicId: number) => `logic:${logicId}`;

/** ยอดที่ใช้ไปแล้วของ bucket นี้ (0 ถ้ายังไม่เคยใช้) — อ่านล้มเหลวคืน 0 ไม่ทำให้ request พัง */
export async function getDbUsage(authUid: string, bucket: string): Promise<number> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("chat_usage_e")
      .select("used")
      .eq("auth_uid", authUid)
      .eq("bucket", bucket)
      .maybeSingle();
    if (error) {
      console.warn("[usage-db] อ่านโควตาไม่สำเร็จ — ถือว่า 0", error.message);
      return 0;
    }
    return data?.used ?? 0;
  } catch (e) {
    console.warn("[usage-db] อ่านโควตา error — ถือว่า 0", e);
    return 0;
  }
}

/** เพิ่มยอด +1 แบบ atomic คืนยอดใหม่ — ล้มเหลวคืน null (caller ตัดสินใจต่อ) */
export async function bumpDbUsage(authUid: string, bucket: string): Promise<number | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("bump_chat_usage", { p_auth_uid: authUid, p_bucket: bucket });
    if (error) {
      console.warn("[usage-db] bump โควตาไม่สำเร็จ", error.message);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.warn("[usage-db] bump error", e);
    return null;
  }
}
