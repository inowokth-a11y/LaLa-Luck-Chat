// บันทึก metadata การ gen ภาพ (migration 028) — fire-and-forget: log พังต้องไม่ทำให้ generation พัง
// 🔴 ไม่ import เข้า client component — ใช้ service role

import { createServiceClient } from "@/lib/supabase/server";

export interface GenerationLogEntry {
  authUid: string;
  kind: "logo_preview" | "logo_vector" | "label_artwork" | "soulmate_image" | "face_card";
  imageUrl: string | null;
  stored: boolean;
  prompt?: string;
  brandName?: string;
  brandElement?: string;
  motif?: string;
  motifElement?: string | null;
  orientation?: string;
  /** ผลคำนวณ ณ เวลาสร้าง (scoreLabelComposition / harmony) — เก็บค่าตายตัว ไม่คำนวณย้อนหลัง */
  composition?: unknown;
}

export async function logImageGeneration(entry: GenerationLogEntry): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc.from("image_generation_log_e").insert({
      auth_uid: entry.authUid,
      kind: entry.kind,
      image_url: entry.imageUrl,
      stored: entry.stored,
      prompt: entry.prompt ?? null,
      brand_name: entry.brandName ?? null,
      brand_element: entry.brandElement ?? null,
      motif: entry.motif ?? null,
      motif_element: entry.motifElement ?? null,
      orientation: entry.orientation ?? null,
      composition: entry.composition ?? null,
    });
    if (error) console.warn("[generation-log] บันทึกไม่สำเร็จ", error.message);
  } catch (e) {
    console.warn("[generation-log] error", e);
  }
}
