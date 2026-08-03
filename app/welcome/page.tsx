"use client";

// ฉากคำนวณ (ขั้นสุดท้ายของ flow หน้าแรก) — "แม่หมออยู่ด้วยตลอด" (ผู้ใช้ออกแบบ 1 ส.ค. 2569)
//   1) รับ session หลัง auth (OAuth/guest) — sessionStorage อยู่รอดข้าม redirect
//   2) บันทึกโปรไฟล์ + หลักฐาน consent (ครั้งแรกที่ข้อมูลขึ้น server — หลังยินยอมแล้วเท่านั้น)
//   3) แมวดุ๊กดิ๊ก "กำลังคำนวณรหัสพลังในการทำนาย..." ≥2.6 วิ (จังหวะพิธีกรรม) → /profile?auto=1

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MascotLogo from "@/app/_components/MascotLogo";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { loadIntake, clearIntake } from "@/app/_components/intake";

const MIN_SCENE_MS = 2600;

export default function WelcomePage() {
  const router = useRouter();
  const [line, setLine] = useState("กำลังคำนวณรหัสพลังในการทำนาย…");

  useEffect(() => {
    const t0 = Date.now();
    let active = true;

    (async () => {
      const supabase = createSupabaseBrowser();

      // หลัง redirect กลับมา session อาจมาช้าหนึ่งจังหวะ — ลองซ้ำสั้นๆ ก่อนตัดสินว่าไม่ล็อกอิน
      let user = null;
      for (let i = 0; i < 6 && !user; i++) {
        user = (await supabase.auth.getUser()).data.user;
        if (!user) await new Promise((r) => setTimeout(r, 500));
      }
      if (!active) return;
      if (!user) {
        router.replace("/login?next=/welcome");
        return;
      }

      const intake = loadIntake();
      if (intake) {
        // บันทึกโปรไฟล์ + consent (RLS own-row write — แพทเทิร์นเดียวกับ onboarding)
        const { error } = await supabase.from("user_profiles_e").upsert(
          {
            auth_uid: user.id,
            first_name: intake.firstName || null,
            last_name: intake.lastName || null,
            birth_date: intake.birthDate,
            birth_time: intake.birthTime || null,
            gender: intake.gender || null,
            pdpa_version: intake.consentVersion ?? null,
            pdpa_accepted_at: intake.consentAt ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "auth_uid" }
        );
        if (error) console.warn("[welcome] บันทึกโปรไฟล์ไม่สำเร็จ", error.message);
        else clearIntake();
      } else {
        // เข้าหน้านี้ตรงๆ โดยไม่มี intake — มีโปรไฟล์แล้วไปต่อ ไม่มีก็ไปกรอกแบบเดิม
        const { data: prof } = await supabase
          .from("user_profiles_e")
          .select("birth_date")
          .eq("auth_uid", user.id)
          .maybeSingle();
        if (!prof?.birth_date) {
          router.replace("/onboarding?next=/welcome");
          return;
        }
      }

      if (!active) return;
      setLine("รหัสพลังของคุณกำลังปรากฏ… 🐾");
      // จังหวะพิธีกรรม — รอให้ครบเวลาขั้นต่ำก่อนเปิดการ์ด
      const wait = Math.max(0, MIN_SCENE_MS - (Date.now() - t0));
      setTimeout(() => {
        if (active) router.replace("/profile?auto=1");
      }, wait);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main
      className="tone-marble"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        color: "var(--ink)",
        textAlign: "center",
        padding: "2rem 1rem",
      }}
    >
      <MascotLogo size={190} />
      <p style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.25rem", color: "var(--gold)" }}>{line}</p>
      <p className="welcome-dots" style={{ fontFamily: "var(--font-mono), monospace", fontSize: "1.4rem", color: "var(--gold)", letterSpacing: "0.4em" }}>
        ✦ ✦ ✦
      </p>
      <style>{`
        .welcome-dots { animation: welcome-pulse 1.2s ease-in-out infinite; }
        @keyframes welcome-pulse { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .welcome-dots { animation: none } }
      `}</style>
    </main>
  );
}
