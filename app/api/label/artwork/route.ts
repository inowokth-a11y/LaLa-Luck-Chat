// /api/label/artwork — สร้างพื้นหลัง/ลวดลายฉลากผ่าน fal (ตามธาตุ + ลวดลายที่ผู้ใช้ขอ)
// 🔴 เรียก fal = เสียเงิน → gate: ต้องล็อกอิน + โควตา (bucket "label") · เก็บลง Storage ถาวร
// องค์ประกอบคำนวณด้วย engine label.ts (ธาตุลวดลาย ↔ ธาตุแบรนด์) — ข้อความ overlay ทีหลัง (ไม่ให้ AI เขียน)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage } from "@/lib/chat/usage-db";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { isFalAvailable, falLabelArtwork, type LabelOrientation } from "@/lib/image/fal";
import { storeLogoImage } from "@/lib/image/store";
import { logImageGeneration } from "@/lib/image/generation-log";
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

    // โควตาฟรี → หมดแล้วตกเส้นเครดิต (label_artwork = 7 เครดิต ตามเรท §12)
    const used = await getDbUsage(user.id, LABEL_BUCKET);
    const cost = creditCost("label_artwork");
    const balance = await getCreditBalance(user.id);
    const charge = decideCharge({
    freeLaunch: freeLaunchMode(),
      freeRemaining: Math.max(0, FREE_LABEL_TRIAL - used),
      loggedIn: true, // ผ่าน gate ล็อกอินมาแล้ว
      balance,
      cost,
    });
    if (charge.mode === "denied") {
      return NextResponse.json(
        {
          quotaExceeded: true,
          error: `ใช้สิทธิ์สร้างพื้นหลังฟรีครบ ${FREE_LABEL_TRIAL} ครั้งแล้ว\n${chargeDeniedMessage(charge)}`,
          credits: charge.balance,
          creditCost: charge.cost,
        },
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
    // จูนรอบพิมพ์ (ส.ค. 2569): เดิมลายชอบเด่นกลาง-ขวาทับข้อความ → บังคับ 3 อย่าง:
    // (1) ลายอยู่เฉพาะแถบชนขอบและ "ไหลตกขอบภาพ" (ฉลากถูก crop แบบ cover + เจียน 3 มม. — ลายต้องชนริมจริง)
    // (2) กลางภาพเป็นพื้นเรียบสีเดียว ห้ามมีวัตถุ/ลายใดๆ (พื้นที่วางโลโก้+ชื่อแบรนด์)
    // (3) สมมาตรซ้าย-ขวา/บน-ล่าง กันน้ำหนักลายเทไปข้างเดียว
    const style = EL_STYLE_EN[brandElement];
    const prompt =
      `symmetrical ornamental BORDER frame for a premium product label, ` +
      `all decoration confined to a band hugging the four outer edges, the pattern touches and bleeds off every edge of the image, ` +
      (motif ? `border elements inspired by: ${motif}, ` : "") +
      `${style}, elegant Thai aesthetic, refined, perfectly balanced left-right and top-bottom, ` +
      `the entire middle of the image is one flat plain empty cream-colored area with no pattern, no objects, no decoration (reserved for a logo), ` +
      `absolutely no text, no letters, no words, no symbols, no calligraphy, no characters, ` +
      `clean high-quality vector pattern`;

    const image = await falLabelArtwork(prompt, orientation);
    const storedUrl = await storeLogoImage(user.id, image.url, image.contentType);
    const imageUrl = storedUrl ?? image.url;

    // เก็บ metadata การสร้าง (fire-and-forget) — ให้วิเคราะห์ย้อนหลังได้โดยไม่ต้องใช้ AI อ่านภาพ
    void logImageGeneration({
      authUid: user.id,
      kind: "label_artwork",
      imageUrl,
      stored: storedUrl !== null,
      prompt,
      brandElement,
      motif: motif || undefined,
      motifElement: motifEl,
      orientation,
      composition,
    });

    // หักหลังสำเร็จเท่านั้น — เส้นฟรี bump โควตา · เส้นเครดิต spend_credits
    let nowUsed = used;
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(user.id, charge.cost, "label_artwork", LABEL_BUCKET);
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[label/artwork] หักเครดิตไม่สำเร็จหลังสร้างภาพแล้ว (race/พัง)", spent.reason);
    } else {
      const bumped = await bumpDbUsage(user.id, LABEL_BUCKET);
      nowUsed = bumped ?? used + 1;
    }

    return NextResponse.json({
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
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
