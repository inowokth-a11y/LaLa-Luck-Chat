"use client";

// ชิปสถานะล็อกอิน มุมขวาบน — แสดงทุกหน้า (อยู่ใน root layout)
// ล็อกอินแล้ว → ชื่อ/อีเมล + ลิงก์ไปหน้าบัญชี · ยังไม่ล็อกอิน → ลิงก์เข้าสู่ระบบ
// ธีมเป็นกลาง (โปร่งแสง) ทำงานได้ทั้งหน้าโทนมืดและสว่าง · position:fixed ไม่กระทบ layout หน้าอื่น
// 🔴 บนหน้า /login และ /onboarding ไม่ต้องโชว์ (ซ้ำซ้อน/รบกวน) — เช็คจาก pathname

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";

const HIDE_ON = ["/login", "/onboarding", "/auth"];

export default function AuthStatus() {
  const pathname = usePathname();
  const [label, setLabel] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      if (u) {
        const meta = u.user_metadata ?? {};
        const name = (meta.name ?? meta.full_name ?? meta.display_name) as string | undefined;
        setLabel(name?.split(" ")[0] ?? u.email ?? "บัญชีของฉัน");
      }
      setReady(true);
    });
    // อัปเดตทันทีเมื่อ login/logout (ไม่ต้องรีเฟรชหน้า)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      const u = session?.user;
      const meta = u?.user_metadata ?? {};
      setLabel(u ? ((meta.name ?? meta.full_name) as string | undefined)?.split(" ")[0] ?? u.email ?? "บัญชีของฉัน" : null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (HIDE_ON.some((p) => pathname?.startsWith(p))) return null;
  if (!ready) return null;

  const wrap: React.CSSProperties = {
    position: "fixed",
    top: 12,
    right: 12,
    zIndex: 50,
    fontFamily: "var(--font-sans-thai), sans-serif",
    fontSize: "0.8rem",
  };
  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.35rem 0.8rem",
    borderRadius: 999,
    textDecoration: "none",
    color: "var(--gold, #b8860b)",
    background: "color-mix(in srgb, var(--gold, #b8860b) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--gold, #b8860b) 45%, transparent)",
    backdropFilter: "blur(6px)",
    maxWidth: "45vw",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };

  return (
    <div style={wrap}>
      {label ? (
        <Link href="/account" style={pill} title="จัดการบัญชี">
          <span aria-hidden>👤</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        </Link>
      ) : (
        <Link href="/login" style={pill}>
          เข้าสู่ระบบ
        </Link>
      )}
    </div>
  );
}
