"use client";

// AI Chat แบบยืดหยุ่น (โหมด "แผน") — หน้าใช้งานจริงของ §16
//
// ผู้ใช้ถามอิสระ → AI เลือกฟังก์ชัน → engine คำนวณ → AI เล่า + กราฟ
// 🔴 หน้านี้ **แสดงผลอย่างเดียว** — ตัวเลข/กราฟ/caveat มาจาก server (engine) ไม่คำนวณเอง
//    Safety Gate ทำที่ server (app/api/chat/route.ts) ฝั่งนี้แค่แสดงข้อความช่วยเหลือ
//    (ห้ามพ่วงปุ่ม/การตลาดตอนแสดงข้อความวิกฤต — ตรงกับกฎ LINE webhook/FunctionChat)

import { useMemo, useState } from "react";
import Link from "next/link";
import ChartPanel, { type ChartData } from "../_components/ChartPanel";
import { useStoredProfile } from "../_components/useStoredProfile";
import FeedbackBox from "../_components/FeedbackBox";
import { MascotAvatar } from "@/app/_components/MascotLogo";
import { calculateElementSeed } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import styles from "./chat.module.css";

// โหมดในช่องแชทเดียว — เพิ่มฟังก์ชันใหม่ได้ด้วยการเติมในลิสต์นี้ (extensible ตามที่ออกแบบ)
//   active = ทำงานในช่องนี้เลย · link = ไปหน้าเต็ม (พิธีกรรม) · soon = กำลังมา
type Mode =
  | { key: string; label: string; icon: string; kind: "active" }
  | { key: string; label: string; icon: string; kind: "link"; href: string }
  | { key: string; label: string; icon: string; kind: "soon"; message: string };

const MODES: Mode[] = [
  { key: "chat", label: "แชท", icon: "💬", kind: "active" },
  { key: "oracle", label: "เสี่ยงทาย", icon: "🎴", kind: "link", href: "/oracle" },
  { key: "logo", label: "โลโก้", icon: "🎨", kind: "link", href: "/logo" },
  { key: "timing", label: "ฤกษ์", icon: "🗓️", kind: "link", href: "/timing" },
];

const ZODIAC_ANIMALS = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];
const zodiacAnimalFromYear = (y: number) => ZODIAC_ANIMALS[(((y - 2020) % 12) + 12) % 12];

/** ผลทำนายแรกจากวันเกิดที่บันทึกไว้ — ธาตุประจำตัว (คำนวณ client-side จาก engine ล้วน) */
function firstReading(birthDate?: string | null): { dominant_th: string; missing_th: string[] } | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = +birthDate.slice(0, 4), month = +birthDate.slice(5, 7), day = +birthDate.slice(8, 10);
  const now = new Date().getUTCFullYear();
  if (year < 1900 || year > now || month < 1 || month > 12 || day < 1 || day > 31) return null;
  try {
    const seed = calculateElementSeed({
      day_of_week: thaiDayOfWeek(birthDate),
      birth_month: month,
      birth_year_ad: year,
      birth_day: day,
      zodiac_year_animal: zodiacAnimalFromYear(year),
    });
    return { dominant_th: seed.dominant_th, missing_th: seed.missing_th };
  } catch {
    return null;
  }
}

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

/** เรนเดอร์ **ตัวหนา** ของ markdown ที่ narrator (gpt) มักส่งมา — ที่เหลือคงข้อความเดิม */
function renderReply(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
    seg.length > 4 && seg.startsWith("**") && seg.endsWith("**") ? (
      <strong key={i}>{seg.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{seg}</span>
    )
  );
}

