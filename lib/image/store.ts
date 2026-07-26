// เก็บรูปโลโก้ลง Supabase Storage — URL fal เป็นชั่วคราว จึงต้อง copy มาไว้ถาวร
// เขียนด้วย service role · bucket 'logos' เป็น public (อ่านผ่าน URL ได้เลย)
// ล้มเหลว = คืน null → route ใช้ URL fal ชั่วคราวแทน (ไม่ทำให้ generation พัง)

import { createServiceClient } from "@/lib/supabase/server";

export const LOGO_STORAGE_BUCKET = "logos";

const extFromType = (ct: string) =>
  ct.includes("png") ? "png" : ct.includes("svg") ? "svg" : ct.includes("webp") ? "webp" : "jpg";

export async function storeLogoImage(
  userId: string,
  sourceUrl: string,
  contentType: string
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.warn("[logo/store] ดึงรูปต้นทางไม่สำเร็จ", res.status);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromType(contentType)}`;

    const svc = createServiceClient();
    const { error } = await svc.storage.from(LOGO_STORAGE_BUCKET).upload(path, buf, {
      contentType,
      upsert: false,
    });
    if (error) {
      console.warn("[logo/store] อัปโหลดไม่สำเร็จ", error.message);
      return null;
    }
    return svc.storage.from(LOGO_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn("[logo/store] error", e);
    return null;
  }
}
