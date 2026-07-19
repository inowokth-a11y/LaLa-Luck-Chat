import { createClient } from "@supabase/supabase-js";

// Supabase client ฝั่ง server (service role) — ใช้ใน API routes / server components เท่านั้น
// ⚠️ service role bypass RLS ทั้งหมด — ห้าม import ไฟล์นี้เข้า client component เด็ดขาด
// (จะทำให้ service key หลุดไป browser) การเขียนฐานความรู้ (INSERT/UPDATE) จำกัดที่นี่เท่านั้น (CLAUDE.md §7)

// ⚠️ ตรวจ env ตอน "เรียกใช้" ไม่ใช่ตอน import — ไม่งั้นแค่ import ไฟล์นี้ (เช่นในเทสต์
// ที่ทดสอบตรรกะ pure หรือตอน build) ก็ throw ทั้งที่ยังไม่ได้แตะฐานข้อมูลจริงเลย
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local ก่อน (ดู .env.example)"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
