"use client";

// ผู้ช่วย AI บนแดชบอร์ดแอดมิน — ปุ่ม "สรุปด้วย AI" + ช่องถามข้อมูลอิสระ
// เรียก /api/admin/chat (gate แอดมินที่ server) · AI ตอบจากข้อมูลจริงในแดชบอร์ด

import { useState } from "react";
import { SUMMARY_COMMAND } from "@/lib/admin/assistant";

interface Msg {
  role: "admin" | "ai";
  text: string;
}

/** เรนเดอร์ **ตัวหนา** ของ markdown */
function render(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((s, i) =>
    s.length > 4 && s.startsWith("**") && s.endsWith("**") ? <strong key={i}>{s.slice(2, -2)}</strong> : <span key={i}>{s}</span>
  );
}

export default function AdminAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    setMsgs((m) => [...m, { role: "admin", text: question }]);
    setInput("");
    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else setMsgs((m) => [...m, { role: "ai", text: d.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={S.card}>
      <h2 style={S.h2}>🤖 ผู้ช่วย AI (วิเคราะห์จากข้อมูลจริง)</h2>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
        <button type="button" style={S.primary} onClick={() => ask(SUMMARY_COMMAND)} disabled={busy}>
          {busy ? "…" : "สรุปด้วย AI + เสนอฟีเจอร์ถัดไป"}
        </button>
      </div>

      {msgs.length > 0 && (
        <div style={S.thread}>
          {msgs.map((m, i) => (
            <div key={i} style={m.role === "admin" ? S.admin : S.ai}>{render(m.text)}</div>
          ))}
          {busy && <div style={S.ai}>กำลังวิเคราะห์…</div>}
        </div>
      )}
      {error && <p style={{ color: "var(--bad,#a83a1e)", fontSize: "0.85rem" }}>⚠️ {error}</p>}

      <form
        style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          style={S.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ถามข้อมูล เช่น คำถามอะไรตอบไม่ได้บ่อยสุด · โมเดลไหนล่มบ่อย"
          maxLength={400}
          disabled={busy}
        />
        <button type="submit" style={S.send} disabled={busy || !input.trim()}>ถาม</button>
      </form>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { padding: "1rem 1.2rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 6%,transparent)" },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.7rem" },
  primary: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.85rem", padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
  thread: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  admin: { alignSelf: "flex-end", maxWidth: "85%", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", padding: "0.5rem 0.8rem", borderRadius: "10px 10px 2px 10px", fontSize: "0.85rem" },
  ai: { alignSelf: "flex-start", maxWidth: "92%", background: "color-mix(in srgb,var(--ink) 5%,transparent)", color: "var(--text,var(--ink))", padding: "0.6rem 0.9rem", borderRadius: "10px 10px 10px 2px", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  input: { flex: 1, fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", padding: "0.55rem 0.8rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  send: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.85rem", padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
};
