"use client";

// หน้าเข้าสู่ระบบ — Google / Facebook / LINE (custom OIDC) + magic link อีเมล (CLAUDE.md §12)
//
// ⚠️ provider เปิด/ปิดที่ Supabase Dashboard (คีย์อยู่ที่นั่น ไม่ใช่ .env.local) — หน้านี้แค่เรียก
//    ถ้า provider ไหนยังไม่เปิดในแดชบอร์ด กดแล้วจะ error กลับมาที่ ?error= (แสดงให้ผู้ใช้เห็น)
// ⚠️ LINE ไม่ให้อีเมลอัตโนมัติ (§15) — ออกแบบเผื่อผู้ใช้ที่ไม่มีอีเมลได้

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Provider, User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";

const OAUTH: { id: string; label: string }[] = [
  { id: "google", label: "เข้าสู่ระบบด้วย Google" },
  { id: "facebook", label: "เข้าสู่ระบบด้วย Facebook" },
  { id: "custom:line", label: "เข้าสู่ระบบด้วย LINE" }, // custom OIDC provider (§15)
];

const ERROR_TEXT: Record<string, string> = {
  missing_code: "ไม่พบรหัสยืนยันจากผู้ให้บริการ ลองใหม่อีกครั้งนะคะ",
  exchange_failed: "ยืนยันตัวตนไม่สำเร็จ ลองใหม่อีกครั้งนะคะ",
};

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(ERROR_TEXT[err] ?? "เข้าสู่ระบบไม่สำเร็จ");
    const n = params.get("next") ?? "/";
    setNext(n.startsWith("/") && !n.startsWith("//") ? n : "/");
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
  }, [supabase]);

  // 🔴 ต้องพก next เข้า callback ด้วย — เดิมหน้านี้ไม่เคยส่ง ทำให้ปลายทางหลัง OAuth เพี้ยนเป็น "/"
  const redirectTo = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  /** ผู้เยี่ยมชม (anonymous) → ใช้ linkIdentity เพื่อ "ผูกบัญชี" โดยคง auth_uid เดิม (ข้อมูลไม่หาย)
   *  ⚠️ ต้องเปิด Anonymous sign-ins + Manual linking ใน Supabase Dashboard */
  const isGuest = Boolean(user?.is_anonymous);

  async function oauth(id: string) {
    setBusy(id);
    setError(null);
    const opts = { redirectTo: redirectTo() };
    const { error } = isGuest
      ? await supabase.auth.linkIdentity({ provider: id as Provider, options: opts })
      : await supabase.auth.signInWithOAuth({ provider: id as Provider, options: opts });
    if (error) {
      setError(`ยังเปิดใช้ ${id} ไม่ได้: ${error.message}`);
      setBusy(null);
    }
    // สำเร็จ = เบราว์เซอร์ redirect ไป provider เอง ไม่ต้องทำต่อ
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy("email");
    setError(null);
    setNotice(null);
    if (isGuest) {
      // อัปเกรดผู้เยี่ยมชมด้วยอีเมล — ผูกอีเมลเข้าบัญชีเดิม (ยืนยันผ่านลิงก์ในเมล)
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      setBusy(null);
      if (error) setError(error.message);
      else setNotice(`ส่งลิงก์ยืนยันไปที่ ${email.trim()} แล้ว — ยืนยันแล้วบัญชีผู้เยี่ยมชมของคุณจะกลายเป็นบัญชีถาวรค่ะ`);
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setNotice(`ส่งลิงก์เข้าสู่ระบบไปที่ ${email.trim()} แล้ว — เปิดอีเมลแล้วคลิกลิงก์ได้เลยค่ะ`);
  }

  async function logout() {
    setBusy("logout");
    await supabase.auth.signOut();
    setUser(null);
    setBusy(null);
    setNotice("ออกจากระบบแล้วค่ะ");
  }

  const box: React.CSSProperties = {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text, var(--ink))",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.9rem",
    padding: "2rem 1rem",
  };
  const btn: React.CSSProperties = {
    width: "100%",
    maxWidth: 340,
    fontFamily: "var(--font-sans-thai)",
    fontSize: "0.95rem",
    padding: "0.75rem 1rem",
    borderRadius: 8,
    border: "1px solid var(--gold-dim, #a89870)",
    background: "var(--surface, transparent)",
    color: "var(--text, var(--ink))",
    cursor: "pointer",
  };

  if (!ready) {
    return <main className="tone-marble" style={box}><p style={{ opacity: 0.7 }}>กำลังโหลด…</p></main>;
  }

  return (
    <main className="tone-marble" style={box}>
      <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)" }}>
        {user && !isGuest ? "บัญชีของคุณ" : isGuest ? "ผูกบัญชีถาวร" : "เข้าสู่ระบบ LaLa Lucky Chat"}
      </h1>

      {error && <p style={{ color: "var(--bad, #b23)", maxWidth: 340, textAlign: "center" }}>⚠️ {error}</p>}
      {notice && <p style={{ color: "var(--gold)", maxWidth: 340, textAlign: "center" }}>{notice}</p>}

      {isGuest && (
        <p style={{ maxWidth: 340, textAlign: "center", opacity: 0.85, fontSize: "0.88rem", lineHeight: 1.6 }}>
          ตอนนี้คุณใช้แบบ<strong>ผู้เยี่ยมชม</strong>อยู่ — ผูกบัญชีด้านล่างแล้วการ์ด เครดิต
          และความจำของแม่หมอจะติดตัวคุณถาวร (ข้อมูลเดิมไม่หาย)
        </p>
      )}

      {user && !isGuest ? (
        <>
          <p style={{ maxWidth: 340, textAlign: "center", opacity: 0.85 }}>
            เข้าสู่ระบบด้วย <strong>{user.email ?? user.app_metadata?.provider ?? "บัญชีของคุณ"}</strong>
          </p>
          <Link href="/onboarding" style={{ ...btn, background: "var(--gold)", color: "var(--bg)", fontWeight: 600, textAlign: "center", textDecoration: "none", display: "block" }}>
            กรอก/แก้ไขข้อมูลพื้นฐาน
          </Link>
          <Link href="/" style={{ ...btn, textAlign: "center", textDecoration: "none", display: "block" }}>
            ไปหน้าแรก
          </Link>
          <button style={{ ...btn, borderColor: "var(--bad, #b23)" }} onClick={logout} disabled={busy === "logout"}>
            {busy === "logout" ? "…" : "ออกจากระบบ"}
          </button>
        </>
      ) : (
        <>
          {OAUTH.map((p) => (
            <button key={p.id} style={btn} onClick={() => oauth(p.id)} disabled={!!busy}>
              {busy === p.id ? "กำลังพาไป…" : p.label}
            </button>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", maxWidth: 340, opacity: 0.6 }}>
            <span style={{ flex: 1, height: 1, background: "var(--ink-dim)" }} />
            <span style={{ fontSize: "0.8rem" }}>หรือใช้อีเมล</span>
            <span style={{ flex: 1, height: 1, background: "var(--ink-dim)" }} />
          </div>

          <form onSubmit={magicLink} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ ...btn, cursor: "text" }}
            />
            <button type="submit" style={{ ...btn, background: "var(--gold)", color: "var(--bg)", fontWeight: 600 }} disabled={!!busy || !email.trim()}>
              {busy === "email" ? "กำลังส่ง…" : isGuest ? "ผูกอีเมลนี้กับบัญชี" : "ส่งลิงก์เข้าสู่ระบบ"}
            </button>
          </form>
        </>
      )}

      <p style={{ fontSize: "0.72rem", opacity: 0.6, maxWidth: 340, textAlign: "center", marginTop: "0.5rem" }}>
        ช่วงทดลอง — โปรไฟล์/ดวงยังใช้งานได้โดยไม่ต้องเข้าสู่ระบบ การเข้าสู่ระบบไว้บันทึกผลและเติมเครดิตในอนาคต
      </p>
    </main>
  );
}
