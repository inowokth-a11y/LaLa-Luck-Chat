"use client";

// 💬 ความเห็นรายโหมด + เครดิตทดลอง (ผู้ใช้เคาะ 6 ก.ย. 2569)
// วงจร: ใช้โหมด → เล่าความเห็น → รับ 20 เครดิต → ลิงก์พาไปลองโหมดที่ยังไม่ได้ลอง
// anon → ชวนล็อกอิน (เหตุผลจับต้องได้: ให้ความเห็นแล้วได้เครดิตลองโหมดอื่นฟรี)
// ตรรกะสิทธิ์/กันฟาร์มอยู่ฝั่ง server ทั้งหมด (/api/feedback) — component แสดงผลอย่างเดียว

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { syncAuthStatus } from "@/app/_components/AuthStatus";

interface ModeInfo {
  labelTh: string;
  path: string;
  emoji: string;
}

export default function ModeFeedback({ logicId }: { logicId: number }) {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<{ id: number; question: string; reward: number } | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAnon, setIsAnon] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [untried, setUntried] = useState<ModeInfo[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/feedback?logicId=${logicId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.prompt) return;
        setPrompt(d.prompt);
        setLoggedIn(Boolean(d.loggedIn));
        setIsAnon(Boolean(d.isAnonymous));
        setClaimed(Boolean(d.claimed));
        setUntried(Array.isArray(d.untried) ? d.untried : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [logicId]);

  if (!prompt) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !text.trim() || !prompt) return;
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text.trim(), promptId: prompt.id }),
      });
      const d = await res.json();
      if (d.error) {
        setDoneMsg(`⚠️ ${d.error}`);
      } else {
        setDoneMsg(d.message ?? "ขอบคุณค่ะ 🙏");
        if (Array.isArray(d.suggestModes) && d.suggestModes.length) setUntried(d.suggestModes);
        setClaimed(true);
        setText("");
        if (d.rewardKind === "credits") syncAuthStatus(); // อัปเดตชิปเครดิตมุมขวาบน
      }
    } catch {
      setDoneMsg("⚠️ ส่งไม่สำเร็จ ลองอีกครั้งนะคะ");
    } finally {
      setBusy(false);
    }
  }

  const chips = untried.length > 0 && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.55rem" }}>
      {untried.map((m) => (
        <a key={m.path} href={m.path} style={S.chip}>
          {m.emoji} {m.labelTh}
        </a>
      ))}
    </div>
  );

  // anon / guest → ชวนล็อกอิน/ผูกบัญชี (ข้อความตามโครงรางวัล)
  if (!loggedIn || isAnon) {
    return (
      <section style={S.card}>
        <p style={S.head}>💬 ช่วงทดลองใช้ — ให้ความเห็นโหมดนี้ รับ {prompt.reward} เครดิตฟรี</p>
        <p style={S.dim}>
          {isAnon ? "ผูกบัญชีถาวร" : "เข้าสู่ระบบ"}แล้วเล่าความเห็นหลังลองใช้ รับเครดิตไปลองโหมดอื่นต่อได้เลยค่ะ
        </p>
        <a href={`/login?next=${encodeURIComponent(pathname ?? "/")}`} style={S.btn}>
          {isAnon ? "ผูกบัญชีถาวร รับเครดิตฟรี →" : "เข้าสู่ระบบ รับเครดิตฟรี →"}
        </a>
      </section>
    );
  }

  if (claimed) {
    return (
      <section style={S.card}>
        <p style={S.head}>💬 {doneMsg ?? "ขอบคุณสำหรับความเห็นโหมดนี้ค่ะ 🙏"}</p>
        {untried.length > 0 && (
          <>
            <p style={S.dim}>ลองโหมดอื่นแล้วเล่าความเห็น รับเครดิตเพิ่มได้อีกนะคะ:</p>
            {chips}
          </>
        )}
      </section>
    );
  }

  return (
    <section style={S.card}>
      <p style={S.head}>💬 {prompt.question}</p>
      <p style={S.dim}>เล่าความเห็นสั้นๆ รับ {prompt.reward} เครดิตไปลองโหมดอื่นฟรี (ครั้งเดียวต่อโหมด)</p>
      <form onSubmit={send} style={{ display: "flex", gap: "0.45rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เช่น ชอบส่วนไหน อยากให้ปรับอะไร ใช้แล้วรู้สึกอย่างไร…"
          rows={2}
          style={S.input}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !text.trim()} style={S.btn}>
          {busy ? "กำลังส่ง…" : "ส่งความเห็น 🎁"}
        </button>
      </form>
      {doneMsg && <p style={{ ...S.dim, marginTop: "0.45rem" }}>{doneMsg}</p>}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    margin: "1.1rem 0 0",
    padding: "0.85rem 1rem",
    borderRadius: 10,
    border: "1px solid var(--gold-dim, #a89870)",
    background: "var(--surface, #fffdf8)",
    color: "var(--text, #1d1812)",
    fontFamily: "var(--font-sans-thai), sans-serif",
  },
  head: { margin: 0, fontSize: "0.9rem", fontWeight: 600 },
  dim: { margin: "0.3rem 0 0", fontSize: "0.78rem", opacity: 0.8, lineHeight: 1.6 },
  input: {
    flex: "1 1 220px",
    fontFamily: "var(--font-sans-thai), sans-serif",
    fontSize: "0.85rem",
    padding: "0.5rem 0.7rem",
    borderRadius: 8,
    border: "1px solid var(--gold-dim, #a89870)",
    background: "var(--surface, #fff)",
    color: "var(--text, #1d1812)",
    resize: "vertical",
  },
  btn: {
    display: "inline-block",
    alignSelf: "flex-start",
    fontFamily: "var(--font-sans-thai), sans-serif",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "0.5rem 1rem",
    borderRadius: 8,
    border: "none",
    background: "var(--gold, #b8860b)",
    color: "#faf7f0",
    cursor: "pointer",
    textDecoration: "none",
    marginTop: "0.5rem",
  },
};
