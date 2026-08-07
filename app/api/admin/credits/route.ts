// /api/admin/credits — แอดมินเติมเครดิตให้ผู้ใช้ (ช่องทางเดียวที่มีตอนนี้ — ปุ่มเติมเงิน Omise ยังไม่ทำ §12)
// 🔒 gate เฉพาะแอดมิน (ADMIN_EMAILS) — แพทเทิร์นเดียวกับ /api/admin/feedback-prompts
//
// POST { email, amount }  → เติมเครดิต (ledger บันทึกอีเมลแอดมินผู้เติมไว้ตรวจย้อนหลัง)
// GET  ?email=            → ดูยอด + ledger ล่าสุดของผู้ใช้คนนั้น

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { grantCredits, getCreditBalance } from "@/lib/credits/wallet";

export const runtime = "nodejs";

const MAX_GRANT_PER_CALL = 5000; // ×10 ตามหน่วยเครดิตใหม่ (7 ส.ค. 2569) · กันพิมพ์เลขผิด (เช่นเผลอวางเบอร์โทร) — เติมก้อนใหญ่ให้แบ่งหลายครั้ง

async function adminEmail(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? null;
    return isAdminEmail(email, getAdminEmails()) ? email : null;
  } catch {
    return null;
  }
}

/** หา auth_uid จากอีเมลใน user_identities (case-insensitive) — null = ไม่พบ */
async function findAuthUidByEmail(email: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("user_identities")
    .select("auth_uid")
    .ilike("email", email)
    .maybeSingle();
  if (error) {
    console.warn("[admin/credits] ค้นหาผู้ใช้ไม่สำเร็จ", error.message);
    return null;
  }
  return data?.auth_uid ?? null;
}

export async function POST(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim();
  const amount = Number(body?.amount);

  if (!email) return NextResponse.json({ error: "ต้องระบุ email ของผู้ใช้" }, { status: 400 });
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_GRANT_PER_CALL) {
    return NextResponse.json(
      { error: `amount ต้องเป็นจำนวนเต็ม 1-${MAX_GRANT_PER_CALL}` },
      { status: 400 }
    );
  }

  const authUid = await findAuthUidByEmail(email);
  if (!authUid) {
    return NextResponse.json(
      { error: `ไม่พบผู้ใช้อีเมล "${email}" — ผู้ใช้ต้องเคยล็อกอินเว็บก่อน (บาง provider เช่น LINE อาจไม่มีอีเมล)` },
      { status: 404 }
    );
  }

  const balance = await grantCredits(authUid, amount, "grant:admin", admin);
  if (balance === null) return NextResponse.json({ error: "เติมเครดิตไม่สำเร็จ" }, { status: 500 });
  return NextResponse.json({ ok: true, email, granted: amount, balance });
}

export async function GET(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const email = new URL(req.url).searchParams.get("email")?.trim() ?? "";
  if (!email) return NextResponse.json({ error: "ต้องระบุ ?email=" }, { status: 400 });

  const authUid = await findAuthUidByEmail(email);
  if (!authUid) return NextResponse.json({ error: `ไม่พบผู้ใช้อีเมล "${email}"` }, { status: 404 });

  const svc = createServiceClient();
  const [balance, ledger] = await Promise.all([
    getCreditBalance(authUid),
    svc
      .from("credit_ledger_e")
      .select("delta,action,ref,balance_after,created_at")
      .eq("auth_uid", authUid)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return NextResponse.json({ email, balance, ledger: ledger.data ?? [] });
}
