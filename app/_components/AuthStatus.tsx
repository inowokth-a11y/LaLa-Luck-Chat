"use client";

// แถบสถานะผู้ใช้มุมขวาบน — แสดงทุกหน้า (อยู่ใน root layout)
// ล็อกอิน: ชื่อ + ⭐เครดิต + 💬คำถามฟรี → แตะไป /account (เติมเงิน) · ยังไม่ล็อกอิน: "เข้าสู่ระบบ"
// (ผู้ใช้ตัดสิน 1 ส.ค. 2569: ต้องเห็นทรัพยากรของตัวเองตลอดเวลา — เป็นทั้ง awareness และปุ่มเติมเงินแฝง)
//
// อ่านด้วย session ผู้ใช้ผ่าน RLS own-row (credit_wallet_e / chat_usage_e) — ไม่มี service key ฝั่งนี้
// หน้าที่เปลี่ยนยอด (แชท/เติมเงิน) เรียก syncAuthStatus() → แถบรีเฟรชทันที

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { FREE_QUESTIONS_TOTAL } from "@/lib/chat/questions";

const HIDE_ON = ["/login", "/onboarding", "/auth", "/consent", "/welcome"];
const SYNC_EVENT = "lala:sync-status";

/** ให้หน้าอื่นสั่งรีเฟรชแถบสถานะหลังใช้/เติมเครดิต */
export function syncAuthStatus() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_EVENT));
}
/** hook เวอร์ชันสำหรับ component — คืนฟังก์ชันสั่ง sync */
export function useSyncStatus() {
  return useCallback(() => syncAuthStatus(), []);
}

interface Status {
  name: string;
  credits: number;
  freeQuestions: number;
}

export default function AuthStatus() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) {
      setStatus(null);
      setLoggedOut(true);
      setIsAdmin(false);
      setReady(true);
      return;
    }
    // แอดมินตัดสินที่ server (ADMIN_EMAILS ไม่อยู่ฝั่ง client) — ปุ่มนี้เป็นแค่ทางลัด
    // gate จริงอยู่ที่หน้า/route แอดมินทุกตัว ปลอมค่าฝั่งนี้ได้แค่เห็นปุ่มแล้วโดนเด้งออก
    if (u.email) {
      void fetch("/api/admin/me")
        .then((r) => r.json())
        .then((d) => setIsAdmin(Boolean(d?.admin)))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
    const [prof, wallet, usage] = await Promise.all([
      supabase.from("user_profiles_e").select("first_name").eq("auth_uid", u.id).maybeSingle(),
      supabase.from("credit_wallet_e").select("balance").eq("auth_uid", u.id).maybeSingle(),
      supabase.from("chat_usage_e").select("used,bonus").eq("auth_uid", u.id).eq("bucket", "questions").maybeSingle(),
    ]);
    const meta = u.user_metadata ?? {};
    const name =
      prof.data?.first_name ??
      ((meta.name ?? meta.full_name ?? meta.display_name) as string | undefined)?.split(" ")[0] ??
      u.email ??
      "บัญชีของฉัน";
    const used = usage.data?.used ?? 0;
    const bonus = usage.data?.bonus ?? 0;
    setStatus({
      name,
      credits: wallet.data?.balance ?? 0,
      freeQuestions: Math.max(0, FREE_QUESTIONS_TOTAL + bonus - used),
    });
    setLoggedOut(false);
    setReady(true);
  }, []);

  useEffect(() => {
    void load();
    const supabase = createSupabaseBrowser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    const onSync = () => void load();
    window.addEventListener(SYNC_EVENT, onSync);
    // กลับมาที่แท็บ (เช่นหลังไปจ่ายเงิน/แชร์) → รีเฟรชให้ตัวเลขตรง
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(SYNC_EVENT, onSync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

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
    gap: "0.45rem",
    padding: "0.35rem 0.8rem",
    borderRadius: 999,
    textDecoration: "none",
    color: "var(--gold, #b8860b)",
    background: "color-mix(in srgb, var(--gold, #b8860b) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--gold, #b8860b) 45%, transparent)",
    backdropFilter: "blur(6px)",
    maxWidth: "72vw",
    overflow: "hidden",
    whiteSpace: "nowrap",
  };
  const sep: React.CSSProperties = { opacity: 0.45 };

  return (
    <div style={{ ...wrap, display: "flex", gap: "0.4rem", alignItems: "center" }}>
      {status && isAdmin && (
        <Link href="/admin" style={pill} title="แดชบอร์ดแอดมิน">
          🛠 แอดมิน
        </Link>
      )}
      {status ? (
        <Link href="/account" style={pill} title="บัญชี / เติมเครดิต">
          <span aria-hidden>🐾</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "9rem" }}>{status.name}</span>
          <span style={sep}>·</span>
          <span title="เครดิตคงเหลือ">⭐ {status.credits}</span>
          <span style={sep}>·</span>
          <span title="คำถามฟรีคงเหลือ">💬 {status.freeQuestions}</span>
        </Link>
      ) : loggedOut ? (
        <Link href="/login" style={pill}>
          เข้าสู่ระบบ
        </Link>
      ) : null}
    </div>
  );
}
