"use client";

// กล่องแชท "อาจารย์ลาลา ลักกี้" ประจำฟังก์ชัน — ใช้ร่วมกันทุกหน้า LIFF
//
// รูปแบบ (ผู้ใช้ตัดสิน 2 ส.ค. 2569): **แชทลอยแบบ Messenger** — ปุ่มหัวแมวมุมขวาล่าง
// เปิดเป็นแผงโค้งมนซ้อนบนหน้า (ไม่ฝังท้ายหน้าแบบเดิมที่ผู้ใช้เลื่อนผ่านแล้วลืม)
// ใช้เฉพาะหน้า "ฟังก์ชัน" (profile/fortune/compat/fengshui/oracle) — หน้า /dream และ /chat
// เป็นแชทเต็มหน้าอยู่แล้ว ห้ามใส่ซ้อน (กติกาเดิม §13)
//
// โมเดลถังคำถามรวม (1 ส.ค. 2569 — lib/chat/questions.ts):
//  - ต้องล็อกอิน · คำถามฟรี 1 ข้อ (+โบนัสจากรางวัล) ใช้ร่วมกันทุกหน้า · หมดแล้วหักเครดิต 1/คำถาม
//  - เครดิตหมดด้วย → ปุ่ม "เติมเครดิต" พาไป /account
//  - Safety Gate ทำฝั่ง server — **ห้ามพ่วงปุ่ม/การตลาดตอนแสดงข้อความวิกฤต**

import { useEffect, useRef, useState } from "react";
import { useSyncStatus } from "@/app/_components/AuthStatus";
import styles from "./FunctionChat.module.css";
import { MascotAvatar } from "@/app/_components/MascotLogo";

interface Msg {
  role: "user" | "ai";
  text: string;
}

interface Props {
  logicId: number;
  /** ผลที่หน้าจอคำนวณได้ — ส่งให้ AI อ้างอิง ถ้าเป็น null จะไม่แสดงกล่องแชท */
  context: unknown;
  /** ข้อความชวนถาม ปรับตามแต่ละฟังก์ชัน */
  placeholder?: string;
  /** ข้อความชวนจากแม่หมอ — แสดงเป็น bubble ข้างปุ่มลอยก่อนเปิด และเป็นข้อความแรกในแผง */
  invite?: string;
}

