"use client";

// หน้ายินยอม PDPA (ขั้นที่ 2 ของ flow หน้าแรก) — สรุปย่ออ่านจริงได้ + ลิงก์ฉบับเต็ม /privacy
// ยินยอมแล้วเลือกทางเข้า: บัญชีจริง (Google/LINE/อีเมล — ไป /login) หรือ "เริ่มเลยแบบผู้เยี่ยมชม"
// (Supabase Anonymous Sign-in — ⚠️ ต้องเปิด Anonymous ใน Dashboard ก่อน ไม่งั้นปุ่ม guest จะ error)
//
// 🔴 เวลา/เวอร์ชันที่ยินยอมถูกเก็บเข้า intake → /welcome บันทึกลง user_profiles_e (migration 033)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MascotLogo from "@/app/_components/MascotLogo";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { loadIntake, saveIntake } from "@/app/_components/intake";
import { CONSENT_SUMMARY, PDPA_VERSION } from "@/lib/consent";

export default function ConsentPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // เข้าหน้านี้ต้องมีข้อมูลจากหน้าแรกก่อน — ไม่มีก็กลับไปกรอก
    if (!loadIntake()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  /** ประทับเวลายินยอมลง intake — /welcome เป็นคนบันทึกขึ้น server */
  function stampConsent() {
    const intake = loadIntake();
    if (!intake) return false;
    saveIntake({ ...intake, consentVersion: PDPA_VERSION, consentAt: new Date().toISOString() });
    return true;
  }

  function goLogin() {
    if (!stampConsent()) return router.replace("/");
    router.push("/login?next=/welcome");
  }

  async function goGuest() {
    if (!stampConsent()) return router.replace("/");
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await createSupabaseBrowser().auth.signInAnonymously();
      if (e) throw e;
      router.push("/welcome");
    } catch (e) {
      console.warn("[consent] anonymous sign-in ล้มเหลว", e);
      setError("โหมดผู้เยี่ยมชมยังไม่พร้อมใช้งานตอนนี้ — เข้าสู่ระบบด้วยช่องทางอื่นก่อนนะคะ");
      setBusy(false);
    }
  }

  if (!ready) return null;

  const btn: React.CSSProperties = {
    fontFamily: "var(--font-sans-thai)",
    width: "100%",
    padding: "0.8rem 1.2rem",
    borderRadius: 10,
    fontSize: "0.95rem",
    cursor: agreed ? "pointer" : "not-allowed",
    opacity: agreed ? 1 : 0.45,
  };

  return (
    <main
      className="tone-marble"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem 3rem",
        color: "var(--ink)",
      }}
    >
      <div className="gold-frame" style={{ width: "100%", maxWidth: 460 }}>
        <div className="gold-frame-inner" style={{ padding: "1.5rem 1.3rem" }}>
          <div style={{ textAlign: "center" }}>
            <MascotLogo size={100} />
            <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.35rem", margin: "0.3rem 0 0.2rem" }}>
              ก่อนเปิดการ์ด — ขอความยินยอมนิดนึงค่ะ
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)" }}>
              แม่หมอต้องเก็บข้อมูลบางอย่างเพื่อคำนวณและจำเรื่องราวของคุณ
            </p>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0" }}>
            {CONSENT_SUMMARY.map((c) => (
              <li key={c.text} style={{ display: "flex", gap: "0.55rem", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "0.45rem" }}>
                <span aria-hidden>{c.icon}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>

          <label style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", fontSize: "0.9rem", cursor: "pointer", lineHeight: 1.6 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 4 }} />
            <span>
              ฉันได้อ่านและยินยอมตาม{" "}
              <Link href="/privacy" target="_blank" style={{ color: "var(--gold)" }}>
                นโยบายความเป็นส่วนตัว (ฉบับเต็ม)
              </Link>{" "}
              ฉบับ {PDPA_VERSION}
            </span>
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1.1rem" }}>
            <button
              disabled={!agreed || busy}
              onClick={goGuest}
              style={{
                ...btn,
                color: "#fffdf8",
                background: "linear-gradient(135deg, #c9992a, var(--gold) 60%, #96700a)",
                border: "1px solid var(--gold)",
              }}
            >
              {busy ? "กำลังเตรียม…" : "🐾 เริ่มเลย ไม่ต้องสมัคร (ผู้เยี่ยมชม)"}
            </button>
            <button
              disabled={!agreed || busy}
              onClick={goLogin}
              style={{ ...btn, background: "var(--card-bg)", border: "1px solid var(--gold-dim, #cbb98f)", color: "var(--ink)" }}
            >
              เข้าสู่ระบบด้วย Google / LINE / อีเมล
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--ink-dim)", marginTop: "0.7rem", lineHeight: 1.6 }}>
            โหมดผู้เยี่ยมชมผูกกับเบราว์เซอร์เครื่องนี้ — ถ้าล้างข้อมูลเบราว์เซอร์/เปลี่ยนเครื่อง
            จะกลับเข้าบัญชีเดิมไม่ได้จนกว่าจะผูกบัญชี (ทำทีหลังได้ ข้อมูลไม่หาย)
          </p>
          {error && <p style={{ color: "var(--bad, #a83a1e)", fontSize: "0.85rem", marginTop: "0.5rem" }}>⚠️ {error}</p>}
        </div>
      </div>
    </main>
  );
}
