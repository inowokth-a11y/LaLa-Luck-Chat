// /api/share/claim — รางวัลกดแชร์การ์ด +2 คำถามฟรี (ครั้งเดียวต่อบัญชี — เฟส 2)
//
// POST → เคลม (atomic ผ่าน RPC claim_share_reward: PK ชนกัน = เคยรับแล้ว แม้ยิงพร้อมกัน)
// GET  → เช็คว่ารับไปหรือยัง (UI ใช้ตัดสินว่าจะโชว์ "รับ +2" หรือ "แชร์อีกก็ได้")
//
// ⚠️ ให้รางวัลตอน "กดแชร์" — ตรวจการแชร์จริงไม่ได้ (ทุกแพลตฟอร์มเลิกส่ง callback)
//    ความเสี่ยงถูกจำกัดเชิงโครงสร้างที่ ~฿0.70/บัญชี (ผู้ใช้ยอมรับแล้ว 1 ส.ค. 2569)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { SHARE_REWARD_QUESTIONS } from "@/lib/share";

export const runtime = "nodejs";

async function sessionUser(): Promise<{ uid: string; isGuest: boolean } | null> {
  try {
    const supabase = await createSupabaseServer();
    const u = (await supabase.auth.getUser()).data.user;
    return u ? { uid: u.id, isGuest: Boolean(u.is_anonymous) } : null;
  } catch {
    return null;
  }
}

export async function POST() {
  const sess = await sessionUser();
  if (!sess) {
    return NextResponse.json({ needsLogin: true, error: "เข้าสู่ระบบก่อนรับรางวัลแชร์ค่ะ" }, { status: 401 });
  }
  // รางวัลแชร์ = สิทธิ์ของบัญชีถาวร (แชร์ได้ทุกคน แต่ของรางวัลต้องผูกบัญชี — กติกา 1 ส.ค. 2569)
  if (sess.isGuest) {
    return NextResponse.json(
      { needsLogin: true, needsUpgrade: true, error: "ผูกบัญชี (ฟรี) เพื่อรับคำถามฟรี +2 จากการแชร์ค่ะ 🐾 — auth_uid เดิมของคุณคงอยู่ ข้อมูลไม่หาย" },
      { status: 401 }
    );
  }
  const uid = sess.uid;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("claim_share_reward", { p_auth_uid: uid });
    if (error || typeof data !== "number") {
      console.error("[share] claim ล้มเหลว", error?.message);
      return NextResponse.json({ error: "รับรางวัลไม่สำเร็จ ลองใหม่อีกครั้งค่ะ" }, { status: 500 });
    }
    if (data === -1) {
      return NextResponse.json({ alreadyClaimed: true, message: "รับรางวัลแชร์ไปแล้วค่ะ — ขอบคุณที่ช่วยบอกต่อ 🐾" });
    }
    return NextResponse.json({
      rewarded: SHARE_REWARD_QUESTIONS,
      bonus: data,
      message: `ขอบคุณที่แชร์ค่ะ 🐾 รับคำถามฟรีเพิ่ม ${SHARE_REWARD_QUESTIONS} ข้อแล้ว!`,
    });
  } catch (e) {
    console.error("[share] claim error", e);
    return NextResponse.json({ error: "รับรางวัลไม่สำเร็จ" }, { status: 500 });
  }
}

export async function GET() {
  const sess = await sessionUser();
  if (!sess) return NextResponse.json({ loggedIn: false, claimed: false });
  const uid = sess.uid;
  if (sess.isGuest) {
    // ผู้เยี่ยมชม — แชร์ได้ แต่รางวัลต้องผูกบัญชี (UI ใช้ธงนี้โชว์ปุ่มผูกบัญชี)
    return NextResponse.json({ loggedIn: true, claimed: false, needsUpgrade: true, reward: SHARE_REWARD_QUESTIONS });
  }
  try {
    const svc = createServiceClient();
    const { data } = await svc.from("share_claims_e").select("auth_uid").eq("auth_uid", uid).maybeSingle();
    return NextResponse.json({ loggedIn: true, claimed: Boolean(data), reward: SHARE_REWARD_QUESTIONS });
  } catch {
    return NextResponse.json({ loggedIn: true, claimed: false, reward: SHARE_REWARD_QUESTIONS });
  }
}
