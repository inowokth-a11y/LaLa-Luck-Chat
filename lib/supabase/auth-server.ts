// Supabase Auth client ฝั่ง server (อ่าน session จาก cookie) — ใช้ใน route handlers / RSC
// ⚠️ ใช้ anon key + session ของผู้ใช้ (ไม่ใช่ service role) — RLS จึงบังคับสิทธิ์จริง
//    การเขียน user_identities ใช้ createServiceClient() ต่างหาก (ดู server.ts)

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // ใน RSC จะ set cookie ไม่ได้ (throw) — จับไว้เงียบๆ เพราะ middleware refresh ให้แล้ว
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* เรียกจาก Server Component — ปล่อยผ่าน middleware จัดการ session แทน */
          }
        },
      },
    }
  );
}
