// /api/label/vision — จำแนกลวดลาย/รูปทรงจากภาพนำเข้า (AI vision) → engine คำนวณธาตุ
//
// ท่อตามที่ตกลงกับผู้ใช้ (30 ก.ค. 2569 · CLAUDE.md §15 ข้อ 3.5):
//   client ย่อ ≤768px ผ่าน canvas (ล้าง EXIF) → server ตรวจ magic bytes → sha256 →
//   เช็คแคชผล → vision (Claude เท่านั้น — ห้าม Gemini free tier) → validate enum →
//   engine คำนวณ → เก็บ "ผล+hash" ไม่เก็บภาพ → หักเครดิตหลังสำเร็จเท่านั้น
// 🔴 ภาพมีใบหน้าคนจริง = ปฏิเสธ ไม่คิดเงิน (PDPA — การอ่านใบหน้าเป็น Logic 5/6 แยกต่างหาก)

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage } from "@/lib/chat/usage-db";
import { decideCharge, creditCost, chargeDeniedMessage } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { generate, extractJson } from "@/lib/ai";
import { decodeImageBase64, sniffImageType } from "@/lib/vision/image";
import {
  buildVisionSystemPrompt,
  validateVisionResult,
  visionComposition,
  VISION_CAVEAT,
} from "@/lib/vision/classify";
import { getCachedVision, storeVisionResult } from "@/lib/vision/cache";
import type { Element5 } from "@/lib/engine/element";

export const runtime = "nodejs";
export const maxDuration = 60;

const FREE_VISION_TRIAL = 3;
const VISION_BUCKET = "vision";
const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];

interface Body {
  /** data URL หรือ base64 ล้วน (JPEG/PNG/WebP ที่ย่อแล้ว) */
  imageBase64?: string;
  brandElement?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    // ---- gate: ต้องล็อกอิน (เครดิต + จำกัดการใช้) ----
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return NextResponse.json({ needsLogin: true, error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

    // ---- ตรวจภาพจริง (magic bytes ไม่ใช่ MIME ที่ client อ้าง) ----
    const decoded = decodeImageBase64(body.imageBase64 ?? "");
    if (!decoded) return NextResponse.json({ error: "ไฟล์ภาพไม่ถูกต้องหรือใหญ่เกิน 2MB" }, { status: 400 });
    const kind = sniffImageType(decoded.buf);
    if (!kind) return NextResponse.json({ error: "รองรับเฉพาะ JPEG/PNG/WebP" }, { status: 400 });

    const brandElement = (ELEMENTS.includes(String(body.brandElement)) ? String(body.brandElement) : "Earth") as Element5;

    // ---- โควตาฟรี → เครดิต (vision_motif = 1 เครดิต) ----
    const used = await getDbUsage(user.id, VISION_BUCKET);
    const cost = creditCost("vision_motif");
    const balance = await getCreditBalance(user.id);
    const charge = decideCharge({
      freeRemaining: Math.max(0, FREE_VISION_TRIAL - used),
      loggedIn: true,
      balance,
      cost,
    });
    if (charge.mode === "denied") {
      return NextResponse.json(
        {
          quotaExceeded: true,
          error: `ใช้สิทธิ์อ่านภาพฟรีครบ ${FREE_VISION_TRIAL} ครั้งแล้ว\n${chargeDeniedMessage(charge)}`,
          credits: charge.balance,
          creditCost: charge.cost,
        },
        { status: 429 }
      );
    }

    // ---- แคชตาม hash ของภาพ (ไม่เก็บตัวภาพ) ----
    const imageHash = createHash("sha256").update(decoded.buf).digest("hex");
    let cls = await getCachedVision(imageHash);
    const cached = cls !== null;

    if (!cls) {
      const ai = await generate({
        role: "vision",
        system: buildVisionSystemPrompt(),
        input: "จำแนกลวดลาย/รูปทรงในภาพนี้ตามกฎใน system prompt แล้วตอบ JSON เท่านั้น",
        imageBase64: decoded.base64,
        imageMediaType: kind,
        maxTokens: 400,
        logicId: 19,
        channel: "web",
        userId: user.id,
        cacheHit: false,
      });
      const parsed = extractJson<unknown>(ai.text);
      const v = validateVisionResult(parsed);
      if (!v.ok && v.reason === "face") {
        // ปฏิเสธ ไม่คิดเงิน — และไม่แคช (ภาพบุคคลไม่ควรทิ้งร่องรอยใดๆ ในระบบ)
        return NextResponse.json({
          declined: true,
          message: "ภาพนี้มีใบหน้าบุคคลจริง ระบบไม่วิเคราะห์ภาพบุคคลในฟีเจอร์นี้ค่ะ (ไม่หักสิทธิ์/เครดิต)",
        });
      }
      if (!v.ok) {
        return NextResponse.json({ error: "อ่านผลจำแนกไม่ได้ กรุณาลองใหม่ (ไม่หักสิทธิ์/เครดิต)" }, { status: 502 });
      }
      cls = v.result;
      void storeVisionResult(imageHash, cls, ai.model);
    }

    const composition = visionComposition(cls, brandElement);

    // ---- หักหลังสำเร็จเท่านั้น (แคช hit ก็คิดตามเรท — เรทตั้งจากต้นทุนแคชอยู่แล้ว §12) ----
    let nowUsed = used;
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(user.id, charge.cost, "vision_motif", cached ? "cache" : "ai");
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[label/vision] หักเครดิตไม่สำเร็จหลังวิเคราะห์แล้ว", spent.reason);
    } else {
      const bumped = await bumpDbUsage(user.id, VISION_BUCKET);
      nowUsed = bumped ?? used + 1;
    }

    return NextResponse.json({
      classification: cls,
      composition, // null = ไม่พบลวดลาย/รูปทรงที่รู้จักในภาพ
      brandElement,
      cached,
      caveat: VISION_CAVEAT,
      used: nowUsed,
      remaining: Math.max(0, FREE_VISION_TRIAL - nowUsed),
      limit: FREE_VISION_TRIAL,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
    });
  } catch (err) {
    console.error("[label/vision] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** GET = สถานะ (ไม่เสียเงิน) */
export function GET() {
  return NextResponse.json({
    ok: true,
    free_trial: FREE_VISION_TRIAL,
    credit_cost: creditCost("vision_motif"),
  });
}
