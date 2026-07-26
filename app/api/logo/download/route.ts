// พร็อกซีดาวน์โหลดรูปโลโก้ — บังคับเซฟไฟล์จริง + ตั้งชื่อไฟล์
//
// ทำไมต้องมี: URL รูปจาก fal เป็นคนละโดเมน (v3b.fal.media) → attribute `download` บน <a>
//   ข้ามโดเมนถูกเบราว์เซอร์เมิน (จะแค่เปิดรูป ไม่เซฟ) · พร็อกซีผ่าน server ให้เป็น same-origin
//   + ใส่ Content-Disposition: attachment → เซฟได้ชัวร์ทุกเบราว์เซอร์
// 🔒 กัน SSRF/open-proxy: อนุญาตเฉพาะโฮสต์ *.fal.media เท่านั้น

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const sanitizeName = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "logo";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  const name = sanitizeName(u.searchParams.get("name") ?? "logo");

  if (!target) return NextResponse.json({ error: "ไม่มี url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "url ไม่ถูกต้อง" }, { status: 400 });
  }
  // อนุญาตเฉพาะ https + โฮสต์ของ fal หรือ Supabase Storage ของโปรเจกต์ (กันพร็อกซีดึงอย่างอื่น = SSRF)
  let supabaseHost = "";
  try {
    supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    /* ไม่มี env ก็เหลือแค่ fal */
  }
  const allowed = /(^|\.)fal\.media$/.test(parsed.hostname) || (supabaseHost !== "" && parsed.hostname === supabaseHost);
  if (parsed.protocol !== "https:" || !allowed) {
    return NextResponse.json({ error: "อนุญาตดาวน์โหลดเฉพาะรูปจาก fal / Storage ของเราเท่านั้น" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString());
    if (!res.ok) {
      return NextResponse.json({ error: `ดึงรูปไม่สำเร็จ (${res.status}) — รูปอาจหมดอายุแล้ว` }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, max-age=0",
      },
    });
  } catch (e) {
    console.error("[logo/download] error", e);
    return NextResponse.json({ error: "ดาวน์โหลดไม่สำเร็จ" }, { status: 500 });
  }
}
