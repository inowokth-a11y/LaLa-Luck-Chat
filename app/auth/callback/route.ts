// /auth/callback — ปลายทางหลัง OAuth/magic link (Supabase ส่ง code กลับมาที่นี่)
//
// ลำดับ: แลก code เป็น session → upsert user_identities (service role) → เชื่อม D ผ่าน LINE → redirect
// 🔒 ไม่แตะตาราง users ของ D — แค่ "อ่าน" เพื่อหา platform_d_user_id ที่ line_user_id ตรงกัน (§12)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** ดึง LINE userId (sub) จาก metadata ของผู้ใช้ — โครง metadata ต่างกันตาม provider */
function extractLineUserId(user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: { provider: string; id: string }[] | null;
}): string | null {
  const provider = String(user.app_metadata?.provider ?? "");
  if (!provider.includes("line")) return null;
  const meta = user.user_metadata ?? {};
  const sub = meta.sub ?? meta.user_id ?? null;
  if (typeof sub === "string" && sub) return sub;
  const ident = (user.identities ?? []).find((i) => i.provider.includes("line"));
  return ident?.id ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  // ป้องกัน open-redirect — รับเฉพาะ path ภายในไซต์
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange ล้มเหลว", error.message);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", url.origin));
  }

  // ปลายทางหลังล็อกอิน — ถ้ายังไม่มีโปรไฟล์ ให้ไปกรอกข้อมูลพื้นฐานก่อน (อย่างแรก)
  let destination = safeNext;

  // upsert ตัวตนฝั่ง E — ล้มเหลวไม่ควรทำให้ login พัง (session สำเร็จไปแล้ว)
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (user) {
      const meta = user.user_metadata ?? {};
      const lineUserId = extractLineUserId(user);

      // เชื่อม Platform D อัตโนมัติเมื่อ LINE userId ตรงกับแถวเดิม (อ่านอย่างเดียว ไม่แก้ users)
      let platformDUserId: string | null = null;
      const svc = createServiceClient();
      if (lineUserId) {
        const { data: dUser } = await svc
          .from("users")
          .select("id")
          .eq("line_user_id", lineUserId)
          .maybeSingle();
        platformDUserId = dUser?.id ?? null;
      }

      await svc.from("user_identities").upsert(
        {
          auth_uid: user.id,
          email: user.email ?? null,
          display_name: (meta.name ?? meta.full_name ?? meta.display_name ?? null) as string | null,
          avatar_url: (meta.avatar_url ?? meta.picture ?? null) as string | null,
          line_user_id: lineUserId,
          provider: String(user.app_metadata?.provider ?? "email"),
          last_login_at: new Date().toISOString(),
          ...(platformDUserId ? { platform_d_user_id: platformDUserId } : {}),
        },
        { onConflict: "auth_uid" }
      );

      // ยังไม่มีโปรไฟล์พื้นฐาน → พาไปกรอกก่อน แล้วค่อยไปปลายทางเดิม
      const { data: prof } = await svc
        .from("user_profiles_e")
        .select("auth_uid")
        .eq("auth_uid", user.id)
        .maybeSingle();
      if (!prof) {
        destination = `/onboarding?next=${encodeURIComponent(safeNext)}`;
      }
    }
  } catch (e) {
    console.error("[auth/callback] upsert identity ล้มเหลว (login ยังสำเร็จ)", e);
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
