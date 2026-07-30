// แคชผลจำแนกภาพ (migration 029) — service role · อ่านพัง = แคชพลาด (ไปเรียก AI) ไม่ใช่ล่มทั้ง request
// 🔴 ไม่ import เข้า client component

import { createServiceClient } from "@/lib/supabase/server";
import type { VisionClassification } from "./classify";

export async function getCachedVision(imageHash: string): Promise<VisionClassification | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("vision_analysis_cache_e")
      .select("result")
      .eq("image_hash", imageHash)
      .maybeSingle();
    if (error || !data?.result) return null;
    // นับ hit แบบ fire-and-forget — cache hit rate คือตัวเลขกำไรของฟีเจอร์นี้ (§12)
    void svc.rpc("bump_vision_cache_hit", { p_hash: imageHash }).then(
      ({ error: e }) => e && console.warn("[vision-cache] bump ไม่สำเร็จ", e.message)
    );
    return data.result as VisionClassification;
  } catch (e) {
    console.warn("[vision-cache] อ่านแคชพัง — ถือว่าไม่มีแคช", e);
    return null;
  }
}

export async function storeVisionResult(
  imageHash: string,
  result: VisionClassification,
  model: string
): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc
      .from("vision_analysis_cache_e")
      .upsert({ image_hash: imageHash, result, model }, { ignoreDuplicates: true });
    if (error) console.warn("[vision-cache] บันทึกแคชไม่สำเร็จ", error.message);
  } catch (e) {
    console.warn("[vision-cache] error", e);
  }
}
