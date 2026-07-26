// /api/admin/feedback-prompts — แอดมินตั้ง/ดู/เปิด-ปิด คำถามความเห็นที่จะถามผู้ใช้
// 🔒 gate เฉพาะแอดมิน (ADMIN_EMAILS)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { validatePromptQuestion } from "@/lib/feedback/validate";

export const runtime = "nodejs";

async function requireAdmin(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return isAdminEmail(data.user?.email ?? null, getAdminEmails());
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  const svc = createServiceClient();
  const { data, error } = await svc.from("feedback_prompts").select("id,question,active,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompts: data });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
  const body = await req.json();

  const svc = createServiceClient();

  // สลับเปิด/ปิด: { id, active }
  if (body?.id !== undefined && typeof body?.active === "boolean") {
    const { error } = await svc.from("feedback_prompts").update({ active: body.active }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // เพิ่มคำถามใหม่: { question }
  const v = validatePromptQuestion(body?.question);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { data, error } = await svc.from("feedback_prompts").insert({ question: v.question }).select("id,question,active,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prompt: data });
}
