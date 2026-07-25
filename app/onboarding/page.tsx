"use client";

// กรอกข้อมูลพื้นฐานหลังล็อกอิน — เก็บครั้งเดียวเพื่อใช้คำนวณให้ทุกฟีเจอร์ (ไม่ต้องกรอกซ้ำ)
// เขียนลง user_profiles_e ด้วย session ของผู้ใช้เอง (RLS บังคับ auth.uid = auth_uid)
// 🔒 ไม่แตะตาราง users ของ D · ผู้ใช้ที่ยังไม่ล็อกอินถูกส่งไป /login

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { provincesByRegion } from "@/lib/provinces";

// useSearchParams ต้องอยู่ใน Suspense (Next.js App Router) — ห่อไว้ที่ default export
export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="tone-marble" style={{ minHeight: "100vh", background: "var(--bg)" }} />}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const params = useSearchParams();
  const next = (() => {
    const n = params.get("next") ?? "/";
    return n.startsWith("/") && !n.startsWith("//") ? n : "/";
  })();

  const [ready, setReady] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [province, setProvince] = useState("bangkok");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent("/onboarding")}`);
        return;
      }
      setAuthUid(data.user.id);
      // prefill ถ้าเคยกรอกไว้แล้ว (แก้ไขได้)
      const { data: prof } = await supabase
        .from("user_profiles_e")
        .select("first_name,last_name,birth_date,birth_time,birth_province")
        .eq("auth_uid", data.user.id)
        .maybeSingle();
      if (prof) {
        setFirstName(prof.first_name ?? "");
        setLastName(prof.last_name ?? "");
        setBirthDate(prof.birth_date ?? "");
        setBirthTime(prof.birth_time ?? "");
        setProvince(prof.birth_province ?? "bangkok");
      }
      setReady(true);
    })();
  }, [supabase, router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!authUid || busy) return;
    // <input type=date> ให้ ค.ศ. YYYY-MM-DD อยู่แล้ว — กันปีเพี้ยนอีกชั้น (§5.1)
    const year = Number(birthDate.slice(0, 4));
    if (!birthDate || year < 1900 || year > 2100) {
      setError("กรุณากรอกวันเกิดเป็น ค.ศ. ที่ถูกต้อง");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("user_profiles_e").upsert(
      {
        auth_uid: authUid,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        birth_date: birthDate,
        birth_time: birthTime || null,
        birth_province: province,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_uid" }
    );
    setBusy(false);
    if (error) setError(error.message);
    else router.replace(next);
  }

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text, var(--ink))",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.8rem",
    padding: "2rem 1rem",
  };
  const field: React.CSSProperties = {
    width: "100%",
    fontFamily: "var(--font-sans-thai)",
    fontSize: "0.95rem",
    padding: "0.65rem 0.9rem",
    borderRadius: 8,
    border: "1px solid var(--gold-dim, #a89870)",
    background: "var(--surface, transparent)",
    color: "var(--text, var(--ink))",
  };

  if (!ready) return <main className="tone-marble" style={wrap}><p style={{ opacity: 0.7 }}>กำลังโหลด…</p></main>;

  return (
    <main className="tone-marble" style={wrap}>
      <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.6rem", color: "var(--gold)", textAlign: "center" }}>
        กรอกข้อมูลพื้นฐานของคุณ
      </h1>
      <p style={{ maxWidth: 380, textAlign: "center", opacity: 0.8, fontSize: "0.9rem", lineHeight: 1.6 }}>
        กรอกครั้งเดียว ระบบจะใช้ข้อมูลนี้คำนวณให้ทุกอย่าง — ไม่ต้องกรอกซ้ำทุกครั้งที่ถาม
      </p>

      {error && <p style={{ color: "var(--bad, #b23)", maxWidth: 380, textAlign: "center" }}>⚠️ {error}</p>}

      <form onSubmit={save} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input style={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ชื่อ" required />
          <input style={field} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="นามสกุล" required />
        </div>

        <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>วันเกิด (ค.ศ.)</label>
        <input style={field} type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />

        <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>เวลาเกิด (ถ้าทราบ — เว้นว่างได้)</label>
        <input style={field} type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />

        <label style={{ fontSize: "0.85rem", opacity: 0.85 }}>จังหวัดที่เกิด</label>
        <select style={field} value={province} onChange={(e) => setProvince(e.target.value)}>
          {provincesByRegion().map((g) => (
            <optgroup key={g.region} label={`ภาค${g.region}`}>
              {g.items.map((p) => (
                <option key={p.key} value={p.key}>{p.name}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="submit"
          style={{ ...field, background: "var(--gold)", color: "var(--bg)", fontWeight: 600, cursor: "pointer", marginTop: "0.4rem" }}
          disabled={busy}
        >
          {busy ? "กำลังบันทึก…" : "บันทึกและเริ่มใช้งาน"}
        </button>
      </form>

      <button
        onClick={() => router.replace(next)}
        style={{ background: "none", border: "none", color: "var(--text-dim, var(--ink-dim))", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline" }}
      >
        ข้ามไปก่อน กรอกทีหลังได้
      </button>
    </main>
  );
}
