// /api/logo/brief — ให้ AI ตีความชื่อแบรนด์เป็น brief ภาพ (9 ก.ย. 2569)
// ล็อกอินเท่านั้น (กัน anon ยิง Haiku รัว — ต้นทุน ~฿0.03/ครั้ง) · ผลเติมลงช่อง "ความต้องการเพิ่มเติม"
// ให้ผู้ใช้แก้ได้ก่อนสร้าง — โปร่งใสว่า AI เดาอะไร

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { logoBrief, briefToExtra } from "@/lib/logo/brief";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { brandName?: string };
    const brandName = (body.brandName ?? "").trim();
    if (!brandName) return NextResponse.json({ error: "กรุณาใส่ชื่อแบรนด์ก่อนค่ะ" }, { status: 400 });
    if (brandName.length > 60) return NextResponse.json({ error: "ชื่อแบรนด์ยาวเกินไป" }, { status: 400 });

    const supabase = await createSupabaseServer();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อนใช้ตัวช่วยตีความชื่อค่ะ", needsLogin: true }, { status: 401 });

    const brief = await logoBrief(brandName, user.id);
    if (!brief) return NextResponse.json({ error: "ตีความชื่อไม่สำเร็จ ลองพิมพ์อธิบายเองได้เลยค่ะ" }, { status: 503 });
    return NextResponse.json({ ok: true, brief, extra: briefToExtra(brief) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
