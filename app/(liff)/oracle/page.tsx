"use client";

// Logic 21 — เสี่ยงทายผูกบริบท — โทน 🌑 มืด ตาม CLAUDE.md §2 (พิธีกรรม)
// ขั้นตอนตาม oracle_dual_ring.html: ตั้งคำถาม → เลือกเลเยอร์ → หมุน → ตีความ

import { useState } from "react";
import { cardImageUrl } from "@/lib/cards";
import styles from "./oracle.module.css";

const LAYERS = [
  { key: "self", label: "ตัวคุณเอง" },
  { key: "place", label: "สถานที่" },
  { key: "vehicle", label: "ยานพาหนะ" },
  { key: "organization", label: "องค์กร/กิจการ" },
  { key: "other_person", label: "บุคคลอื่น" },
] as const;

const ELEMENTS = [
  { key: "Wood", label: "ไม้" },
  { key: "Fire", label: "ไฟ" },
  { key: "Earth", label: "ดิน" },
  { key: "Metal", label: "ทอง" },
  { key: "Water", label: "น้ำ" },
] as const;

interface Relation {
  relation_th: string;
  final_score: number;
  productive_clash: boolean;
}
interface Draw {
  cardId: string;
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
  oracleElementTh: string;
  layerLabel: string;
  relation: Relation | null;
}

export default function OraclePage() {
  const [question, setQuestion] = useState("");
  const [layer, setLayer] = useState<string>("self");
  const [layerElement, setLayerElement] = useState<string>("");
  const [spinning, setSpinning] = useState(false);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [via, setVia] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    if (!question.trim() || spinning) return;
    setSpinning(true);
    setDraw(null);
    setReply(null);
    setCrisis(null);
    setError(null);

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question,
          layer,
          layerElement: layerElement || null,
          missingElements: [],
        }),
      });
      const d = await res.json();

      if (d.intercepted) setCrisis(d.message);
      else if (d.error) setError(d.error);
      else {
        setDraw(d.draw);
        setReply(d.reply);
        setVia(d.via);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSpinning(false);
    }
  }

  return (
    <main className={`tone-night ${styles.page}`}>
      <header className={styles.header}>
        <h1>เสี่ยงทาย</h1>
        <p className={styles.sub}>ตั้งคำถาม → ผูกเลเยอร์ → หมุนวงแหวน</p>
      </header>

      <section className={styles.panel}>
        <label className={styles.field}>
          <span>1. คำถามของคุณ</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="เช่น ปีนี้ควรเปลี่ยนงานไหม"
            className={styles.input}
          />
        </label>

        <div className={styles.field}>
          <span>2. เรื่องนี้เกี่ยวกับอะไร (เลเยอร์)</span>
          <div className={styles.pills}>
            {LAYERS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLayer(l.key)}
                className={`${styles.pill} ${layer === l.key ? styles.pillOn : ""}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span>3. ธาตุของสิ่งนั้น (ถ้าทราบ — ใช้เทียบความสัมพันธ์)</span>
          <div className={styles.pills}>
            <button
              type="button"
              onClick={() => setLayerElement("")}
              className={`${styles.pill} ${layerElement === "" ? styles.pillOn : ""}`}
            >
              ไม่ทราบ
            </button>
            {ELEMENTS.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => setLayerElement(e.key)}
                className={`${styles.pill} ${layerElement === e.key ? styles.pillOn : ""}`}
                style={layerElement === e.key ? { borderColor: `var(--${e.key.toLowerCase()})` } : undefined}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={spin} className={styles.spin} disabled={spinning || !question.trim()}>
          {spinning ? "🔮 กำลังหมุน…" : "🔮 หมุนวงแหวน"}
        </button>

        {error && <p className={styles.error}>⚠️ {error}</p>}
      </section>

      {crisis && (
        <section className={`${styles.panel} ${styles.crisis}`}>
          <p className={styles.text}>{crisis}</p>
        </section>
      )}

      {draw && (
        <>
          <section className={styles.panel}>
            <div className={styles.cardWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardImageUrl(draw.cardId)} alt={draw.energy_name ?? draw.cardId} className={styles.cardImg} />
              <div className={styles.cardId}>{draw.cardId}</div>
              <div className={styles.cardName}>{draw.energy_name}</div>
              {draw.archetype_figure && <div className={styles.figure}>ต้นแบบ: {draw.archetype_figure}</div>}
            </div>

            <dl className={styles.details}>
              <div>
                <dt>ธาตุของคำเสี่ยงทาย</dt>
                <dd>{draw.oracleElementTh}</dd>
              </div>
              <div>
                <dt>ผูกกับ</dt>
                <dd>{draw.layerLabel}</dd>
              </div>
              {draw.relation && (
                <div className={styles.full}>
                  <dt>ความสัมพันธ์ของธาตุ</dt>
                  <dd
                    style={{
                      color:
                        draw.relation.final_score > 0
                          ? "var(--wood)"
                          : draw.relation.final_score < 0
                          ? "var(--fire)"
                          : "var(--ink)",
                    }}
                  >
                    {draw.relation.relation_th} ({draw.relation.final_score > 0 ? "+" : ""}
                    {draw.relation.final_score})
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {reply && (
            <section className={styles.panel}>
              <h2 className={styles.h2}>คำตีความ</h2>
              <p className={styles.text}>{reply}</p>
              {via && <div className={styles.via}>ตอบโดย {via}</div>}
            </section>
          )}
        </>
      )}
    </main>
  );
}
