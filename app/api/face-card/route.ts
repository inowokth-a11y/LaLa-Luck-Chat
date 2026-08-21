// face-card เฟส 1 — API อัปโหลดรูปหน้า → ตรวจหน้า → เจนภาพ "คุณในบทบาทการ์ด" (flux-pulid)
//
// การตัดสินใจผู้ใช้ (คิว §15): ฟรี 1 ครั้ง/บัญชีถาวร · เจนซ้ำ 40 เครดิต · เก็บผลงานถาวร
//
// 🔴 ชีวมิติ (PDPA ม.26): ต้องติ๊ก consent ชัดแจ้งทุกครั้ง (FACE_CONSENT_VERSION บันทึกลงแถว)
//    รูปถ่ายต้นฉบับ**ไม่ถูกจัดเก็บ** — อยู่ในหน่วยความจำระหว่าง request แล้วทิ้ง:
//    ส่งเป็น data URI ตรงเข้า fal (ไม่อัปโหลดพักที่ไหน) + ส่งเข้า Claude ตรวจหน้า (Claude เท่านั้น
//    — vision role มี guard เชิงโครงสร้างห้าม Gemini/OpenAI เห็นภาพ ดู lib/ai/)
// ลำดับ: consent → ตรวจไฟล์ → ล็อกอิน+บัญชีถาวร → สิทธิ์/เครดิต → ตรวจหน้า → เจน → เก็บ → หักหลังสำเร็จ

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { decodeImageBase64, sniffImageType, MAX_IMAGE_BYTES } from "@/lib/vision/image";
import { faceCardPrompt } from "@/lib/face-card/prompt";
import { FACE_CONSENT_VERSION } from "@/lib/face-card/consent";
import {
  ensureFaceCardBucket,
  storeFaceCardImage,
  faceCardSignedUrl,
  newShareToken,
} from "@/lib/face-card/store";
import { isValidCardId } from "@/lib/share";
import { isFalAvailable, falFaceCard } from "@/lib/image/fal";
import { generate, extractJson } from "@/lib/ai";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { logImageGeneration } from "@/lib/image/generation-log";

export const runtime = "nodejs";
export const maxDuration = 120;

interface GenRow {
  id: string;
  card_id: string;
  image_path: string;
  share_token: string;
  created_at: string;
}

