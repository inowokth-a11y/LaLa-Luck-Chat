"use client";

// หน้าบัญชีผู้ใช้ — ดูโปรไฟล์ที่กรอกไว้ + วิธีเข้าสู่ระบบ + แก้ไขข้อมูล + ออกจากระบบ
// ยังไม่ล็อกอิน → เด้งไป /login · โทนสว่างหินอ่อน (§2 หน้าข้อมูล)
// 🔒 อ่าน user_profiles_e / user_identities ด้วย session ผู้ใช้ (RLS own-row) — ไม่เห็นของคนอื่น

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";

interface View {
  email: string | null;
  provider: string | null;
  displayName: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    birth_date: string | null;
    birth_time: string | null;
    birth_province: string | null;
  } | null;
  linkedToPlatformD: boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  line: "LINE",
  "custom:line": "LINE",
  email: "อีเมล (magic link)",
};

export default function AccountPage() {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        router.replace("/login?next=/account");
        return;
      }
      const [{ data: prof }, { data: ident }] = await Promise.all([
        supabase.from("user_profiles_e").select("first_name,last_name,birth_date,birth_time,birth_province").eq("auth_uid", user.id).maybeSingle(),
        supabase.from("user_identities").select("provider,display_name,platform_d_user_id").eq("auth_uid", user.id).maybeSingle(),
      ]);
      if (!active) return;
      const meta = user.user_metadata ?? {};
      setView({
        email: user.email ?? null,
        provider: (ident?.provider ?? (user.app_metadata?.provider as string)) ?? null,
        displayName: (ident?.display_name ?? meta.name ?? meta.full_name) ?? null,
        profile: (prof as View["profile"]) ?? null,
        linkedToPlatformD: Boolean(ident?.platform_d_user_id),
      });
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    setBusy(true);
    await createSupabaseBrowser().auth.signOut();
    router.replace("/");
  }

  const page: React.CSSProperties = {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text, var(--ink))",
    maxWidth: 560,
    margin: "0 auto",
    padding: "3rem 1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.1rem",
  };
  const card: React.CSSProperties = {
    border: "1px solid var(--gold-dim, #a89870)",
    borderRadius: 8,
    padding: "1rem 1.2rem",
    background: "color-mix(in srgb, var(--gold) 5%, transparent)",
  };
  const btn: React.CSSProperties = {
    fontFamily: "var(--font-sans-thai)",
    fontSize: "0.9rem",
    padding: "0.6rem 1.2rem",
    borderRadius: 8,
    textDecoration: "none",
    textAlign: "center",
    cursor: "pointer",
    border: "1px solid var(--gold-dim, #a89870)",
    color: "var(--text, var(--ink))",
    background: "transparent",
  };

  if (!ready || !view) {
    return <main className="tone-marble" style={page}><p style={{ opacity: 0.7 }}>กำลังโหลด…</p></main>;
  }

  const p = view.profile;
  const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ") || view.displayName || "—";

  return (
    <main className="tone-marble" style={page}>
      <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)", margin: 0 }}>บัญชีของฉัน</h1>

      <section style={card}>
        <Row label="เข้าสู่ระบบด้วย" value={view.provider ? PROVIDER_LABEL[view.provider] ?? view.provider : "—"} />
        <Row label="อีเมล" value={view.email ?? "— (บัญชีนี้ไม่มีอีเมล)"} />
        {view.linkedToPlatformD && <Row label="เชื่อมกับบัญชีเดิม" value="✓ เชื่อมแล้ว (KRUTH)" />}
      </section>

      <section style={card}>
        <h2 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", marginTop: 0 }}>ข้อมูลพื้นฐาน</h2>
        {p ? (
          <>
            <Row label="ชื่อ" value={fullName} />
            <Row label="วันเกิด (ค.ศ.)" value={p.birth_date ?? "—"} />
            <Row label="เวลาเกิด" value={p.birth_time ?? "— (ไม่ทราบ)"} />
            <Row label="จังหวัดที่เกิด" value={p.birth_province ?? "—"} />
          </>
        ) : (
          <p style={{ opacity: 0.8, lineHeight: 1.6 }}>ยังไม่ได้กรอกข้อมูลพื้นฐาน — กรอกแล้วระบบจะเติมให้อัตโนมัติในหน้าดูดวง และคำนวณธาตุประจำตัวในแชทได้</p>
        )}
        <Link href="/onboarding?next=/account" style={{ ...btn, display: "inline-block", marginTop: "0.8rem" }}>
          {p ? "แก้ไขข้อมูลพื้นฐาน" : "กรอกข้อมูลพื้นฐาน"}
        </Link>
      </section>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <Link href="/" style={{ ...btn, flex: 1 }}>ไปหน้าแรก</Link>
        <button onClick={logout} disabled={busy} style={{ ...btn, flex: 1, borderColor: "var(--bad, #a83a1e)", color: "var(--bad, #a83a1e)" }}>
          {busy ? "…" : "ออกจากระบบ"}
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.35rem 0", fontSize: "0.9rem" }}>
      <span style={{ color: "var(--text-dim, var(--ink-dim))" }}>{label}</span>
      <span style={{ textAlign: "right", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
