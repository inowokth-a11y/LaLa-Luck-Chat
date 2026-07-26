"use client";

// กล่องความเห็นผู้ใช้ — เปิดกว้าง (พิมพ์อะไรก็ได้) + ให้ดาว + ตอบคำถามที่แอดมินตั้งไว้
// อ่านคำถาม active ด้วย anon (RLS อนุญาต) · ส่งผ่าน /api/feedback

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Prompt {
  id: number;
  question: string;
}

export default function FeedbackBox() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptId, setPromptId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("feedback_prompts")
      .select("id,question")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPrompts((data as Prompt[] | null) ?? []));
  }, []);

  async function submit() {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim(), rating: rating || undefined, promptId: promptId ?? undefined }),
      });
      const d = await res.json();
      if (d.error) setError(d.error);
      else {
        setDone(d.message ?? "ขอบคุณค่ะ 🙏");
        setMessage("");
        setRating(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) return <section style={S.box}><p style={{ color: "var(--gold)" }}>{done}</p></section>;

  if (!open) {
    return (
      <button type="button" style={S.toggle} onClick={() => setOpen(true)}>
        💬 บอกความเห็น / สิ่งที่อยากให้เพิ่ม (ฟรี ไม่เสียเครดิต)
      </button>
    );
  }

  return (
    <section style={S.box}>
      <h3 style={S.h3}>💬 บอกความเห็นกับเราหน่อยนะคะ</h3>
      <p style={{ fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))" }}>
        แสดงความเห็น<strong style={{ color: "var(--gold)" }}>ฟรี ไม่เสียเครดิต</strong>
        {prompts.length > 0 && <> · ล็อกอินแล้วตอบคำถามที่เราถาม (ครั้งแรกต่อคำถาม) รับ <strong style={{ color: "var(--gold)" }}>1 เครดิตฟรี</strong> 🎁</>}
      </p>

      {prompts.length > 0 && (
        <div style={S.chips}>
          <button type="button" style={{ ...S.chip, ...(promptId === null ? S.chipActive : {}) }} onClick={() => setPromptId(null)}>ความเห็นทั่วไป</button>
          {prompts.map((p) => (
            <button key={p.id} type="button" style={{ ...S.chip, ...(promptId === p.id ? S.chipActive : {}) }} onClick={() => setPromptId(p.id)}>{p.question}</button>
          ))}
        </div>
      )}

      <textarea
        style={S.textarea}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={promptId ? "ตอบคำถามด้านบน หรือเล่าอะไรก็ได้…" : "อยากได้ฟีเจอร์อะไรเพิ่ม? · ตรงไหนใช้ยาก? · ชอบอะไร? เล่าได้เลย"}
        maxLength={1000}
        rows={3}
        disabled={busy}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.15rem" }} aria-label="ให้คะแนน">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)} style={S.star} aria-label={`${n} ดาว`}>
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
        <button type="button" style={S.send} onClick={submit} disabled={busy || !message.trim()}>{busy ? "…" : "ส่งความเห็น"}</button>
      </div>
      {error && <p style={{ color: "var(--bad,#a83a1e)", fontSize: "0.8rem" }}>⚠️ {error}</p>}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  toggle: { alignSelf: "flex-start", fontFamily: "var(--font-sans-thai)", fontSize: "0.82rem", color: "var(--gold)", background: "color-mix(in srgb,var(--gold) 8%,transparent)", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 999, padding: "0.45rem 1rem", cursor: "pointer" },
  box: { display: "flex", flexDirection: "column", gap: "0.6rem", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1rem 1.1rem", background: "color-mix(in srgb,var(--gold) 5%,transparent)" },
  h3: { fontFamily: "var(--font-serif-thai)", fontSize: "1rem", color: "var(--gold)", margin: 0 },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  chip: { fontFamily: "var(--font-sans-thai)", fontSize: "0.78rem", padding: "0.35rem 0.8rem", borderRadius: 999, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  chipActive: { background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", borderColor: "var(--gold)" },
  textarea: { fontFamily: "var(--font-sans-thai)", fontSize: "0.9rem", padding: "0.6rem 0.9rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))", resize: "vertical" },
  star: { background: "none", border: "none", color: "var(--gold)", fontSize: "1.3rem", cursor: "pointer", padding: 0, lineHeight: 1 },
  send: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.85rem", padding: "0.5rem 1.3rem", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", cursor: "pointer" },
};
