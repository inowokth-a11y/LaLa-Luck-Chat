"use client";

// Logic 21 — เสี่ยงทายวงแหวนคู่ — โทน 🌑 มืด ตาม CLAUDE.md §2 (พิธีกรรม)
//
// ปรับตาม legacy-artifacts/oracle_dual_ring.html (ผู้ใช้สั่ง 19 ก.ค. 2569):
//   ตั้งคำถาม → กรอกวันเกิด → ผูกเลเยอร์ (ไม่บังคับ)
//   → รอบที่ 1 หมุนวงแหวน = การ์ดของ "ตัวคุณ"
//   → รอบที่ 2 หมุนวงแหวน = การ์ดของ "เรื่องที่ถาม"
//   → ตีความรวม
//
// ⚠️ การสุ่มอยู่ที่มือผู้ถาม ไม่ใช่ที่ server — เดิม API เป็นคนสุ่มให้ ซึ่งผิดเจตนาพิธีกรรม

import { useMemo, useState } from "react";
import { calculateElementSeed, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import { LAYER_LABEL, type BoundLayers, type LayerType, type CombinedReading } from "@/lib/engine/oracle";
import { cardImageUrl } from "@/lib/cards";
import DualRing from "./DualRing";
import CardReveal from "./CardReveal";
import styles from "./oracle.module.css";

const ZODIAC = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];
const zodiacFromYear = (y: number) => ZODIAC[(((y - 2020) % 12) + 12) % 12];

const LAYER_KEYS: LayerType[] = ["place", "vehicle", "organization", "other_person"];
const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

interface CardInfo {
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
}

type Phase = "setup" | "card1" | "card2" | "done";