async function requirePermanentUser() {
  const supabase = await createSupabaseServer();
  const u = (await supabase.auth.getUser()).data.user;
  if (!u) return { error: NextResponse.json({ needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนค่ะ" }, { status: 401 }) };
  if (u.is_anonymous) {
    return {
      error: NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "ภาพประจำการ์ดเปิดให้บัญชีถาวรค่ะ 🐾 ผูกบัญชี (ฟรี) แล้วรับสิทธิ์ฟรี 1 ครั้ง — ข้อมูลเดิมไม่หาย" },
        { status: 401 }
      ),
    };
  }
  return { userId: u.id };
}

/** ผลงานล่าสุดของผู้ใช้ + จำนวนที่เคยเจน (ตัดสินสิทธิ์ฟรี 1 ครั้ง/บัญชี) */
async function latestGen(userId: string): Promise<{ row: GenRow | null; count: number }> {
  const svc = createServiceClient();
  const { data, count } = await svc
    .from("face_card_gen_e")
    .select("id, card_id, image_path, share_token, created_at", { count: "exact" })
    .eq("auth_uid", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  return { row: (data?.[0] as GenRow) ?? null, count: count ?? 0 };
}

export async function GET() {
  try {
    const gate = await requirePermanentUser();
    if ("error" in gate) return gate.error;
    const { row, count } = await latestGen(gate.userId!);
    if (!row) return NextResponse.json({ has: false, freeUsed: count > 0, cost: creditCost("face_card") });
    const imageUrl = await faceCardSignedUrl(row.image_path);
    return NextResponse.json({
      has: true,
      freeUsed: true,
      cost: creditCost("face_card"),
      cardId: row.card_id,
      imageUrl,
      shareUrl: `/s/${row.share_token}`,
      storyUrl: `/s/${row.share_token}/story`,
    });
  } catch (err) {
    console.error("[face-card] GET error", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** ตรวจว่าเป็นภาพใบหน้าบุคคลเดี่ยวที่ชัดพอ — Claude เท่านั้น (role vision) · ตอบ JSON */
async function checkFace(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp", userId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const ai = await generate({
      role: "vision",
      // ⚠️ อย่าใช้คำว่า "คนจริง" — โมเดลตีความตรงตัวแล้วตอบ false กับภาพถ่ายที่ดูเป็น
      //    ภาพวาด/ภาพ AI (เจอจริงตอน E2E) · เจตนาคือ "มีใบหน้ามนุษย์ให้ใช้อ้างอิงได้"
      system:
        "คุณคือตัวตรวจคุณภาพรูปสำหรับสร้างภาพเหมือน ตอบ JSON เท่านั้น: " +
        '{"face": true/false, "single": true/false, "clear": true/false} — ' +
        "face=ภาพนี้เห็นใบหน้ามนุษย์ (ภาพถ่ายหรือภาพเหมือน) · single=มีคนเดียว · " +
        "clear=เห็นหน้าชัด (ไม่มืดเกิน/ไม่เบลอหนัก/ไม่ใส่หน้ากากบังหน้า)",
      input: "ตรวจรูปนี้ตามกฎใน system prompt แล้วตอบ JSON เท่านั้น",
      imageBase64: base64,
      imageMediaType: mediaType,
      maxTokens: 120,
      logicId: 1,
      channel: "web",
      userId,
    });
    const v = extractJson<{ face?: boolean; single?: boolean; clear?: boolean }>(ai.text);
    if (!v || v.face !== true) return { ok: false, reason: "ไม่พบใบหน้าบุคคลในรูปค่ะ — กรุณาใช้รูปถ่ายหน้าตรงที่เห็นหน้าชัด" };
    if (v.single === false) return { ok: false, reason: "ในรูปมีหลายคนค่ะ — กรุณาใช้รูปที่มีคุณคนเดียว" };
    if (v.clear === false) return { ok: false, reason: "ใบหน้าในรูปไม่ชัดพอค่ะ — ลองรูปที่สว่างและคมชัดกว่านี้" };
    return { ok: true };
  } catch (e) {
    // ตรวจไม่ได้เพราะ infra (ไม่ใช่เพราะรูปไม่ผ่าน) — ปล่อยผ่านไปให้ PuLID ลอง (มันต้องเจอหน้าอยู่ดี)
    console.warn("[face-card] ตรวจหน้าไม่สำเร็จ (infra) — ข้ามการตรวจ", e);
    return { ok: true };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { imageBase64?: string; cardId?: string; consent?: boolean };

    // consent ชีวมิติต้องติ๊กชัดแจ้งทุกครั้ง — ไม่ติ๊ก = ไม่แตะรูปเลย
    if (body.consent !== true) {
      return NextResponse.json({ error: "กรุณายอมรับความยินยอมการใช้รูปใบหน้า (ข้อมูลชีวมิติ) ก่อนค่ะ" }, { status: 400 });
    }
    const cardId = String(body.cardId ?? "");
    if (!isValidCardId(cardId)) {
      return NextResponse.json({ error: "ต้องเปิดการ์ดของคุณก่อนถึงจะสร้างภาพประจำการ์ดได้ค่ะ" }, { status: 400 });
    }
    const decoded = decodeImageBase64(body.imageBase64 ?? "");
    if (!decoded || decoded.buf.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "ไฟล์รูปไม่ถูกต้องหรือใหญ่เกินไปค่ะ (สูงสุด 2MB)" }, { status: 400 });
    }
    const kind = sniffImageType(decoded.buf);
    if (!kind) return NextResponse.json({ error: "รองรับเฉพาะรูป JPG / PNG / WebP ค่ะ" }, { status: 400 });

    const gate = await requirePermanentUser();
    if ("error" in gate) return gate.error;
    const userId = gate.userId!;

    if (!isFalAvailable()) return NextResponse.json({ error: "ระบบสร้างภาพยังไม่พร้อมใช้งานค่ะ" }, { status: 503 });

    // ---- สิทธิ์: ฟรี 1 ครั้ง/บัญชีถาวร (นับจากแถวจริง — ถาวร ไม่รีเซ็ต) → 40 เครดิต ----
    const { count } = await latestGen(userId);
    const cost = creditCost("face_card");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({
      freeRemaining: count === 0 ? 1 : 0,
      loggedIn: true,
      balance,
      cost,
      freeLaunch: freeLaunchMode(),
    });
    if (charge.mode === "denied") {
      return NextResponse.json(
        { quotaExceeded: true, message: `สิทธิ์ฟรี 1 ครั้งของภาพประจำการ์ดใช้ไปแล้วค่ะ\n${chargeDeniedMessage(charge)}`, credits: charge.balance, creditCost: charge.cost },
        { status: 429 }
      );
    }

    // ---- ตรวจหน้า (Claude vision — ไม่แคช ไม่เก็บ hash ภาพบุคคล ตามหลัก label/vision) ----
    const face = await checkFace(decoded.base64, kind, userId);
    if (!face.ok) return NextResponse.json({ declined: true, error: face.reason }, { status: 400 });

    // ---- เจนภาพ (รูปหน้าเป็น data URI ชั่วขณะ — ไม่ผ่าน storage ใดๆ ของเรา) ----
    const dataUri = `data:${kind};base64,${decoded.base64}`;
    const img = await falFaceCard(faceCardPrompt(cardId), dataUri);

    // ---- เก็บผลงานถาวร (bucket private) + บันทึกแถว ----
    await ensureFaceCardBucket();
    const genId = randomUUID();
    const imagePath = await storeFaceCardImage(userId, genId, img.url);
    const shareToken = newShareToken();
    const svc = createServiceClient();
    const { error: insErr } = await svc.from("face_card_gen_e").insert({
      id: genId,
      auth_uid: userId,
      card_id: cardId,
      image_path: imagePath,
      share_token: shareToken,
      consent_version: FACE_CONSENT_VERSION,
    });
    if (insErr) throw new Error(`บันทึกผลงานไม่สำเร็จ: ${insErr.message}`);

    // หักหลังสำเร็จเท่านั้น
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "face_card", `card:${cardId}`);
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[face-card] หักเครดิตไม่สำเร็จหลังเจนแล้ว", spent.reason);
    }
    // log metadata (ไม่มีข้อมูลชีวมิติ — prompt เป็นข้อความสไตล์+ฉากการ์ดล้วน)
    void logImageGeneration({
      authUid: userId,
      kind: "face_card",
      imageUrl: imagePath,
      stored: true,
      prompt: `card:${cardId} sha256:${createHash("sha256").update(decoded.buf).digest("hex").slice(0, 16)}`,
    });

    const imageUrl = await faceCardSignedUrl(imagePath);
    return NextResponse.json({
      imageUrl,
      shareUrl: `/s/${shareToken}`,
      storyUrl: `/s/${shareToken}/story`,
      cardId,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : { free: true }),
    });
  } catch (err) {
    console.error("[face-card] POST error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
