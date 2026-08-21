// /api/account/delete — ลบบัญชีถาวร (สิทธิ์ PDPA — 1 ส.ค. 2569)
//
// ลบ auth.users → ทุกตารางผูก on delete cascade อยู่แล้ว: โปรไฟล์ · ตัวตน · โควตา ·
// กระเป๋า/ledger เครดิต · ประวัติ+ความจำแม่หมอ · การเคลมรางวัล — หายทั้งหมดในทรานแซกชันเดียว
// (ผู้ใช้ตัดสิน: ไม่มีปุ่มลบความจำแยก — ความจำถูกลบพร้อมบัญชี)
//
// 🔴 irreversible — UI ต้องยืนยัน 2 ชั้นก่อนเรียก · ลบแล้ว client ต้อง signOut ทิ้ง session ค้าง

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { deleteFaceCardImages } from "@/lib/face-card/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseServer();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return NextResponse.json({ needsLogin: true, error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
    }

    // ไฟล์ face-card ใน Storage ไม่ได้ผูก FK — ต้องลบเองก่อน (คำมั่นใน consent ชีวมิติ:
    // ลบบัญชี = ภาพผลงานถูกลบทั้งหมด) · ลบไฟล์พังไม่บล็อกการลบบัญชี (log ไว้ตามรอย)
    await deleteFaceCardImages(user.id);

    const svc = createServiceClient();
    const { error } = await svc.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("[account/delete] ลบไม่สำเร็จ", error.message);
      return NextResponse.json({ error: "ลบบัญชีไม่สำเร็จ กรุณาลองใหม่หรือติดต่อเรา" }, { status: 500 });
    }
    console.log(`[account/delete] ลบบัญชี ${user.id.slice(0, 8)}… แล้ว (cascade ทุกตาราง)`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account/delete] error", e);
    return NextResponse.json({ error: "ลบบัญชีไม่สำเร็จ" }, { status: 500 });
  }
}
