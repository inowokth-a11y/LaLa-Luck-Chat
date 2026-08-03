// /api/affiliate/visit — ผู้เยี่ยมชมเปิดลิงก์ ?ref=CODE (RefTracker ยิงมาครั้งเดียว/เซสชัน)
// ทำ 2 อย่าง: นับ visit (atomic RPC) + ตั้ง cookie first-touch (httpOnly, 30 วัน)
//
// 🔒 เปิด public แต่ผลลัพธ์ "บอกแค่ ok" — ไม่เผยว่ารหัสไหนมีจริง (กันไล่เดารหัสพันธมิตร)
//    cookie ตั้งเฉพาะรหัสที่มีจริง+active เท่านั้น (ไม่เก็บขยะ และลิงก์ที่ปิดแล้วหยุดผูกทันที)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidCode, REF_COOKIE, REF_COOKIE_MAX_AGE_S } from "@/lib/affiliate/code";
import { encodeRefCookie, toRefVia } from "@/lib/affiliate/ref";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { code?: unknown; via?: unknown };
    const code = body.code;
    const via = toRefVia(body.via); // 'share' = มาจากการ์ดที่แชร์ต่อ · อื่นๆ = คลิกลิงก์ตรง
    if (!isValidCode(code)) return NextResponse.json({ ok: true }); // รูปแบบผิด — เงียบๆ พอ

    const svc = createServiceClient();
    const { data: link } = await svc
      .from("affiliate_links_e")
      .select("code")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    const res = NextResponse.json({ ok: true });
    if (link) {
      await svc.rpc("bump_affiliate_visit", { p_code: code, p_share: via === "share" });
      res.cookies.set(REF_COOKIE, encodeRefCookie(code, via), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: REF_COOKIE_MAX_AGE_S,
        path: "/",
      });
    }
    return res;
  } catch (e) {
    console.warn("[affiliate/visit] ล้มเหลว (ไม่กระทบผู้ใช้)", e);
    return NextResponse.json({ ok: true }); // การนับ visit พังต้องไม่ทำให้หน้าเว็บผู้ใช้เห็น error
  }
}
