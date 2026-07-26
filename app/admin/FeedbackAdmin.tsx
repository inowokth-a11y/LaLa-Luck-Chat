"use client";

// แอดมินจัดการ "คำถามความเห็น" ที่จะถามผู้ใช้ — เพิ่ม / เปิด-ปิด
// เรียก /api/admin/feedback-prompts (gate แอดมินที่ server)

import { useEffect, useState } from "react";

interface Prompt {
  id: number;
  question: string;
  active: boolean;
  created_at: string;
}

export default function FeedbackAdmin() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const d = await fetch("/api/admin/feedback-prompts").then((r) => r.json());
      if (d.prompts) setPrompts(d.prompts);
    } catch {
      /* เงียบ */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const d = await fetch("/api/admin/feedback-prompts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: input.trim() }),
      }).then((r) => r.json());
      if (d.error) setError(d.error);
      else {
        setInput("");
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p: Prompt) {
    await fetch("/api/admin/feedback-prompts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  }

  return (
    <section style={S.card}>
      <h2 style={S.h2}>คำถามความเห็นที่ถามผู้ใช้</h2>
      <p style={S.note}>ตั้งคำถามให้ผู้ใช้ตอบ (เช่น &ldquo;อยากได้โหมดไหนเพิ่ม?&rdquo;) — คนที่ล็อกอินตอบครั้งแรกต่อคำถาม รับ 1 เครดิต</p>

      <div style={{ display: "flex", gap: "0.5rem", margin: "0.6rem 0" }}>
        <input style={S.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="พิมพ์คำถามใหม่…" maxLength={200} disabled={busy} />
        <button style={S.add} onClick={add} disabled={busy || !input.trim()}>{busy ? "…" : "เพิ่ม"}</button>
      </div>
      {error && <p style={{ color: "var(--bad,#a83a1e)", fontSize: "0.8rem" }}>⚠️ {error}</p>}

      {prompts.length === 0 ? (
        <p style={S.note}>ยังไม่มีคำถาม</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {prompts.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0", borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)" }}>
              <span style={{ fontSize: "0.85rem", opacity: p.active ? 1 : 0.5 }}>{p.question}</span>
              <button style={{ ...S.toggle, color: p.active ? "var(--good,#2f6b3f)" : "var(--text-dim,#6b6255)" }} onClick={() => toggle(p)}>
                {p.active ? "● เปิด" : "○ ปิด"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { padding: "1rem 1.2rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 4%,transparent)" },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.4rem" },
  note: { fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  input: { flex: 1, fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", padding: "0.5rem 0.8rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  add: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.85rem", padding: "0.5rem 1.1rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
  toggle: { background: "none", border: "none", fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" },
};
