"use client";

// กล่องแชท AI ประจำฟังก์ชัน — ใช้ร่วมกันทั้ง 6 หน้า LIFF
//
// หลักการ:
//  - แสดงเฉพาะเมื่อมีผลลัพธ์แล้ว (ไม่มี context ให้ถามก็ไม่มีประโยชน์)
//  - บอกโควตาคงเหลือชัดเจนตั้งแต่ยังไม่ถาม ไม่ให้ผู้ใช้ถามไปแล้วค่อยรู้ว่าหมด
//  - Safety Gate ทำที่ฝั่ง server (app/api/chat/route.ts) — ฝั่งนี้แค่แสดงผล
//    **ห้ามพ่วงปุ่ม/การตลาดใดๆ ตอนแสดงข้อความวิกฤต** (ตรงกับกฎของ LINE webhook)

import { useState } from "react";
import styles from "./FunctionChat.module.css";

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
}

export default function FunctionChat({ logicId, context, placeholder }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(2);
  const [crisis, setCrisis] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (context === null || context === undefined) return null;

  const exhausted = remaining !== null && remaining <= 0;

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    setBusy(true);
    setError(null);
    setNotice(null);
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
      } else if (d.declined) {
        // นโยบายเลขเด็ด/หวย — แสดงเป็นโน้ต ไม่คิดโควตา
        setNotice(d.message);
      } else if (d.quotaExceeded) {
        setNotice(d.message);
        setRemaining(0);
      } else if (d.error) {
        setError(d.error);
      } else {
        setMsgs((m) => [...m, { role: "ai", text: d.reply }]);
        setRemaining(d.remaining);
        setLimit(d.limit);
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

  return (
    <section className={styles.box}>
      <div className={styles.head}>
        <h3 className={styles.title}>💬 ถามอาจารย์ลาลาต่อ</h3>
        <span className={styles.quota}>
          {remaining === null ? `ถามได้ ${limit} คำถาม` : `เหลือ ${remaining}/${limit} คำถาม`}
        </span>
      </div>

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

      {!exhausted && (
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
        ช่วงทดลอง ถามได้ฟังก์ชันละ {limit} คำถาม · AI ตอบจากผลที่คำนวณได้เท่านั้น ไม่ใช่คำทำนายเพิ่มเติม
      </p>
    </section>
  );
}
