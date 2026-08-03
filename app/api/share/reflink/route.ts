// /api/share/reflink — บอกว่า "ผู้ใช้คนนี้ควรพก ref อะไรตอนแชร์การ์ด" (เลเยอร์การแชร์ 3 ส.ค. 2569)
//
// GET → { code: string | null }
// - ผู้ใช้ที่ถูกผูกกับลิงก์พันธมิตร (attribution) และลิงก์ยัง active → ได้ code ไปแปะใน URL แชร์
//   → คนที่กดต่อแล้วสมัครถูกผูกกลับลิงก์เดิม (via 'share') → แชร์เป็นทอดๆ ก็ยังตามถึงพันธมิตรต้นทาง
// - ไม่ล็อกอิน/ไม่ถูกผูก/ลิงก์ปิดแล้ว → null (แชร์แบบไม่มี ref — พฤติกรรมเดิม)
//
// 🔒 อ่านผ่าน service role หลังตรวจ session — ตาราง attribution/links ไม่มี RLS policy ฝั่ง client

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return NextResponse.json({ code: null });

    const svc = createServiceClient();
    const { data: attr } = await svc
      .from("affiliate_attributions_e")
      .select("link_id")
      .eq("auth_uid", uid)
      .maybeSingle();
    if (!attr) return NextResponse.json({ code: null });

    const { data: link } = await svc
      .from("affiliate_links_e")
      .select("code")
      .eq("id", attr.link_id)
      .eq("active", true) // ลิงก์ปิดแล้วหยุดกระจายต่อ — นโยบายเดียวกับหยุดรับคนใหม่
      .maybeSingle();
    return NextResponse.json({ code: link?.code ?? null });
  } catch {
    return NextResponse.json({ code: null }); // พังเงียบ — การแชร์ต้องไม่เสีย
  }
}
