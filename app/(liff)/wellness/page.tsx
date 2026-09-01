"use client";

// อาหาร + กิจกรรมตามธาตุ (Logic 12 อาหาร/สุขภาพ + Logic 16 กิจกรรม — ห้ามโชว์คำว่า "Logic" ให้ผู้ใช้เห็น)
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้าข้อมูล/ผลลัพธ์ถาวร
// ฿0 ทั้งหน้า — engine ล้วน (TTM_LIFESTYLE + wellness engine ที่ผ่าน golden test) ไม่แตะ AI
//
// ⚠️ กรอบการนำเสนอ (lib/engine/wellness.ts): เฟรมเป็น "เหมาะกับพลังงาน" ไม่ใช่ "รักษา"
//    FRAMING_CAVEAT ต้องแสดงเสมอ — ห้ามตัดออก

import { useEffect, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import {
  calculateElementSeed,
  TTM_LIFESTYLE,
  THAI_LABEL_4,
  type Element4,
  type ElementSeedResult,
} from "@/lib/engine/element";
import { getWellnessPair, FRAMING_CAVEAT, type WellnessActivity } from "@/lib/engine/wellness";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import { useStoredProfile } from "../_components/useStoredProfile";
import styles from "./wellness.module.css";
import IdentityLensNote from "../_components/IdentityLensNote";

const ZODIAC_ANIMALS = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];
const zodiacFromYear = (y: number) => ZODIAC_ANIMALS[(((y - 2020) % 12) + 12) % 12];

/** สี CSS variable ของธาตุ (มีใน .tone-marble แล้ว — ห้าม hardcode hex) */
const elemVar = (el: string) => `var(--${el.toLowerCase()})`;

type Pair = WellnessActivity & { element: string; caveat: string };
const pairOf = (el: string): Pair | null => {
  const p = getWellnessPair(el);
  return "error" in p ? null : p;
};

export default function WellnessPage() {
  const { profile } = useStoredProfile();
  const [birthDate, setBirthDate] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // เติมจากบัญชีเฉพาะช่องที่ยังว่าง — ไม่ทับที่ผู้ใช้พิมพ์เอง (แพทเทิร์นเดียวกับ /profile)
  useEffect(() => {
    if (profile?.birth_date && !birthDate) {
      setBirthDate(profile.birth_date);
      setPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function calc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const year = Number(birthDate.slice(0, 4));
    const month = Number(birthDate.slice(5, 7));
    const day = Number(birthDate.slice(8, 10));
    if (!year || !month || !day) return setError("กรุณากรอกวันเกิดให้ครบ");
    // normalization layer: กัน พ.ศ. (บทเรียนข้อมูลจริง Platform D — CLAUDE.md §8)
    if (year > 2400) return setError("กรุณากรอกเป็น ค.ศ. (เช่น 1995) ไม่ใช่ พ.ศ.");
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

  const missing = (seed?.missing ?? []) as Element4[];

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1>อาหาร & กิจกรรมตามธาตุ</h1>
        <p className={styles.sub}>
          ดูรสอาหาร สี และกิจวัตรสุขภาวะที่เข้ากับสมดุลธาตุของคุณ
          <br />
          คำนวณจากวันเกิดจริงตามตำราธาตุเจ้าเรือน ไม่ใช้ AI
        </p>
      </header>

      <IdentityLensNote mode="wellness" />

      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ธาตุของคุณ</h2>
        <form onSubmit={calc}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.)</span>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={styles.input} required />
          </label>
          {prefilled && <p className={styles.note}>✓ เติมข้อมูลจากบัญชีของคุณ</p>}
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn}>คำนวณธาตุของฉัน</button>
        </form>
        {seed && (
          <div className={styles.seedSummary}>
            <span className={styles.elemTag} style={{ background: elemVar(seed.dominant) }}>
              {THAI_LABEL_4[seed.dominant]} (เด่น)
            </span>
            {missing.map((m) => (
              <span key={m} className={styles.missingTag}>ขาด {THAI_LABEL_4[m]}</span>
            ))}
            {missing.length === 0 && <span className={styles.missingTag}>ธาตุครบทั้ง 4 — สมดุลดี</span>}
          </div>
        )}
      </section>

      {seed && missing.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>2. เติมพลังธาตุที่ขาด</h2>
          <p className={styles.empty}>
            ธาตุที่ขาดเติมได้จากรสอาหาร สี และกิจกรรมของธาตุนั้นๆ ตามหลักธาตุเจ้าเรือน
          </p>
          {missing.map((el) => (
            <ElementCard key={el} el={el} />
          ))}
        </section>
      )}

      {seed && missing.length === 0 && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>2. กิจวัตรเสริมธาตุเด่นของคุณ</h2>
          <p className={styles.empty}>
            ธาตุของคุณครบทั้ง 4 อยู่แล้ว — ไม่มีธาตุที่ต้องเติมเป็นพิเศษ
            ด้านล่างคือกิจวัตรที่เข้ากับพลังงานธาตุเด่น ไว้ใช้รักษาสมดุลเดิม
          </p>
          <ElementCard el={seed.dominant} />
        </section>
      )}

      {seed && <p className={styles.note}>⚠️ {FRAMING_CAVEAT}</p>}
    </div>
  );
}

/** การ์ดคำแนะนำของธาตุหนึ่ง — อาหาร (TTM) + กิจวัตร (wellness engine) */
function ElementCard({ el }: { el: Element4 }) {
  const ttm = TTM_LIFESTYLE[el];
  const pair = pairOf(el);
  return (
    <div className={styles.elCard} style={{ borderLeftColor: elemVar(el) }}>
      <h3 className={styles.elTitle}>
        ธาตุ{THAI_LABEL_4[el]}
      </h3>

      <div className={styles.kv}><span>รสอาหาร</span><b>{ttm.taste}</b></div>
      <div className={styles.kv}><span>อาหารแนะนำ</span><span>{ttm.food.join(" · ")}</span></div>
      <div className={styles.kv}><span>สีที่ช่วย</span><span>{ttm.color.join(" · ")}</span></div>
      <div className={styles.kv}><span>กิจกรรม</span><span>{ttm.activity.join(" · ")}</span></div>

      {pair && (
        <>
          <h4 className={styles.h3}>กิจวัตรสุขภาวะ</h4>
          <div className={styles.kv}>
            <span>เทคนิคภายใน</span>
            <span><b>{pair.internal.name}</b> ({pair.internal.tradition}) — {pair.internal.how_to}</span>
          </div>
          <div className={styles.kv}>
            <span>กิจกรรมภายนอก</span>
            <span><b>{pair.external.name}</b> — {pair.external.how_to}</span>
          </div>
          <div className={styles.kv}>
            <span>ช่วงเวลาที่เหมาะ</span>
            <span><b>{pair.best_time}</b> — {pair.time_reason}</span>
          </div>
          <div className={styles.routine}>🗓 กิจวัตรแนะนำ: {pair.combo_routine}</div>
          <p className={styles.research}>
            อ้างอิงงานวิจัย: {pair.internal.research} · {pair.external.research}
          </p>
        </>
      )}
    </div>
  );
}