export default function FlexibleChatPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(3);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ผลทำนายแรกจากข้อมูลที่กรอกไว้ (เฉพาะผู้ล็อกอิน+มีโปรไฟล์) — โชว์เหนือช่องแชท
  const { profile } = useStoredProfile();
  const reading = useMemo(() => firstReading(profile?.birth_date), [profile]);

  function pickMode(m: Mode) {
    if (m.kind === "soon") setEntries((e) => [...e, { kind: "note", text: m.message }]);
    // active = อยู่โหมดนี้แล้ว · link = เป็น <Link> อยู่แล้ว ไม่ต้องทำอะไรที่นี่
  }

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
      } else if (d.declined) {
        // นโยบายเลขเด็ด/หวย — แสดงเป็นโน้ต ไม่ใช่คำตอบ ไม่คิดโควตา
        setEntries((e) => [...e, { kind: "note", text: d.message }]);
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

  // กราฟล่าสุด — ใช้เฉพาะ "เวทีซ้าย" บนจอใหญ่ (desktop split-view §16)
  // เป็น data logic ไม่ใช่ logic แยกจอ — การสลับซ้าย-ขวา/แทรก ทำด้วย CSS media query ล้วน
  let latestChart: ChartData | undefined;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.kind === "ai" && e.chart) {
      latestChart = e.chart;
      break;
    }
  }

  return (
    <main className={`tone-marble ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>
          <MascotAvatar size={30} /> ถามอาจารย์ลาลา ลักกี้
        </h1>
        <p className={styles.sub}>
          ถามเรื่องเลขการ์ด · ทะเบียน/เบอร์โทร · เทียบธาตุของสิ่งของ — ระบบ<strong>คำนวณจริง</strong>ให้ ไม่ใช่การเดา
        </p>
        <span className={styles.quota}>
          {remaining === null ? `ช่วงทดลอง ถามได้ ${limit} คำถาม` : `เหลือ ${remaining}/${limit} คำถาม`}
        </span>
      </header>

      {reading && (
        <section className={styles.reading}>
          <span className={styles.readingLabel}>✦ ผลเบื้องต้นจากข้อมูลของคุณ</span>
          <p className={styles.readingMain}>
            ธาตุประจำตัว: <strong>{reading.dominant_th}</strong>
            {reading.missing_th.length > 0 && <span className={styles.readingDim}> · ธาตุที่ขาด {reading.missing_th.join(" / ")}</span>}
          </p>
          <p className={styles.readingHint}>ถามต่อในช่องแชทด้านล่างได้เลย เช่น &ldquo;ธาตุฉันเข้ากับสีอะไร&rdquo; หรือ &ldquo;ทะเบียน 88 เข้ากับฉันไหม&rdquo;</p>
        </section>
      )}

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

      <div className={styles.layout}>
        {/* เวทีกราฟซ้าย — แสดงเฉพาะจอ ≥1024 (CSS ซ่อนบนมือถือ) */}
        <aside className={styles.stage}>
          {latestChart ? (
            <ChartPanel chart={latestChart} />
          ) : (
            <p className={styles.stageEmpty}>กราฟเปรียบเทียบจะปรากฏที่นี่เมื่อคุณถามคำถามที่เทียบหลายรายการ</p>
          )}
        </aside>

        <section className={styles.conversation}>
          <div className={styles.thread}>
            {entries.map((entry, i) => {
              if (entry.kind === "user") return <div key={i} className={styles.user}>{entry.text}</div>;
              if (entry.kind === "crisis") return <div key={i} className={styles.crisis}>{entry.text}</div>;
              if (entry.kind === "note") return <div key={i} className={styles.note}>{entry.text}</div>;
              return (
                <div key={i} className={styles.aiBlock}>
                  {/* มือถือ: กราฟแทรกในคำตอบ · จอใหญ่: ซ่อน (ไปโชว์บนเวทีซ้ายแทน) */}
                  {entry.chart && (
                    <div className={styles.inlineChart}>
                      <ChartPanel chart={entry.chart} />
                    </div>
                  )}
                  <div className={styles.ai}>{renderReply(entry.reply)}</div>
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

          {/* ปุ่มสลับโหมด — ช่องแชทเดียว เลือกฟังก์ชัน (เพิ่มโหมดใหม่ได้จาก MODES) */}
          <nav className={styles.modes} aria-label="เลือกฟังก์ชัน">
            {MODES.map((m) =>
              m.kind === "link" ? (
                <Link key={m.key} href={m.href} className={styles.modeBtn}>
                  <span aria-hidden>{m.icon}</span> {m.label}
                </Link>
              ) : (
                <button
                  key={m.key}
                  type="button"
                  className={`${styles.modeBtn} ${m.kind === "active" ? styles.modeActive : ""}`}
                  onClick={() => pickMode(m)}
                  aria-current={m.kind === "active" ? "page" : undefined}
                >
                  <span aria-hidden>{m.icon}</span> {m.label}
                </button>
              )
            )}
          </nav>
        </section>
      </div>

      <p className={styles.foot}>
        ตัวเลขและกราฟทั้งหมดมาจากการคำนวณของ engine — AI ทำหน้าที่เลือกสูตรที่ใช้และเรียบเรียงเท่านั้น
        ไม่ได้แต่งตัวเลขเอง
      </p>

      <FeedbackBox />
    </main>
  );
}
