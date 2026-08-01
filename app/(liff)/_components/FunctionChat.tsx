"use client";

// กล่องแชท "อาจารย์ลาลา ลักกี้" ประจำฟังก์ชัน — ใช้ร่วมกันทุกหน้า LIFF
//
// โมเดลถังคำถามรวม (1 ส.ค. 2569 — lib/chat/questions.ts):
//  - ต้องล็อกอิน · คำถามฟรี 1 ข้อ (+โบนัสจากรางวัล) ใช้ร่วมกันทุกหน้า · หมดแล้วหักเครดิต 1/คำถาม
//  - เครดิตหมดด้วย → ปุ่ม "เติมเครดิต" พาไป /account
//  - Safety Gate ทำฝั่ง server — **ห้ามพ่วงปุ่ม/การตลาดตอนแสดงข้อความวิกฤต**

import { useEffect, useState } from "react";
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
  /** ข้อความชวนจากแม่หมอตอนกล่องเปิด (ใช้ตอน onboarding พาเข้าการ์ดใบแรก) */
  invite?: string;
}

export default function FunctionChat({ logicId, context, placeholder, invite }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<{ remaining: number; limit: number } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [topup, setTopup] = useState(false);
  const [crisis, setCrisis] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  if (context === null || context === undefined) return null;

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
        syncStatus(); // อัปเดตแถบสถานะมุมบนทันที
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (crisis) {
    return (
      <section className={styles.crisis}>
        <p>{crisis}</p>
      </section>
    );
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

  return (
    <section className={styles.box}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          <MascotAvatar size={22} /> ถามอาจารย์ลาลา ลักกี้
        </h3>
        {quotaLabel && <span className={styles.quota}>{quotaLabel}</span>}
      </div>

      {invite && msgs.length === 0 && !needsLogin && (
        <p className={styles.notice}>🐾 {invite}</p>
      )}

      {msgs.length > 0 && (
        <div className={styles.thread}>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? styles.user : styles.ai}>
              {m.text}
            </div>
          ))}
          {busy && <div className={styles.ai}>กำลังคิด…</div>}
        </div>
      )}

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && <p className={styles.error}>⚠️ {error}</p>}

      {needsLogin ? (
        <a href={`/login?next=${typeof window !== "undefined" ? window.location.pathname : "/"}`} className={styles.send} style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}>
          เข้าสู่ระบบเพื่อรับคำถามฟรี →
        </a>
      ) : topup ? (
        <a href="/account" className={styles.send} style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}>
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
          <button type="submit" disabled={busy || !input.trim()} className={styles.send}>
            {busy ? "…" : "ถาม"}
          </button>
        </form>
      )}

      <p className={styles.hint}>
        คำถามฟรีใช้ร่วมกันทุกหน้า · หมดแล้วถามต่อได้ด้วยเครดิต (1 เครดิต/คำถาม) ·
        AI ตอบจากผลที่คำนวณได้เท่านั้น ไม่ใช่คำทำนายเพิ่มเติม
      </p>
    </section>
  );
}
