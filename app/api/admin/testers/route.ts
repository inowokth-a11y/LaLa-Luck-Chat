// /api/admin/testers — จัดการกลุ่มผู้ทดลองใช้ (ใช้งานไม่หักเครดิต) 🔒 gate ADMIN_EMAILS
// (มติผู้ใช้ 31 ส.ค. 2569 — แพทเทิร์นเดียวกับ /api/admin/affiliate)
//
// GET              → รายชื่อทั้งหมด
// POST   { email, note? }   → เพิ่ม (มีอยู่แล้ว = เปิด active กลับ + อัปเดตโน้ต)
// PATCH  { email, active }  → เปิด/ปิดสิทธิ์
// DELETE { email }          → ลบถาวร

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { normalizeTesterEmail, clearTesterCache } from "@/lib/credits/tester";

export const runtime = "nodejs";

const MAX_NOTE_LEN = 120;
const MAX_ROWS = 200;

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

export async function GET() {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("tester_whitelist_e")
    .select("email, note, active, added_by, created_at")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ testers: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = normalizeTesterEmail(body?.email);
  if (!email) return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  const note = String(body?.note ?? "").trim().slice(0, MAX_NOTE_LEN) || null;

  const svc = createServiceClient();
  const { error } = await svc
    .from("tester_whitelist_e")
    .upsert({ email, note, active: true, added_by: admin }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearTesterCache();
  return NextResponse.json({ ok: true, email });
}

export async function PATCH(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = normalizeTesterEmail(body?.email);
  if (!email || typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "ต้องระบุ email และ active (true/false)" }, { status: 400 });
  }
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("tester_whitelist_e")
    .update({ active: body.active })
    .eq("email", email)
    .select("email")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบอีเมลนี้ในรายชื่อ" }, { status: 404 });
  clearTesterCache();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = normalizeTesterEmail(body?.email);
  if (!email) return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  const svc = createServiceClient();
  const { error } = await svc.from("tester_whitelist_e").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearTesterCache();
  return NextResponse.json({ ok: true });
}
