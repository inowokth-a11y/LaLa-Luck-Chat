// บันทึกการเรียก AI ทุกครั้งลง ai_usage_log — ฐานของแดชบอร์ดต้นทุนและการตั้งราคา
//
// ⚠️ หลักการ: **การบันทึกต้องไม่ทำให้คำตอบผู้ใช้พังเด็ดขาด**
//    ทุกฟังก์ชันที่นี่กลืน error ทั้งหมด ล้มเหลวแค่แปลว่าเสียข้อมูลสถิติ 1 แถว
//    ไม่ใช่ผู้ใช้ไม่ได้คำตอบ

import { createServiceClient } from "@/lib/supabase/server";
import { calcCost } from "@/lib/ai/pricing";
import type { AiUsage } from "@/lib/ai/types";

export interface UsageRecord {
  userId?: string | null;
  channel?: string;
  logicId?: number | null;
  aiRole: string;
  provider: string;
  model: string;
  usedFallback: boolean;
  usage?: AiUsage;
  cacheHit?: boolean | null;
  durationMs?: number;
  ok?: boolean;
  errorMessage?: string;
}

/**
 * เขียน 1 แถวต่อการเรียก AI 1 ครั้ง — เรียกแบบ fire-and-forget ได้ (ไม่ต้อง await)
 * ถ้าไม่มี usage (provider ไม่คืนมา) จะบันทึกต้นทุนเป็น 0 พร้อม log เตือน
 * เพื่อไม่ให้ต้นทุนหายไปจากรายงานแบบเงียบๆ
 */
export async function logAiUsage(rec: UsageRecord): Promise<void> {
  try {
    const u = rec.usage;
    if (!u) {
      console.warn(`[usage] ${rec.provider}/${rec.model} ไม่คืน usage — ต้นทุนจะถูกบันทึกเป็น 0`);
    }

    const cost = calcCost(rec.model, u?.input_tokens ?? 0, u?.output_tokens ?? 0, u?.web_searches ?? 0);
    if (cost.unknownModel) {
      console.warn(`[usage] ไม่มีราคาของโมเดล "${rec.model}" ใน lib/ai/pricing.ts — ต้นทุนจะต่ำกว่าจริง`);
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("ai_usage_log").insert({
      user_id: rec.userId ?? null,
      channel: rec.channel ?? "web",
      logic_id: rec.logicId ?? null,
      ai_role: rec.aiRole,
      provider: rec.provider,
      model: rec.model,
      used_fallback: rec.usedFallback,
      input_tokens: u?.input_tokens ?? 0,
      output_tokens: u?.output_tokens ?? 0,
      web_searches: u?.web_searches ?? 0,
      cost_usd: Number(cost.usd.toFixed(6)),
      cost_thb: Number(cost.thb.toFixed(4)),
      cache_hit: rec.cacheHit ?? null,
      duration_ms: rec.durationMs ?? null,
      ok: rec.ok ?? true,
      error_message: rec.errorMessage ?? null,
    });
    if (error) console.warn("[usage] บันทึกไม่สำเร็จ", error.message);
  } catch (e) {
    console.warn("[usage] บันทึกไม่สำเร็จ", e);
  }
}

/**
 * บันทึกเหตุการณ์ที่ "ไม่ได้เรียก AI เพราะเจอในแคช" — สำคัญพอๆ กับตอนเรียกจริง
 * เพราะ **cache hit rate คือตัวเลขที่กำหนดกำไรของทั้งระบบ** ถ้าบันทึกแค่ตอนที่จ่ายเงิน
 * เราจะเห็นแต่ต้นทุน ไม่เห็นว่าประหยัดไปเท่าไหร่ และคำนวณอัตราการเจอแคชไม่ได้เลย
 */
export async function logCacheHit(params: {
  userId?: string | null;
  channel?: string;
  logicId: number;
  aiRole: string;
  durationMs?: number;
}): Promise<void> {
  return logAiUsage({
    ...params,
    provider: "cache",
    model: "cache",
    usedFallback: false,
    usage: { input_tokens: 0, output_tokens: 0, web_searches: 0 },
    cacheHit: true,
    ok: true,
  });
}
