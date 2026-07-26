// /api/label/artwork — สร้างพื้นหลัง/ลวดลายฉลากผ่าน fal (ตามธาตุ + ลวดลายที่ผู้ใช้ขอ)
// 🔴 เรียก fal = เสียเงิน → gate: ต้องล็อกอิน + โควตา (bucket "label") · เก็บลง Storage ถาวร
// องค์ประกอบคำนวณด้วย engine label.ts (ธาตุลวดลาย ↔ ธาตุแบรนด์) — ข้อความ overlay ทีหลัง (ไม่ให้ AI เขียน)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage } from "@/lib/chat/usage-db";
import { isFalAvailable, falLabelArtwork, type LabelOrientation } from "@/lib/image/fal";
import { storeLogoImage } from "@/lib/image/store";
import { motifElement, scoreLabelComposition, LABEL_COMPOSITION_CAVEAT } from "@/lib/engine/label";
import { THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { ELEMENT_TO_COLORS } from "@/lib/engine/fengshui";

export const runtime = "nodejs";
export const maxDuration = 120;

const FREE_LABEL_TRIAL = 3;
const LABEL_BUCKET = "label";
const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];
const MAX_MOTIF_LEN = 160;

// สไตล์ภาษาอังกฤษต่อธาตุ (ให้โมเดลเข้าใจ) — โทน/บรรยากาศ
const EL_STYLE_EN: Record<string, string> = {
  Wood: "lush green botanical, growth, fresh foliage",
  Fire: "warm red-orange, energetic, radiant, Thai flame (kanok) motifs",
  Earth: "earthy golden-brown, grounded, ceramic/stone texture",
  Metal: "elegant metallic gold and white, refined, precise",
  Water: "calm blue, flowing water, wave patterns",
};

interface Body {
  brandElement?: string;
  motif?: string;
  orientation?: LabelOrientation;
}

export async function POST(req: Request) {
  try {
    if (!isFalAvailable()) {
      return NextResponse.json({ error: "ระบบสร้างภาพยังไม่พร้อม (ยังไม่ได้ตั้ง FAL_KEY)" }, { status: 503 });
    }
    const body = (await req.json()) as Body;

    // gate: ต้องล็อกอิน
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ needsLogin: true, error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

    // โควตา
    const used = await getDbUsage(user.id, LABEL_BUCKET);
    if (used >= FREE_LABEL_TRIAL) {
      return NextResponse.json(
        { quotaExceeded: true, error: `ใช้สิทธิ์สร้างพื้นหลังฟรีครบ ${FREE_LABEL_TRIAL} ครั้งแล้ว` },
        { status: 429 }
      );
    }

    const brandElement = (ELEMENTS.includes(String(body.brandElement)) ? String(body.brandElement) : "Earth") as Element5;
    const motif = (body.motif ?? "").slice(0, MAX_MOTIF_LEN).trim();
    const orientation: LabelOrientation =
      body.orientation === "portrait" || body.orientation === "square" ? body.orientation : "landscape";

    // ---- คำนวณองค์ประกอบ (ธาตุลวดลาย ↔ ธาตุแบรนด์) ----
    const motifEl = motif ? motifElement(motif) : null;
    const composition = motifEl
      ? scoreLabelComposition({
          brandElement,
          components: [{ kind: "ลวดลาย", label: motif, element: motifEl }],
        })
      : null;

    // ---- prompt: ลวดลายที่ผู้ใช้ขอ + สไตล์ธาตุ · เว้นกลางให้วางโลโก้/ข้อความ · ห้ามมีตัวอักษร ----
    const style = EL_STYLE_EN[brandElement];
    const prompt =
      `ornamental decorative BORDER frame for a premium product label, ` +
      (motif ? `motif: ${motif}, ` : "") +
      `${style}, elegant Thai aesthetic, refined, ` +
      `the pattern stays around the EDGES as a frame, large EMPTY light-colored space in the CENTER, ` +
      `absolutely no text, no letters, no words, no symbols, no calligraphy, no characters, ` +
      `clean high-quality vector pattern`;

    const image = await falLabelArtwork(prompt, orientation);
    const storedUrl = await storeLogoImage(user.id, image.url, image.contentType);
    const imageUrl = storedUrl ?? image.url;

    const bumped = await bumpDbUsage(user.id, LABEL_BUCKET);
    const nowUsed = bumped ?? used + 1;

    return NextResponse.json({
      imageUrl,
      stored: storedUrl !== null,
      prompt,
      brandElement,
      motifElement: motifEl,
      composition, // คะแนนองค์ประกอบ (null ถ้าไม่ระบุลวดลายที่รู้จัก)
      suggestedColors: ELEMENT_TO_COLORS[brandElement],
      caveat: LABEL_COMPOSITION_CAVEAT,
      used: nowUsed,
      remaining: Math.max(0, FREE_LABEL_TRIAL - nowUsed),
      limit: FREE_LABEL_TRIAL,
    });
  } catch (err) {
    console.error("[label/artwork] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** GET = ตรวจว่าพร้อม + ธาตุที่รู้จัก (ไม่เสียเงิน) */
export function GET() {
  return NextResponse.json({
    ok: true,
    fal_available: isFalAvailable(),
    elements: ELEMENTS.map((e) => ({ key: e, th: THAI_LABEL_5[e as Element5] })),
  });
}
