"use client";

// หน้าบัญชีผู้ใช้ — ดูโปรไฟล์ที่กรอกไว้ + วิธีเข้าสู่ระบบ + แก้ไขข้อมูล + ออกจากระบบ
// ยังไม่ล็อกอิน → เด้งไป /login · โทนสว่างหินอ่อน (§2 หน้าข้อมูล)
// 🔒 อ่าน user_profiles_e / user_identities ด้วย session ผู้ใช้ (RLS own-row) — ไม่เห็นของคนอื่น

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/auth-browser";
import { CREDIT_PACKAGES, PROMPTPAY_MIN_THB } from "@/lib/credits/pricing";

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
  /** เครดิตคงเหลือ (0 = ยังไม่มีกระเป๋า/ยังไม่เคยเติม) */
  credits: number;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  line: "LINE",
  "custom:line": "LINE",
  email: "อีเมล (magic link)",
};

/** สถานะเติมเครดิต (PromptPay) */
interface Topup {
  chargeId: string;
  qrUri: string;
  amountThb: number;
  credits: number;
  testMode: boolean;
  status: "waiting" | "paid" | "failed";
  added?: number;
  failReason?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topup, setTopup] = useState<Topup | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // หยุด polling เมื่อออกจากหน้า
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function startTopup(priceThb: number) {
    setTopupBusy(true);
    setTopupError(null);
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      const res = await fetch("/api/payment/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceThb }),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setTopupError(d.error ?? "สร้างรายการไม่สำเร็จ");
        return;
      }
      const t: Topup = {
        chargeId: d.chargeId, qrUri: d.qrUri, amountThb: d.amountThb,
        credits: d.credits, testMode: Boolean(d.testMode), status: "waiting",
      };
      setTopup(t);
      // poll ทุก 3 วิ สูงสุด ~10 นาที — webhook เป็นทางหลัก polling เป็นทางสำรอง+อัปเดตจอ
      let ticks = 0;
      pollRef.current = setInterval(async () => {
        ticks++;
        if (ticks > 200 && pollRef.current) return clearInterval(pollRef.current);
        try {
          const s = await (await fetch(`/api/payment/topup?chargeId=${encodeURIComponent(t.chargeId)}`)).json();
          if (s.status === "paid") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTopup({ ...t, status: "paid", added: s.added });
            setView((v) => (v ? { ...v, credits: s.credits ?? v.credits } : v));
          } else if (s.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTopup({ ...t, status: "failed", failReason: s.reason });
          }
        } catch {
          /* เน็ตสะดุดชั่วคราว — รอบถัดไปลองใหม่ */
        }
      }, 3000);
    } finally {
      setTopupBusy(false);
    }
  }

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
      const [{ data: prof }, { data: ident }, { data: wallet }] = await Promise.all([
        supabase.from("user_profiles_e").select("first_name,last_name,birth_date,birth_time,birth_province").eq("auth_uid", user.id).maybeSingle(),
        supabase.from("user_identities").select("provider,display_name,platform_d_user_id").eq("auth_uid", user.id).maybeSingle(),
        supabase.from("credit_wallet_e").select("balance").eq("auth_uid", user.id).maybeSingle(),
      ]);
      if (!active) return;
      const meta = user.user_metadata ?? {};
      setView({
        email: user.email ?? null,
        provider: (ident?.provider ?? (user.app_metadata?.provider as string)) ?? null,
        displayName: (ident?.display_name ?? meta.name ?? meta.full_name) ?? null,
        profile: (prof as View["profile"]) ?? null,
        linkedToPlatformD: Boolean(ident?.platform_d_user_id),
        credits: wallet?.balance ?? 0,
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
        <Row label="เครดิตคงเหลือ" value={`${view.credits} เครดิต`} />
      </section>

      <section style={card}>
        <h2 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", marginTop: 0 }}>
          เติมเครดิต (PromptPay)
        </h2>
        {!topup || topup.status !== "waiting" ? (
          <>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {CREDIT_PACKAGES.filter((p) => p.priceThb >= PROMPTPAY_MIN_THB).map((p) => (
                <button
                  key={p.priceThb}
                  onClick={() => startTopup(p.priceThb)}
                  disabled={topupBusy}
                  style={{ ...btn, flex: 1, minWidth: 130 }}
                >
                  ฿{p.priceThb} → {p.credits} เครดิต
                  <br />
                  <small style={{ opacity: 0.7 }}>{p.label}</small>
                </button>
              ))}
            </div>
            {topup?.status === "paid" && (
              <p style={{ color: "var(--good, #2f6b3f)", marginTop: "0.8rem" }}>
                ✓ เติมสำเร็จ{typeof topup.added === "number" ? ` +${topup.added} เครดิต` : ""} — ยอดใหม่แสดงด้านบนแล้ว
              </p>
            )}
            {topup?.status === "failed" && (
              <p style={{ color: "var(--bad, #a83a1e)", marginTop: "0.8rem" }}>
                รายการไม่สำเร็จ ({topup.failReason ?? "ไม่ทราบสาเหตุ"}) — ยังไม่ถูกตัดเครดิต/เงินใดๆ ลองใหม่ได้เลย
              </p>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            {topup.testMode && (
              <p style={{ background: "color-mix(in srgb, orange 18%, transparent)", padding: "0.4rem", borderRadius: 6, fontSize: "0.8rem" }}>
                🧪 โหมดทดสอบ — ไม่มีการตัดเงินจริง
              </p>
            )}
            {/* QR จาก Omise เอง (โดเมน omise) — แสดงตรงๆ ไม่แก้ไข */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={topup.qrUri} alt="PromptPay QR" style={{ maxWidth: 240, width: "100%", margin: "0.5rem auto", display: "block" }} />
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
              สแกนด้วยแอปธนาคารเพื่อจ่าย <b>฿{topup.amountThb}</b> → รับ <b>{topup.credits} เครดิต</b>
              <br />
              <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>ระบบตรวจการชำระอัตโนมัติ ไม่ต้องกดอะไรเพิ่ม</span>
            </p>
            <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setTopup(null); }} style={{ ...btn, marginTop: "0.4rem" }}>
              ยกเลิก/เลือกแพ็กใหม่
            </button>
          </div>
        )}
        {topupError && <p style={{ color: "var(--bad, #a83a1e)", marginTop: "0.6rem" }}>⚠️ {topupError}</p>}
        <p style={{ fontSize: "0.75rem", opacity: 0.65, marginTop: "0.8rem", lineHeight: 1.6 }}>
          เครดิตใช้กับ ทำนายฝัน · เสี่ยงทาย · คำถามแชท · โลโก้/ฉลาก AI — ดูยอดและประวัติได้ที่หน้านี้
        </p>
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
