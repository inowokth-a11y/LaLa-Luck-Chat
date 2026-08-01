// /api/admin/me — บอกว่า session ปัจจุบันเป็นแอดมินไหม (ให้แถบสถานะโชว์ปุ่มเข้า /admin)
// คืน 200 {admin:boolean} เสมอ — ไม่ใช่ gate ของจริง (หน้า/route แอดมินทุกตัว gate เองอยู่แล้ว)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return NextResponse.json({ admin: isAdminEmail(data.user?.email, getAdminEmails()) });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
