"use client";

// Logic 4 — ทำนายฝัน (chat) — โทน 🌑 มืด ตาม CLAUDE.md §2 (พิธีกรรม/โต้ตอบสด)
// เรียก /api/dream ซึ่งรัน Safety Gate → engine → AI-1 → AI-2 ฝั่ง server

import { useRef, useState } from "react";
import styles from "./dream.module.css";
import { MascotAvatar } from "@/app/_components/MascotLogo";

interface SymbolMatch {
  object: string;
  element: string;
  meaning: string;
}
interface Discovery {
  dream_object?: string;
  element?: string;
  meaning_keyword?: string;
}
interface Msg {
  who: "user" | "lala";
  text: string;
  intercepted?: boolean;
  /** true = แสดงปุ่มพาไปหน้า login ใต้ข้อความ */
  needsLogin?: boolean;
  /** true = แสดงปุ่มพาไปเติมเครดิต (/account) */
  needsTopup?: boolean;
  symbols?: SymbolMatch[];
  discovery?: Discovery | null;
  via?: string;
}

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export default function DreamPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: "lala", text: "ลาลา~ สวัสดีค่ะ เล่าความฝันเมื่อคืนให้อาจารย์ลาลา ลักกี้ฟังหน่อยได้ไหมคะ 🌙" },
  ]);
  const [input, setInput] = useState("");
  const [day, setDay] = useState("");
  const [deep, setDeep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMsgs((m) => [...m, { who: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/dream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dreamText: text, dayOfWeek: day || null, wantDeepReading: deep }),
      });
      const d = await res.json();

      if (d.intercepted) {
        setMsgs((m) => [...m, { who: "lala", text: d.message, intercepted: true }]);
      } else if (d.needsLogin) {
        // ต้องล็อกอินก่อน (gate ต้นทุน 30 ก.ค. 2569) — แสดงปุ่มพาไป login แล้วกลับมาหน้านี้
        setMsgs((m) => [...m, { who: "lala", text: d.error, needsLogin: true }]);
      } else if (d.quotaExceeded) {
        // โควตาหมด — บอกตรงๆ + ปุ่มเติมเครดิต (needsTopup ใช้ปุ่มเดียวกับ needsLogin แต่ชี้ /account)
        setMsgs((m) => [...m, { who: "lala", text: d.message, needsTopup: true }]);
        setRemaining(0);
      } else if (d.error) {
        setMsgs((m) => [...m, { who: "lala", text: `⚠️ ${d.error}` }]);
      } else {
        if (typeof d.remaining === "number") setRemaining(d.remaining);
        setMsgs((m) => [
          ...m,
          {
            who: "lala",
            text: d.reply,
            symbols: d.engine?.symbol_matches ?? [],
            discovery: d.discovery ?? null,
            via: d.via,
          },
        ]);
      }
    } catch (err) {
      setMsgs((m) => [...m, { who: "lala", text: `⚠️ เชื่อมต่อไม่ได้: ${String(err)}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <main className={`tone-night ${styles.page}`}>
      <header className={styles.header}>
        <h1>ทำนายฝัน</h1>
        <p className={styles.sub}>
          อาจารย์ลาลา ลักกี้ 🐾 · ฐานข้อมูล 457 สัญลักษณ์ + 50 ธีมจิตวิทยา
          <br />
          {remaining === null ? "ช่วงทดลอง ถามได้ 2 ครั้ง" : `เหลือ ${remaining}/2 ครั้ง`}
        </p>
      </header>

      <div className={styles.chat}>
        {msgs.map((m, i) => (
          <div key={i} className={m.who === "user" ? styles.rowUser : styles.rowBot}>
            {/* อวตารแม่หมอ — เว้นในข้อความ Safety Gate (สถานการณ์วิกฤตไม่ใส่มาสคоต) */}
            {m.who === "lala" && !m.intercepted && (
              <span style={{ marginRight: "0.45rem", alignSelf: "flex-end" }}>
                <MascotAvatar size={30} />
              </span>
            )}
            <div className={`${m.who === "user" ? styles.bubbleUser : styles.bubbleBot} ${m.intercepted ? styles.crisis : ""}`}>
              <p className={styles.text}>{m.text}</p>

              {m.symbols && m.symbols.length > 0 && (
                <div className={styles.chips}>
                  {m.symbols.map((s, j) => (
                    <span key={j} className={styles.chip} title={s.meaning}>
                      {s.object} · <b>{s.element}</b>
                    </span>
                  ))}
                </div>
              )}

              {m.discovery?.dream_object && (
                <div className={styles.discovery}>
                  🔎 ค้นพบใหม่: <b>{m.discovery.dream_object}</b> · ธาตุ{m.discovery.element}
                  <small> (รอมนุษย์ตรวจสอบก่อนเข้าฐานข้อมูลจริง)</small>
                </div>
              )}

              {m.needsTopup && (
                <a
                  href="/account"
                  style={{
                    display: "inline-block", marginTop: "0.5rem", padding: "0.45rem 1rem",
                    border: "1px solid var(--gold-dim, #a89870)", borderRadius: 8,
                    color: "var(--gold)", textDecoration: "none", fontSize: "0.85rem",
                  }}
                >
                  ⭐ เติมเครดิต →
                </a>
              )}
              {m.needsLogin && (
                <a
                  href="/login?next=/dream"
                  style={{
                    display: "inline-block", marginTop: "0.5rem", padding: "0.45rem 1rem",
                    border: "1px solid var(--gold-dim, #a89870)", borderRadius: 8,
                    color: "var(--gold)", textDecoration: "none", fontSize: "0.85rem",
                  }}
                >
                  เข้าสู่ระบบ / สมัครฟรี →
                </a>
              )}

              {m.via && <div className={styles.via}>ตอบโดย {m.via}</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className={styles.rowBot}>
            <span style={{ marginRight: "0.45rem", alignSelf: "flex-end" }}>
              <MascotAvatar size={30} />
            </span>
            <div className={styles.bubbleBot}>
              <span className={styles.typing}>อาจารย์ลาลา ลักกี้กำลังพิจารณา…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {remaining === 0 ? null : (
      <form onSubmit={send} className={styles.composer}>
        <div className={styles.opts}>
          <select value={day} onChange={(e) => setDay(e.target.value)} className={styles.select}>
            <option value="">วันที่ฝัน (ไม่ระบุ)</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>วัน{d}</option>
            ))}
          </select>
          <label className={styles.check}>
            <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
            คำทำนายลึก
          </label>
        </div>
        <div className={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="เล่าความฝันของคุณ…"
            className={styles.input}
            disabled={loading}
          />
          <button type="submit" className={styles.send} disabled={loading || !input.trim()}>
            ส่ง
          </button>
        </div>
      </form>
      )}
    </main>
  );
}
