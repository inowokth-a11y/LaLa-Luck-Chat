"use client";

// AI Chat แบบยืดหยุ่น (โหมด "แผน") — หน้าใช้งานจริงของ §16
//
// ผู้ใช้ถามอิสระ → AI เลือกฟังก์ชัน → engine คำนวณ → AI เล่า + กราฟ
// 🔴 หน้านี้ **แสดงผลอย่างเดียว** — ตัวเลข/กราฟ/caveat มาจาก server (engine) ไม่คำนวณเอง
//    Safety Gate ทำที่ server (app/api/chat/route.ts) ฝั่งนี้แค่แสดงข้อความช่วยเหลือ
//    (ห้ามพ่วงปุ่ม/การตลาดตอนแสดงข้อความวิกฤต — ตรงกับกฎ LINE webhook/FunctionChat)

import { useState } from "react";
import ChartPanel, { type ChartData } from "../_components/ChartPanel";
import styles from "./chat.module.css";

interface AiEntry {
  kind: "ai";
  reply: string;
  chart?: ChartData;
  caveats: string[];
}
type Entry =
  | { kind: "user"; text: string }
  | AiEntry
  | { kind: "note"; text: string }
  | { kind: "crisis"; text: string };

const EXAMPLES = [
  "เลข 88 กับ 99 ทะเบียนไหนดีกว่ากัน",
  "เบอร์ 0812345678 เป็นเบอร์ที่ดีไหม",
  "เลข 7 หมายถึงอะไร",
];

export default function FlexibleChatPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(3);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    setEntries((e) => [...e, { kind: "user", text: question }]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "plan", question }),
      });
      const d = await res.json();

      if (d.intercepted) {
        setEntries((e) => [...e, { kind: "crisis", text: d.message }]);
      } else if (d.quotaExceeded) {
        setEntries((e) => [...e, { kind: "note", text: d.message }]);
        setRemaining(0);
        setExhausted(true);
      } else if (d.needsInput || d.unclear) {
        setEntries((e) => [...e, { kind: "note", text: d.message }]);
      } else if (d.error) {
        setError(d.error);
      } else {
        setEntries((e) => [...e, { kind: "ai", reply: d.reply, chart: d.chart ?? undefined, caveats: d.caveats ?? [] }]);
        if (typeof d.remaining === "number") setRemaining(d.remaining);
        if (typeof d.limit === "number") setLimit(d.limit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`tone-marble ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>ถามอาจารย์ลาลา</h1>
        <p className={styles.sub}>
          ถามเรื่องเลขการ์ด · ทะเบียน/เบอร์โทร · เทียบธาตุของสิ่งของ — ระบบ<strong>คำนวณจริง</strong>ให้ ไม่ใช่การเดา
        </p>
        <span className={styles.quota}>
          {remaining === null ? `ช่วงทดลอง ถามได้ ${limit} คำถาม` : `เหลือ ${remaining}/${limit} คำถาม`}
        </span>
      </header>

      {entries.length === 0 && (
        <div className={styles.examples}>
          <span className={styles.exLabel}>ลองถามดู:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className={styles.exChip} onClick={() => ask(ex)} disabled={busy}>
              {ex}
            </button>
          ))}
        </div>
      )}

      <div className={styles.thread}>
        {entries.map((entry, i) => {
          if (entry.kind === "user") return <div key={i} className={styles.user}>{entry.text}</div>;
          if (entry.kind === "crisis") return <div key={i} className={styles.crisis}>{entry.text}</div>;
          if (entry.kind === "note") return <div key={i} className={styles.note}>{entry.text}</div>;
          return (
            <div key={i} className={styles.aiBlock}>
              {entry.chart && <ChartPanel chart={entry.chart} />}
              <div className={styles.ai}>{entry.reply}</div>
              {entry.caveats.length > 0 && (
                <div className={styles.caveats}>
                  {entry.caveats.map((c, j) => (
                    <p key={j}>⚠️ {c}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {busy && <div className={styles.ai}>กำลังคำนวณและเรียบเรียง…</div>}
      </div>

      {error && <p className={styles.error}>⚠️ {error}</p>}

      {!exhausted && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            type="text"
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์คำถามของคุณ…"
            maxLength={500}
            disabled={busy}
          />
          <button type="submit" className={styles.send} disabled={busy || !input.trim()}>
            {busy ? "…" : "ถาม"}
          </button>
        </form>
      )}

      <p className={styles.foot}>
        ตัวเลขและกราฟทั้งหมดมาจากการคำนวณของ engine — AI ทำหน้าที่เลือกสูตรที่ใช้และเรียบเรียงเท่านั้น
        ไม่ได้แต่งตัวเลขเอง
      </p>
    </main>
  );
}
