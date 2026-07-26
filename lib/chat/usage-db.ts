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

/** อ่าน used + bonus พร้อมกัน (bonus = โควตาฟรีเพิ่มจากรางวัล §025) — ใช้กับ plan bucket */
export async function getDbUsageBonus(authUid: string, bucket: string): Promise<{ used: number; bonus: number }> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("chat_usage_e")
      .select("used,bonus")
      .eq("auth_uid", authUid)
      .eq("bucket", bucket)
      .maybeSingle();
    if (error) {
      console.warn("[usage-db] อ่าน used/bonus ไม่สำเร็จ — ถือว่า 0", error.message);
      return { used: 0, bonus: 0 };
    }
    return { used: data?.used ?? 0, bonus: data?.bonus ?? 0 };
  } catch (e) {
    console.warn("[usage-db] อ่าน used/bonus error — ถือว่า 0", e);
    return { used: 0, bonus: 0 };
  }
}

/** เพิ่มโบนัส (โควตาฟรี) แบบ atomic คืนโบนัสใหม่ — ใช้ให้รางวัล เช่น คอมเมนต์ */
export async function addDbBonus(authUid: string, bucket: string, amount: number): Promise<number | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("add_chat_bonus", { p_auth_uid: authUid, p_bucket: bucket, p_amount: amount });
    if (error) {
      console.warn("[usage-db] add_chat_bonus ไม่สำเร็จ", error.message);
      return null;
    }
    return typeof data === "number" ? data : null;
  } catch (e) {
    console.warn("[usage-db] add_chat_bonus error", e);
    return null;
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