export default function FunctionChat({ logicId, context, placeholder, invite }: Props) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<{ remaining: number; limit: number } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [topup, setTopup] = useState(false);
  const [crisis, setCrisis] = useState<string | null>(null);
  const [shareTeaser, setShareTeaser] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const syncStatus = useSyncStatus();

  // โหลดสถานะถัง/เครดิตตอนเปิดกล่อง — ให้ผู้ใช้เห็นทรัพยากรก่อนถาม
  useEffect(() => {
    let active = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.loggedIn) setNeedsLogin(true);
        else {
          setQuestions(d.questions);
          setCredits(d.credits);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // เลื่อนเธรดลงล่างสุดเมื่อมีข้อความใหม่ (พฤติกรรม messenger มาตรฐาน)
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, notice, shareTeaser, error]);

  if (context === null || context === undefined) return null;

  function show() {
    setOpen(true);
    setEverOpened(true);
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    setTopup(false);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ logicId, question, context }),
      });
      const d = await res.json();

      if (d.intercepted) {
        // ข้อความช่วยเหลือ — แสดงเดี่ยวๆ ไม่พ่วงอย่างอื่น และไม่คิดโควตา
        setCrisis(d.message);
      } else if (d.needsLogin) {
        setNeedsLogin(true);
      } else if (d.declined) {
        setNotice(d.message);
      } else if (d.quotaExceeded) {
        setNotice(d.message);
        setQuestions({ remaining: 0, limit: questions?.limit ?? 1 });
        if (typeof d.credits === "number") setCredits(d.credits);
        setTopup(true);
      } else if (d.error) {
        setError(d.error);
      } else {
        setMsgs((m) => [...m, { role: "ai", text: d.reply }]);
        if (d.questions) setQuestions(d.questions);
        if (typeof d.credits === "number") setCredits(d.credits);
        setShareTeaser(Boolean(d.shareTeaser));
        syncStatus(); // อัปเดตแถบสถานะมุมบนทันที
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const quotaLabel = needsLogin
    ? ""
    : questions === null
    ? ""
    : questions.remaining > 0
    ? `คำถามฟรี ${questions.remaining} ข้อ`
    : credits !== null && credits > 0
    ? `ใช้เครดิต (มี ${credits})`
    : "คำถามฟรีหมด";

  // ---- ปุ่มลอย (ปิดอยู่) ----
  if (!open) {
    return (
      <div className={styles.launcherWrap}>
        {invite && !everOpened && (
          <button type="button" className={styles.teaser} onClick={show}>
            🐾 {invite}
          </button>
        )}
        <button type="button" className={styles.launcher} onClick={show} aria-label="เปิดแชทถามอาจารย์ลาลา ลักกี้">
          <MascotAvatar size={40} />
        </button>
      </div>
    );
  }

  // ---- แผงแชท (เปิดอยู่) ----
  return (
    <section className={styles.panel} aria-label="แชทกับอาจารย์ลาลา ลักกี้">
      <div className={styles.head}>
        <MascotAvatar size={26} />
        <div className={styles.headText}>
          <span className={styles.title}>อาจารย์ลาลา ลักกี้</span>
          {quotaLabel && <span className={styles.quota}>{quotaLabel}</span>}
        </div>
        <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="ย่อแชท">
          ─
        </button>
      </div>

      {crisis ? (
        // วิกฤต: ข้อความช่วยเหลือเดี่ยวๆ — ไม่มี input ไม่มีปุ่มการตลาด (กติกา §13)
        <div className={styles.crisis}>{crisis}</div>
      ) : (
        <>
          <div className={styles.thread} ref={threadRef}>
            {invite && !needsLogin && <div className={styles.ai}>🐾 {invite}</div>}
            {!invite && msgs.length === 0 && !needsLogin && (
              <div className={styles.ai}>ถามเรื่องผลที่คำนวณได้บนหน้านี้ได้เลยค่ะ ลาลา~</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? styles.user : styles.ai}>
                {m.text}
              </div>
            ))}
            {busy && <div className={styles.ai}>กำลังคิด…</div>}
            {notice && <p className={styles.notice}>{notice}</p>}
            {shareTeaser && (
              <p className={styles.notice}>
                💡 คำถามฟรีหมดแล้ว — <a href="/profile" style={{ color: "var(--gold)" }}>แชร์การ์ดของคุณ</a> รับคำถามฟรีเพิ่ม +2 (ครั้งแรกครั้งเดียว)
              </p>
            )}
            {error && <p className={styles.error}>⚠️ {error}</p>}
          </div>

          {needsLogin ? (
            <a
              href={`/login?next=${typeof window !== "undefined" ? window.location.pathname : "/"}`}
              className={styles.cta}
            >
              เข้าสู่ระบบเพื่อรับคำถามฟรี →
            </a>
          ) : topup ? (
            <a href="/account" className={styles.cta}>
              ⭐ เติมเครดิตเพื่อถามต่อ →
            </a>
          ) : (
            <form onSubmit={ask} className={styles.form}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder ?? "ถามเกี่ยวกับผลนี้ได้เลย…"}
                maxLength={500}
                disabled={busy}
                className={styles.input}
              />
              <button type="submit" disabled={busy || !input.trim()} className={styles.send} aria-label="ส่งคำถาม">
                {busy ? "…" : "➤"}
              </button>
            </form>
          )}

          <p className={styles.hint}>
            คำถามฟรีใช้ร่วมกันทุกหน้า · หมดแล้วถามต่อด้วยเครดิต (1 เครดิต/คำถาม) ·
            AI ตอบจากผลที่คำนวณได้เท่านั้น
          </p>
        </>
      )}
    </section>
  );
}
