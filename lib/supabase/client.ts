import { createClient } from "@supabase/supabase-js";

// Supabase client ฝั่ง browser (anon key) — ใช้ใน client components / LIFF pages
// RLS บังคับสิทธิ์จริงที่ฝั่ง DB (ดู migration 010) ไม่พึ่ง app logic อย่างเดียว (CLAUDE.md §7)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local ก่อน (ดู .env.example)"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
