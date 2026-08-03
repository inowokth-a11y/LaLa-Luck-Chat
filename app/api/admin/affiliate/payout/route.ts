// /api/admin/affiliate/payout — บันทึกการจ่ายคอมมิชชันจริงให้พันธมิตร (🔒 gate ADMIN_EMAILS)
//
// POST { linkId, amountThb, note? } → insert affiliate_payouts_e (ledger การจ่าย — ไม่แก้ไม่ลบ)
// ยอด "ค้างจ่าย" ไม่เก็บที่ไหน — แดชบอร์ดคำนวณสดจาก รายรับ × % − ยอดจ่ายสะสม (แหล่งความจริงเดียว)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";

export const runtime = "nodejs";

/** เพดานต่อครั้ง — กันพิมพ์ยอดผิดหลักแบบเดียวกับเพดานเติมเครดิตมือใน /api/admin/credits */
const MAX_PAYOUT_THB = 100_000;

export async function POST(req: Request) {
  let admin: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? null;
    admin = isAdminEmail(email, getAdminEmails()) ? email : null;
  } catch {
    admin = null;
  }
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const linkId = String(body?.linkId ?? "");
  const amountThb = Number(body?.amountThb);
  const note = String(body?.note ?? "").trim().slice(0, 200) || null;

  if (!/^[0-9a-f-]{36}$/i.test(linkId)) {
    return NextResponse.json({ error: "ต้องระบุ linkId (uuid)" }, { status: 400 });
  }
  if (!Number.isFinite(amountThb) || amountThb <= 0 || amountThb > MAX_PAYOUT_THB) {
    return NextResponse.json({ error: `ยอดจ่ายต้องเป็นตัวเลข 0.01-${MAX_PAYOUT_THB.toLocaleString()} บาท` }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("affiliate_payouts_e")
    .insert({ link_id: linkId, amount_thb: Math.round(amountThb * 100) / 100, note, created_by: admin })
    .select("id,link_id,amount_thb,created_at")
    .single();
  if (error) {
    // FK ผิด = ลิงก์ไม่มีจริง
    if (error.code === "23503") return NextResponse.json({ error: "ไม่พบลิงก์" }, { status: 404 });
    console.error("[admin/affiliate/payout] บันทึกไม่สำเร็จ", error.message);
    return NextResponse.json({ error: "บันทึกการจ่ายไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, payout: data });
}
