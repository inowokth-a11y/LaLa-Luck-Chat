// /api/admin/affiliate — สร้าง/ปิดลิงก์แอฟฟิลิเอต (🔒 gate ADMIN_EMAILS แพทเทิร์นเดียวกับ /api/admin/credits)
//
// POST  { partnerName, code?, note? } → สร้างลิงก์ (ไม่ส่ง code = สุ่มให้)
// PATCH { id, active }               → เปิด/ปิดลิงก์ (ปิดแล้วหยุดนับ visit + หยุดผูกผู้ใช้ใหม่ทันที
//                                      แต่ผู้ใช้ที่ผูกไว้แล้วยังนับรายรับต่อ — ข้อตกลงกับพันธมิตรเดิมไม่หาย)
// PATCH { id, commissionPct }        → ตั้ง % คอมมิชชันรายลิงก์ (0-100 — ผู้ใช้ตัดสิน 3 ส.ค. 2569: เริ่ม 15 ปรับได้)
// (รายการ+สถิติอ่านใน Server Component หน้า /admin โดยตรง — ไม่มี GET ที่นี่)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { normalizeCodeInput, randomCode } from "@/lib/affiliate/code";

export const runtime = "nodejs";

const MAX_NAME_LEN = 80;
const MAX_NOTE_LEN = 200;

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

export async function POST(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const partnerName = String(body?.partnerName ?? "").trim().slice(0, MAX_NAME_LEN);
  const note = String(body?.note ?? "").trim().slice(0, MAX_NOTE_LEN) || null;
  const rawCode = String(body?.code ?? "").trim();

  if (!partnerName) return NextResponse.json({ error: "ต้องระบุชื่อผู้รับลิงก์" }, { status: 400 });

  let code: string;
  if (rawCode) {
    const norm = normalizeCodeInput(rawCode);
    if (!norm) {
      return NextResponse.json(
        { error: "รหัสลิงก์ใช้ได้เฉพาะ a-z, 0-9, ขีดกลาง (3-32 ตัว) — เว้นว่างให้ระบบสุ่มได้" },
        { status: 400 }
      );
    }
    code = norm;
  } else {
    code = randomCode();
  }

  const svc = createServiceClient();
  // สุ่มชนกันได้ (โอกาสน้อยมาก ~31^8) — ลองใหม่ 3 ครั้งเฉพาะกรณีสุ่ม · code ที่ตั้งเองชน = บอกตรงๆ
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await svc
      .from("affiliate_links_e")
      .insert({ code, partner_name: partnerName, note, created_by: admin })
      .select("id,code,partner_name,note,active,visit_count,created_at")
      .single();
    if (!error) return NextResponse.json({ ok: true, link: data });
    if (error.code === "23505") {
      if (rawCode) return NextResponse.json({ error: `รหัส "${code}" ถูกใช้แล้ว — เลือกรหัสอื่น` }, { status: 409 });
      code = randomCode();
      continue;
    }
    console.error("[admin/affiliate] สร้างลิงก์ไม่สำเร็จ", error.message);
    return NextResponse.json({ error: "สร้างลิงก์ไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ error: "สุ่มรหัสชนซ้ำผิดปกติ — ลองใหม่อีกครั้ง" }, { status: 500 });
}

export async function PATCH(req: Request) {
  const admin = await adminEmail();
  if (!admin) return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  const active = body?.active;
  const commissionPct = body?.commissionPct;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "ต้องระบุ id (uuid)" }, { status: 400 });
  }

  const patch: { active?: boolean; commission_pct?: number } = {};
  if (typeof active === "boolean") patch.active = active;
  if (commissionPct !== undefined) {
    const pct = Number(commissionPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: "คอมมิชชันต้องเป็นตัวเลข 0-100 (%)" }, { status: 400 });
    }
    patch.commission_pct = Math.round(pct * 100) / 100; // เก็บละเอียดสุดทศนิยม 2 ตำแหน่งตาม schema
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "ต้องส่ง active หรือ commissionPct อย่างน้อยหนึ่งอย่าง" }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("affiliate_links_e")
    .update(patch)
    .eq("id", id)
    .select("id,active,commission_pct")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "อัปเดตไม่สำเร็จ" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบลิงก์" }, { status: 404 });
  return NextResponse.json({ ok: true, link: data });
}