export default function OraclePage() {
  const [question, setQuestion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [layers, setLayers] = useState<BoundLayers>({});

  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState(0);
  const [card1, setCard1] = useState<string | null>(null);
  const [card2, setCard2] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [reading, setReading] = useState<CombinedReading | null>(null);
  const [cards, setCards] = useState<Record<string, CardInfo | null>>({});
  const [via, setVia] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [crisis, setCrisis] = useState<string | null>(null);
  /** การ์ดที่กำลังเปิดโชว์แบบเต็มจอ — null = ไม่มี overlay */
  const [revealing, setRevealing] = useState<{ id: string; next: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState<string | null>(null);

  // ธาตุของผู้ถาม — คำนวณจากวันเกิดด้วย engine ตัวจริง (ไม่ใช่สูตรย่อใน HTML เดิม)
  const seed = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const y = Number(birthDate.slice(0, 4));
    if (y > 2400 || y < 1900) return null;
    return calculateElementSeed({
      day_of_week: thaiDayOfWeek(birthDate),
      birth_month: Number(birthDate.slice(5, 7)),
      birth_year_ad: y,
      birth_day: Number(birthDate.slice(8, 10)),
      zodiac_year_animal: zodiacFromYear(y),
    });
  }, [birthDate]);

  const canStart = question.trim().length > 0 && seed !== null;

  function start() {
    setError(null);
    setNeedsLogin(null);
    setCrisis(null);
    setReply(null);
    setReading(null);
    setCard1(null);
    setCard2(null);
    setPhase("card1");
    setRound((n) => n + 1);
  }

  function onRingComplete(cardId: string) {
    // เปิดการ์ดให้ดูเต็มจอก่อน แล้วค่อยไปขั้นถัดไปเมื่อผู้ใช้แตะปิด
    if (phase === "card1") {
      setCard1(cardId);
      setRevealing({
        id: cardId,
        next: () => {
          setPhase("card2");
          setRound((n) => n + 1); // สลับเลขใหม่สำหรับรอบสอง
        },
      });
    } else if (phase === "card2") {
      setCard2(cardId);
      setRevealing({
        id: cardId,
        next: () => {
          setPhase("done");
          void interpret(card1!, cardId);
        },
      });
    }
  }

  async function interpret(c1: string, c2: string) {
    setLoading(true);
    setError(null);
    setNeedsLogin(null);
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          card1Id: c1,
          card2Id: c2,
          dominant: seed?.dominant,
          missing: seed?.missing,
          dayOfWeek: birthDate ? thaiDayOfWeek(birthDate) : "",
          boundLayers: layers,
        }),
      });
      const d = await res.json();
      if (d.intercepted) setCrisis(d.message);
      else if (d.needsLogin) setNeedsLogin(d.error); // gate ต้นทุน 30 ก.ค. 2569
      else if (d.quotaExceeded) setError(d.message);
      else if (d.error) setError(d.error);
      else {
        setReply(d.reply);
        setReading(d.reading);
        setCards(d.cards ?? {});
        setVia(d.via);
        if (typeof d.remaining === "number") setRemaining(d.remaining);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleLayer(k: LayerType) {
    setLayers((L) => {
      const next = { ...L };
      if (k in next) delete next[k];
      else next[k] = {};
      return next;
    });
  }

  if (crisis) {
    // ข้อความช่วยเหลือ — แสดงเดี่ยวๆ ไม่พ่วงปุ่มหรือการตลาดใดๆ
    return (
      <main className={`tone-night ${styles.page}`}>
        <section className={styles.panel}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{crisis}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`tone-night ${styles.page}`}>
      {revealing && (
        <CardReveal
          cardId={revealing.id}
          onClose={() => {
            const go = revealing.next;
            setRevealing(null);
            go();
          }}
        />
      )}

      <header className={styles.header}>
        <h1>เสี่ยงทาย</h1>
        <p className={styles.sub}>
          ตั้งคำถาม → หมุนวงแหวน 2 รอบ → ตีความ
          <br />
          {remaining === null ? "ช่วงทดลอง เสี่ยงทายได้ 2 ครั้ง" : `เหลือ ${remaining}/2 ครั้ง`}
        </p>
      </header>

      {/* ---- ตั้งค่า ---- */}
      {phase === "setup" && (
        <section className={styles.panel}>
          <label className={styles.field}>
            <span>1. คำถามของคุณ</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="เช่น ปีนี้ควรเปลี่ยนงานไหม"
              className={styles.input}
              maxLength={300}
            />
          </label>

          <label className={styles.field}>
            <span>2. วันเกิดของคุณ (ค.ศ.)</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.input}
            />
          </label>

          {seed && (
            <p className={styles.componentDetail}>
              ธาตุเด่นของคุณ: <b>{THAI_LABEL_5[seed.dominant as Element5]}</b>
              {seed.missing.length > 0 && ` · ขาด ${seed.missing.map((m) => THAI_LABEL_5[m as Element5]).join(", ")}`}
            </p>
          )}

          <div className={styles.field}>
            <span>3. ผูกสิ่งรอบตัว (ไม่บังคับ)</span>
            <div className={styles.pills}>
              {LAYER_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleLayer(k)}
                  className={`${styles.pill} ${k in layers ? styles.pillOn : ""}`}
                >
                  {LAYER_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          {LAYER_KEYS.filter((k) => k in layers).map((k) => (
            <label key={k} className={styles.field}>
              <span>{LAYER_LABEL[k]}</span>
              {k === "other_person" ? (
                <select
                  className={styles.input}
                  value={layers[k]?.day ?? ""}
                  onChange={(e) => setLayers((L) => ({ ...L, [k]: { day: e.target.value } }))}
                >
                  <option value="">เลือกวันเกิดของเขา</option>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input
                  className={styles.input}
                  type="number"
                  placeholder="เลขอ้างอิง เช่น บ้านเลขที่ / ทะเบียน"
                  value={layers[k]?.number ?? ""}
                  onChange={(e) => setLayers((L) => ({ ...L, [k]: { number: e.target.value } }))}
                />
              )}
            </label>
          ))}

          <button type="button" className={styles.spinAll} disabled={!canStart} onClick={start}>
            {canStart ? "เริ่มเสี่ยงทาย" : "กรอกคำถามและวันเกิดก่อน"}
          </button>
        </section>
      )}

      {/* ---- วงแหวน ---- */}
      {(phase === "card1" || phase === "card2") && (
        <section className={styles.panel}>
          <p className={styles.phase}>
            {phase === "card1"
              ? "🎴 รอบที่ 1 — หมุนเพื่อดูการ์ดของ “ตัวคุณ”"
              : "🎴 รอบที่ 2 — หมุนเพื่อดูการ์ดของ “เรื่องที่ถาม”"}
          </p>
          {card1 && phase === "card2" && (
            <p className={styles.componentDetail} style={{ textAlign: "center" }}>
              ใบที่ 1 ได้เลข <b>{card1}</b> แล้ว
            </p>
          )}
          <DualRing round={round} onComplete={onRingComplete} />
        </section>
      )}

      {/* ---- ผลลัพธ์ ---- */}
      {phase === "done" && (
        <section className={styles.panel}>
          <div className={styles.cardPair}>
            {[{ id: card1, label: "ใบที่ 1 · ตัวคุณ" }, { id: card2, label: "ใบที่ 2 · เรื่องที่ถาม" }].map((c) => (
              <div key={c.label} className={styles.miniCard}>
                <div className={styles.miniLabel}>{c.label}</div>
                {c.id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardImageUrl(c.id)} alt="" width={64} height={90} style={{ objectFit: "contain" }} />
                )}
                <div className={styles.miniId}>{c.id}</div>
                <div className={styles.miniName}>{c.id ? cards[c.id]?.energy_name ?? "" : ""}</div>
              </div>
            ))}
          </div>

          {loading && <p className={styles.phase}>กำลังตีความ…</p>}
          {error && <p style={{ color: "var(--bad, #a83a1e)" }}>⚠️ {error}</p>}
          {needsLogin && (
            <p>
              {needsLogin}{" "}
              <a
                href="/login?next=/oracle"
                style={{
                  display: "inline-block", marginTop: "0.4rem", padding: "0.45rem 1rem",
                  border: "1px solid var(--gold-dim, #a89870)", borderRadius: 8,
                  color: "var(--gold)", textDecoration: "none", fontSize: "0.85rem",
                }}
              >
                เข้าสู่ระบบ / สมัครฟรี →
              </a>
            </p>
          )}

          {reading && (
            <>
              <div className={styles.aggBox}>
                <div className={styles.aggNum}>{reading.aggregate} / 100</div>
                <div className={styles.aggLabel}>{reading.label}</div>
              </div>
              <ul className={styles.componentList}>
                {reading.components.map((c) => (
                  <li key={c.component}>
                    <div className={styles.componentItem}>
                      <span>{c.component}</span>
                      <span>
                        {c.score > 0 ? "+" : ""}
                        {c.score} × {c.weight}
                      </span>
                    </div>
                    <div className={styles.componentDetail}>{c.detail}</div>
                  </li>
                ))}
              </ul>
              <p className={styles.ringHint}>
                ⚠️ คะแนนรวมเป็นตัวช่วยอ่านภาพรวมที่ออกแบบขึ้นเอง ไม่มีในตำรา — ให้ดูรายองค์ประกอบประกอบเสมอ
              </p>
            </>
          )}

          {reply && (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85, marginTop: "1rem" }}>{reply}</div>
          )}
          {via && <p className={styles.ringHint}>ตีความโดย {via}</p>}

          <button
            type="button"
            className={styles.spinAll}
            onClick={() => {
              setPhase("setup");
              setCard1(null);
              setCard2(null);
              setReply(null);
              setReading(null);
            }}
          >
            เสี่ยงทายใหม่
          </button>
        </section>
      )}
    </main>
  );
}
