"use client";

// Logic 7 — ฮวงจุ้ย (ทิศ/รูปทรง/สี ของพื้นที่ เทียบธาตุประจำตัว)
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้านี้เป็น "ข้อมูล/ผลลัพธ์ถาวร"
//
// ⚠️ ไม่ใช้ Vision API — สเปกจริงเป็นฟอร์มกรอกข้อมูล (ดู lib/engine/fengshui.ts)

import { useMemo, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import { calculateElementSeed, THAI_LABEL_4, type Element4, type Element5, type ElementSeedResult } from "@/lib/engine/element";
import {
  analyzeFengShui,
  ALL_DIRECTIONS,
  COLOR_TO_ELEMENT,
  SHAPE_TO_ELEMENT,
  PURPOSE_LABELS,
  type Direction,
  type Purpose,
} from "@/lib/engine/fengshui";
import { relationColorVar } from "@/lib/engine/compatibility";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import styles from "./fengshui.module.css";
import FunctionChat from "../_components/FunctionChat";

const ZODIAC_ANIMALS = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];
const zodiacFromYear = (y: number) => ZODIAC_ANIMALS[(((y - 2020) % 12) + 12) % 12];

const COLORS = Object.keys(COLOR_TO_ELEMENT);
const SHAPES = Object.keys(SHAPE_TO_ELEMENT);

export default function FengShuiPage() {
  const [birthDate, setBirthDate] = useState("");
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [direction, setDirection] = useState<Direction>("เหนือ");
  const [purpose, setPurpose] = useState<Purpose>("bedroom");
  const [shape, setShape] = useState("");
  const [color, setColor] = useState("");

  const analysis = useMemo(() => {
    if (!seed) return null;
    return analyzeFengShui(seed.dominant as Element5, seed.missing as Element5[], {
      direction,
      shape: shape || null,
      color: color || null,
      purpose,
    });
  }, [seed, direction, shape, color, purpose]);

  function calcSelf(e: React.FormEvent) {
    e.preventDefault();
    setSeedError(null);
    const year = Number(birthDate.slice(0, 4));
    const month = Number(birthDate.slice(5, 7));
    const day = Number(birthDate.slice(8, 10));
    if (!year || !month || !day) return setSeedError("กรุณากรอกวันเกิดให้ครบ");
    // normalization layer: ข้อมูลจริงของ Platform D มี พ.ศ. ปนอยู่ (CLAUDE.md §8)
    if (year > 2400) return setSeedError("กรุณากรอกเป็น ค.ศ. (เช่น 1995) ไม่ใช่ พ.ศ.");
    setSeed(
      calculateElementSeed({
        day_of_week: thaiDayOfWeek(birthDate),
        birth_month: month,
        birth_year_ad: year,
        birth_day: day,
        zodiac_year_animal: zodiacFromYear(year),
      })
    );
  }

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1>ฮวงจุ้ยพื้นที่</h1>
        <p className={styles.sub}>
          ดูว่าทิศ รูปทรง และสีของพื้นที่ เข้ากับธาตุประจำตัวคุณไหม
          <br />
          พร้อมวิธีปรับแก้ตามหลักเบญจธาตุ
        </p>
      </header>

      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ธาตุของคุณ</h2>
        <form onSubmit={calcSelf}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.)</span>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={styles.input} required />
          </label>
          {seedError && <p className={styles.error}>{seedError}</p>}
          <button type="submit" className={styles.btn}>คำนวณธาตุของฉัน</button>
        </form>
        {seed && (
          <div className={styles.seedSummary}>
            <span className={styles.elemTag} style={{ background: `var(--${seed.dominant.toLowerCase()})` }}>
              {THAI_LABEL_4[seed.dominant]} (เด่น)
            </span>
            {seed.missing.map((m) => (
              <span key={m} className={styles.missingTag}>ขาด {THAI_LABEL_4[m as Element4]}</span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>2. พื้นที่ที่ต้องการดู</h2>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>ทิศที่หันไป</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className={styles.input}>
              {ALL_DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>ใช้ทำอะไร</span>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)} className={styles.input}>
              {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => (
                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>รูปทรงห้อง (ถ้าทราบ)</span>
            <select value={shape} onChange={(e) => setShape(e.target.value)} className={styles.input}>
              <option value="">— ไม่ระบุ —</option>
              {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>สีหลัก (ถ้าทราบ)</span>
            <select value={color} onChange={(e) => setColor(e.target.value)} className={styles.input}>
              <option value="">— ไม่ระบุ —</option>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {!seed && <p className={styles.note}>กรอกวันเกิดในข้อ 1 ก่อน แล้วผลจะขึ้นทันทีเมื่อเลือก</p>}
      </section>

      {analysis && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>3. ผลวิเคราะห์ — {PURPOSE_LABELS[purpose]}</h2>

          <ul className={styles.aspectList}>
            {analysis.aspects.map((a) => (
              <li key={a.aspect} className={styles.aspectItem}>
                <div className={styles.aspectHead}>
                  <span>{a.aspect} <b>{a.value}</b> — ธาตุ{a.element_th}</span>
                  <b className="num" style={{ color: relationColorVar(a.result) }}>
                    {a.result.final_score > 0 ? "+" : ""}{a.result.final_score}
                  </b>
                </div>
                <p className={styles.relation}>{a.result.relation_th}</p>
              </li>
            ))}
          </ul>

          <h3 className={styles.h3}>คำแนะนำ</h3>
          <ul className={styles.recList}>
            {analysis.recommendations.map((r, i) => (
              <li key={i} className={styles.recItem}>
                <b>{r.issue}</b>
                <span>{r.fix}</span>
              </li>
            ))}
          </ul>

          <div className={styles.dirBox}>
            <div>
              <span className={styles.dirLabel}>ทิศมงคลของคุณ</span>
              <div className={styles.dirTags}>
                {analysis.lucky_directions.map((d) => (
                  <span key={d.direction} className={`${styles.dirTag} ${styles.good}`}>
                    {d.direction} ({d.element_th})
                  </span>
                ))}
              </div>
            </div>
            {analysis.caution_directions.length > 0 && (
              <div>
                <span className={styles.dirLabel}>ทิศที่ควรระวัง</span>
                <div className={styles.dirTags}>
                  {analysis.caution_directions.map((d) => (
                    <span key={d.direction} className={`${styles.dirTag} ${styles.bad}`}>
                      {d.direction} ({d.element_th})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className={styles.note}>
            ⚠️ วิเคราะห์จากทิศ/รูปทรง/สีตามหลักเบญจธาตุเท่านั้น ยังไม่รวม “ดาวเหิน 9 ยุค”
            (Flying Stars) ซึ่งเป็นศาสตร์ฮวงจุ้ยอีกชั้นหนึ่ง
          </p>
        </section>
      )}
    
      {/* แชท AI ประจำฟังก์ชัน — ช่วงทดลองถามได้ 2 คำถาม (lib/chat/quota.ts) */}
      <FunctionChat logicId={7} context={analysis} placeholder="เช่น ถ้าย้ายโต๊ะไม่ได้ทำยังไงดี" />

    </div>
  );
}
