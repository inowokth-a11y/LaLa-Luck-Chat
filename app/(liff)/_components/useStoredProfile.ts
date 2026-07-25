"use client";

// อ่านโปรไฟล์พื้นฐานของผู้ใช้ (user_profiles_e) สำหรับ prefill ฟอร์ม — ใช้ร่วมหลายหน้า
// ⚠️ ต้องใช้ auth-browser (มี session) ไม่ใช่ lib/supabase/client.ts ธรรมดา
//    ไม่งั้น RLS own-row จะคืน 0 แถว (auth.uid() เป็น null)
// ผู้ใช้ที่ไม่ล็อกอิน/ยังไม่กรอก → profile = null (หน้าใช้งานได้ตามปกติ ไม่บังคับ)

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";

export interface StoredProfile {
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_province: string | null;
}

export function useStoredProfile() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const { data: prof } = await supabase
            .from("user_profiles_e")
            .select("first_name,last_name,birth_date,birth_time,birth_province")
            .eq("auth_uid", data.user.id)
            .maybeSingle();
          if (active) setProfile((prof as StoredProfile | null) ?? null);
        }
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { profile, loaded };
}
