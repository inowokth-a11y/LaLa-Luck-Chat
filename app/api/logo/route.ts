// /api/logo — สร้างโลโก้ผ่าน fal (Logic 19 + lib/image/fal.ts)
//
// 🔴 เรียก fal = เสียเงินจริง → gate เข้ม: ต้องล็อกอิน + มีโควตา (กันคนใช้ทรัพยากรจนเงิน fal หมด)
//    โควตาเก็บที่ chat_usage_e bucket "logo" (ผูก auth_uid) — ช่วงทดลองฟรี FREE_LOGO_TRIAL ครั้ง
//    ต่อไปหักเป็นเครดิตตามเรท lib/credits/pricing.ts (logo_preview=1, logo_vector=7) เมื่อมีระบบเครดิต

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage } from "@/lib/chat/usage-db";
import { buildProfileContext } from "@/lib/chat/plan-run";
import { isFalAvailable, falLogoPreview, falLogoVector } from "@/lib/image/fal";
import { logoImagePrompt } from "@/lib/engine/naming";
import { wuXingScore, type Element5 } from "@/lib/engine/element";
import { storeLogoImage } from "@/lib/image/store";

export const runtime = "nodejs";
export const maxDuration = 120; // Recraft อาจใช้เวลาหลายวินาที

const FREE_LOGO_TRIAL = 3;
const LOGO_BUCKET = "logo";
const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];
const MAX_BRAND_LEN = 60;

interface Body {
  brandName?: string;
  element?: string;
  variant?: "preview" | "vector";
  /** ความต้องการเพิ่มเติมของผู้ใช้ (free-text) — เสริมเข้า prompt */
  extra?: string;
}
const MAX_EXTRA_LEN = 200;

export async function POST(req: Request) {
  try {
    if (!isFalAvailable()) {
      return NextResponse.json({ error: "ระบบสร้างภาพยังไม่พร้อม (ยังไม่ได้ตั้ง FAL_KEY)" }, { status: 503 });
    }

    const body = (await req.json()) as Body;
    const brandName = (body.brandName ?? "").trim();
    const variant = body.variant === "vector" ? "vector" : "preview";

    if (!brandName) return NextResponse.json({ error: "กรุณาใส่ชื่อแบรนด์" }, { status: 400 });
    if (brandName.length > MAX_BRAND_LEN) {
      return NextResponse.json({ error: `ชื่อแบรนด์ยาวเกินไป (${brandName.length}/${MAX_BRAND_LEN})` }, { status: 400 });
    }

    // ---- gate: ต้องล็อกอิน (เพื่อ track + จำกัดการใช้ fal) ----
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนสร้างโลโก้", needsLogin: true },
        { status: 401 }
      );
    }

    // ---- โควตา (กันเปลือง fal) ----
    const used = await getDbUsage(user.id, LOGO_BUCKET);
    if (used >= FREE_LOGO_TRIAL) {
      return NextResponse.json(
        {
          quotaExceeded: true,
          message: `ช่วงทดลองสร้างโลโก้ได้ ${FREE_LOGO_TRIAL} ครั้ง — เร็ว ๆ นี้เติมเครดิตเพื่อสร้างต่อได้ค่ะ`,
          used,
          limit: FREE_LOGO_TRIAL,
        },
        { status: 429 }
      );
    }

    // ---- ธาตุ: ธาตุประจำตัวผู้ใช้ (เพื่อคะแนน) + ธาตุสไตล์โลโก้ (ผู้ใช้เลือก/ดีฟอลต์) ----
    const { data: prof } = await supabase
      .from("user_profiles_e")
      .select("birth_date")
      .eq("auth_uid", user.id)
      .maybeSingle();
    const ctx = buildProfileContext(prof?.birth_date); // {dominant, missing, seed} | null
    const userElement = ctx?.dominant ?? null;

    const chosen = ELEMENTS.includes(String(body.element)) ? String(body.element) : null;
    const logoElement = chosen ?? userElement ?? "Earth";

    // คะแนนความสอดคล้อง/ขัดแย้งของสไตล์โลโก้กับธาตุประจำตัว (ฟรี — engine เดียวกับ compatibility)
    const harmony = userElement
      ? wuXingScore(userElement as Element5, logoElement as Element5, (ctx?.missing ?? []) as Element5[])
      : null;

    // ---- prompt อังกฤษล้วน + ความต้องการเพิ่มเติมของผู้ใช้ (Logic 19) → fal ----
    const extra = (body.extra ?? "").slice(0, MAX_EXTRA_LEN);
    const prompt = logoImagePrompt(logoElement, brandName, extra);
    const image = variant === "vector" ? await falLogoVector(prompt) : await falLogoPreview(prompt);

    // เก็บลง Supabase Storage ให้ถาวร (URL fal ชั่วคราว) — ล้มเหลวใช้ URL fal แทน
    const storedUrl = await storeLogoImage(user.id, image.url, image.contentType);
    const imageUrl = storedUrl ?? image.url;

    // หักโควตาหลังสำเร็จเท่านั้น
    const bumped = await bumpDbUsage(user.id, LOGO_BUCKET);
    const nowUsed = bumped ?? used + 1;

    return NextResponse.json({
      imageUrl,
      stored: storedUrl !== null,
      contentType: image.contentType,
      prompt,
      element: logoElement, // ธาตุสไตล์ของโลโก้
      userElement, // ธาตุประจำตัว (null ถ้ายังไม่มีโปรไฟล์)
      harmony, // คะแนน wuXingScore สไตล์โลโก้ ↔ ธาตุประจำตัว (null ถ้าไม่มีโปรไฟล์)
      variant,
      used: nowUsed,
      remaining: Math.max(0, FREE_LOGO_TRIAL - nowUsed),
      limit: FREE_LOGO_TRIAL,
      note: storedUrl ? "เก็บถาวรใน Storage แล้ว" : "เก็บ Storage ไม่สำเร็จ — URL นี้เป็นชั่วคราว ควรดาวน์โหลดไว้",
    });
  } catch (err) {
    console.error("[logo] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** GET = เช็คว่าระบบพร้อม + ราคา (ไม่เสียเงิน) */
export function GET() {
  return NextResponse.json({ ok: true, fal_available: isFalAvailable(), free_trial: FREE_LOGO_TRIAL });
}
