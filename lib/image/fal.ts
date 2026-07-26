// สร้างภาพผ่าน fal.ai — ใช้กับโลโก้ (Logic 19) · CLAUDE.md §12/pricing
// API contract (verify จาก fal docs): POST https://fal.run/{model} · header "Authorization: Key <FAL_KEY>"
//   body { prompt, image_size, ... } → ผลลัพธ์ { images: [{ url, content_type, width, height }] }
//
// 🔴 ห้าม import เข้า client component — FAL_KEY ต้องอยู่ฝั่ง server เท่านั้น
// ⚠️ ทุกครั้งที่เรียก = เสียเงินจริง (fal) — route ต้อง gate (ล็อกอิน + โควตา) ก่อนเรียก

export interface FalImageResult {
  url: string;
  contentType: string;
  width?: number;
  height?: number;
}

/** โมเดล fal ที่เลือกใช้ (ดูเหตุผล/ราคาใน lib/credits/pricing.ts) */
export const FAL_MODELS = {
  /** โลโก้ตัวอย่าง เร็ว/ถูก (~฿0.22) — FLUX.1 schnell */
  logoPreview: "fal-ai/flux/schnell",
  /** โลโก้เวกเตอร์ SVG ใช้เชิงพาณิชย์ได้ (~฿2.88) — Recraft V3 */
  logoVector: "fal-ai/recraft/v3/text-to-image",
} as const;

export function isFalAvailable(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/** เรียก fal แบบ synchronous (บล็อกจนเสร็จ) — คืน URL ภาพแรก */
export async function falGenerate(model: string, body: Record<string, unknown>): Promise<FalImageResult> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้ง FAL_KEY ใน env");

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`fal ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { images?: { url?: string; content_type?: string; width?: number; height?: number }[] };
  const img = data.images?.[0];
  if (!img?.url) throw new Error("fal ไม่ได้คืน URL ภาพ");
  return { url: img.url, contentType: img.content_type ?? "image/png", width: img.width, height: img.height };
}

/** โลโก้ตัวอย่าง (FLUX schnell) — เร็ว/ถูก */
export function falLogoPreview(prompt: string): Promise<FalImageResult> {
  return falGenerate(FAL_MODELS.logoPreview, { prompt, image_size: "square_hd", num_images: 1 });
}

/** โลโก้เวกเตอร์ (Recraft V3, สไตล์เวกเตอร์) — ใช้เชิงพาณิชย์ได้ */
export function falLogoVector(prompt: string): Promise<FalImageResult> {
  return falGenerate(FAL_MODELS.logoVector, {
    prompt,
    style: "vector_illustration",
    image_size: "square_hd",
  });
}
