"use client";

// 🧪 กลุ่มผู้ทดลองใช้ — จัดการอีเมลที่ใช้งานได้แบบไม่หักเครดิต (มติผู้ใช้ 31 ส.ค. 2569)
// อ่าน/เขียนผ่าน /api/admin/testers (gate ADMIN_EMAILS) — component ไม่ตัดสินสิทธิ์เอง
// สิทธิ์มีผลผ่านชั้นกระเป๋า (lib/credits/wallet.ts + RPC is_tester_account) —
// เพิ่มอีเมลได้ก่อนคนนั้นสมัคร พอสมัครแล้วสิทธิ์ติดทันที

import { useCallback, useEffect, useState } from "react";

interface TesterRow {
  email: string;
  note: string | null;
  active: boolean;
  added_by: string | null;
  created_at: string;
}

export default function TesterAdmin() {
  const [rows, setRows] = useState<TesterRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/testers");
      const d = await res.json();
      if (Array.isArray(d.testers)) setRows(d.testers);
      else setMsg(`⚠️ ${d.error ?? "โหลดรายชื่อไม่สำเร็จ"}`);
    } catch {
      setMsg("⚠️ โหลดรายชื่อไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function call(method: string, body: Record<string, unknown>, okMsg: string) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/testers", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.error) setMsg(`⚠️ ${d.error}`);
      else {
        setMsg(okMsg);
        await load();
      }
    } catch {
      setMsg("⚠️ ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await call("POST", { email: email.trim(), note: note.trim() || undefined }, `✅ เพิ่ม ${email.trim().toLowerCase()} แล้ว`);
    setEmail("");
    setNote("");
  }

  return (
    <section style={S.card}>
      <h2 style={S.h2}>🧪 กลุ่มผู้ทดลองใช้ (ไม่หักเครดิต)</h2>
      <p style={S.note}>
        อีเมลในรายชื่อนี้ใช้ทุกฟีเจอร์ได้แบบไม่หักเครดิต (ยอดแสดง ⭐ 999999 · การใช้งานไม่เขียน ledger
        — ไม่ปนสถิติรายรับ) · เพิ่มก่อนสมัครได้ พอสมัครด้วยอีเมลนี้สิทธิ์ติดทันที · ปิดสิทธิ์มีผลใน ~1 นาที
      </p>
      <form onSubmit={add} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "0.7rem 0" }}>
        <input
          style={{ ...S.input, flex: "2 1 200px" }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="อีเมลผู้ทดลอง เช่น tester@example.com"
          type="email"
        />
        <input
          style={{ ...S.input, flex: "2 1 160px" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="โน้ต (ไม่บังคับ) เช่น กลุ่มเพื่อนรอบแรก"
        />
        <button type="submit" disabled={busy || !email.trim()} style={S.btn}>
          ➕ เพิ่ม
        </button>
      </form>
      {msg && <p style={{ ...S.note, margin: "0 0 0.5rem" }}>{msg}</p>}
      {rows === null ? (
        <p style={S.note}>กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <p style={S.note}>ยังไม่มีผู้ทดลองในรายชื่อ</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: "left" }}>อีเมล</th>
                <th style={{ ...S.th, textAlign: "left" }}>โน้ต</th>
                <th style={S.th}>สถานะ</th>
                <th style={S.th}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email} style={r.active ? undefined : { opacity: 0.5 }}>
                  <td style={{ ...S.td, ...S.mono }}>{r.email}</td>
                  <td style={S.td}>{r.note ?? "—"}</td>
                  <td style={{ ...S.td, textAlign: "center" }}>{r.active ? "✅ ใช้ได้" : "⏸ ปิดอยู่"}</td>
                  <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                    <button
                      style={S.mini}
                      disabled={busy}
                      onClick={() => call("PATCH", { email: r.email, active: !r.active }, r.active ? `⏸ ปิดสิทธิ์ ${r.email}` : `✅ เปิดสิทธิ์ ${r.email}`)}
                    >
                      {r.active ? "ปิดสิทธิ์" : "เปิดสิทธิ์"}
                    </button>{" "}
                    <button
                      style={S.mini}
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`ลบ ${r.email} ออกจากรายชื่อถาวร?`)) {
                          call("DELETE", { email: r.email }, `🗑 ลบ ${r.email} แล้ว`);
                        }
                      }}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { padding: "1rem 1.2rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 4%,transparent)" },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.7rem" },
  input: { fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", padding: "0.5rem 0.7rem", borderRadius: 6, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  btn: { fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: 6, border: "none", background: "var(--gold,#b8860b)", color: "#faf7f0", cursor: "pointer" },
  mini: { fontFamily: "var(--font-sans-thai)", fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: 5, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  th: { padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--gold-dim,#a89870)", color: "var(--text-dim,var(--ink-dim))", fontWeight: 600, fontSize: "0.75rem" },
  td: { padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)" },
  mono: { fontFamily: "var(--font-mono)", fontSize: "0.78rem" },
  note: { fontSize: "0.74rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.6 },
};
