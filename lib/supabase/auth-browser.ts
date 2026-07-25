"use client";

// Supabase Auth client ฝั่ง browser (cookie-based ผ่าน @supabase/ssr) — ใช้ใน client components
// ต่างจาก lib/supabase/client.ts เดิม (อ่านฐานความรู้สาธารณะ) — ตัวนี้จัดการ session/login
// session เก็บใน cookie เพื่อให้ฝั่ง server (middleware/route/RSC) อ่านต่อได้

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
