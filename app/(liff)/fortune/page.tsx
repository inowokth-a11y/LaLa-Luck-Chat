"use client";

// Logic 8-11 — ดวงรายวัน / รายเดือน / รายปี / วันเกิด (ทักษาจร)
// พอร์ตจาก legacy-artifacts/fortune_dashboard.html — ใช้ engine ที่พอร์ตแล้วทั้งหมด
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — เป็นหน้า "ข้อมูล/ผลลัพธ์"
//
// ⚠️ ลัคนา (calculateLagna) ยังไม่เคย verify กับดวงจริง (CLAUDE.md §5) — หน้านี้แสดง caveat ไว้

import { useState } from "react";
import { calculateLagna } from "@/lib/engine/lagna";
import { dailyPrediction, getMoonSign } from "@/lib/engine/daily";
import { monthlyPrediction, yearlyPrediction, birthdayPrediction } from "@/lib/engine/transit";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import { PROVINCES, provinceByKey } from "@/lib/provinces";
import styles from "./fortune.module.css";

type Daily = ReturnType<typeof dailyPrediction>;
type Monthly = ReturnType<typeof monthlyPrediction>;
type Yearly = ReturnType<typeof yearlyPrediction>;
type Birthday = ReturnType<typeof birthdayPrediction>;

interface Result {
  lagna: string | null;
  sunrise: string;
  correctionMin: number;
  daily: Daily;
  monthly: Monthly;
  yearly: Yearly;
  birthday: Birthday;
  dayOfWeek: string;
}

const GRADE_COLOR: Record<string, string> = {
  A: "var(--good)", B: "var(--neutral)", C: "var(--clash)", D: "var(--bad)",
};

export default function FortunePage() {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [province, setProvince] = useState("bangkok");
  const [error, setError] = useState<string | null>(null);
  const [r, setR] = useState<Result | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const year = Number(birthDate.slice(0, 4));
      const month = Number(birthDate.slice(5, 7));
      const day = Number(birthDate.slice(8, 10));

      // defensive: กัน พ.ศ. ปนเข้ามา (บทเรียนจาก data-quality report)
      if (year > 2400) throw new Error(`ปีเกิดดูเป็น พ.ศ. (${year}) — กรุณากรอกเป็น ค.ศ. เช่น ${year - 543}`);
      const nowY = new Date().getUTCFullYear();
      if (year < 1900 || year > nowY) throw new Error(`ปีเกิด ${year} อยู่นอกช่วงที่รองรับ (1900-${nowY})`);

      const [hh, mm] = birthTime.split(":").map(Number);
      const p = provinceByKey(province);

      const lagnaRes = calculateLagna(
        { year, month, day, hour: hh, minute: mm },
        p.lat,
        p.lon,
        7
      );
      const lagna = lagnaRes.lagna_sign;
      if (!lagna) throw new Error("คำนวณลัคนาไม่สำเร็จ");

      const now = new Date();
      const today = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
      const dow = thaiDayOfWeek(birthDate);
      const moonSign = getMoonSign({ ...today, hour: now.getUTCHours(), minute: now.getUTCMinutes() });

      setR({
        lagna,
        sunrise: lagnaRes.true_sunrise_civil_time,
        correctionMin: lagnaRes.local_time_correction_min,
        dayOfWeek: dow,
        daily: dailyPrediction(lagna, moonSign, dow),
        monthly: monthlyPrediction(lagna, today),
        yearly: yearlyPrediction(lagna, today),
        birthday: birthdayPrediction({ year, month, day }, today, dow),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setR(null);
    }
  }

  return (
    <main className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <h1>ดวงของฉัน</h1>
        <p className={styles.sub}>คำนวณจากลัคนากำเนิด + ดาวจรวันนี้</p>
      </header>

      <form onSubmit={onSubmit} className={styles.panel}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.)</span>
            <input type="date" className="num" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>เวลาเกิด</span>
            <input type="time" className="num" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} required />
          </label>
        </div>
        <label className={styles.field}>
          <span>จังหวัดเกิด</span>
          <select value={province} onChange={(e) => setProvince(e.target.value)}>
            {PROVINCES.map((p) => (
              <option key={p.key} value={p.key}>{p.name}</option>
            ))}
          </select>
          <small className={styles.hint}>ใช้หาเวลาอาทิตย์ขึ้นจริง — จำเป็นต่อการคำนวณลัคนา</small>
        </label>
        <button type="submit" className={styles.submit}>🔮 คำนวณดวงทั้งหมด</button>
        {error && <p className={styles.error}>⚠️ {error}</p>}
      </form>

      {r && (
        <>
          {/* ---- Logic 8: รายวัน ---- */}
          <section className={styles.panel}>
            <h2 className={styles.h2}>วันนี้ (Logic 8)</h2>
            <div className={styles.luckNumber} style={{ color: r.daily.daily_luck_score >= 7 ? "var(--good)" : r.daily.daily_luck_score <= 3 ? "var(--bad)" : "var(--gold)" }}>
              {r.daily.daily_luck_score}<span className={styles.luckMax}>/10</span>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${r.daily.daily_luck_score * 10}%` }} />
            </div>
            <dl className={styles.details}>
              <div><dt>ลัคนา</dt><dd>{r.lagna}</dd></div>
              <div><dt>ดวงจันทร์วันนี้</dt><dd>{r.daily.moon_sign_today}</dd></div>
              <div className={styles.full}><dt>มุมสัมพันธ์</dt><dd>{r.daily.aspect}</dd></div>
            </dl>
            {r.daily.kalakini && (
              <div className={styles.flagBox}>
                <strong>กาลกิณี:</strong>{" "}
                {r.daily.kalakini.triggered === null
                  ? r.daily.kalakini.note
                  : r.daily.kalakini.triggered
                  ? `⚠️ ต้องระวัง — ดวงจันทร์อยู่ราศีของ${r.daily.kalakini.planet} (หัก 3 คะแนน)`
                  : `✅ ไม่กระทบ — ดาว${r.daily.kalakini.planet} ครองราศี ${r.daily.kalakini.ruled_signs?.join(", ")}`}
              </div>
            )}
          </section>

          {/* ---- Logic 9: รายเดือน ---- */}
          <section className={styles.panel}>
            <h2 className={styles.h2}>เดือนนี้ (Logic 9)</h2>
            <dl className={styles.details}>
              <div><dt>อาทิตย์อยู่ราศี</dt><dd>{r.monthly.sun_sign_this_month}</dd></div>
              <div><dt>ตกภพ</dt><dd>{r.monthly.house}</dd></div>
              <div className={styles.full}><dt>ธีมเดือนนี้</dt><dd>{r.monthly.month_theme}</dd></div>
            </dl>
            <div className={styles.flagBox} style={{ borderLeftColor: r.monthly.valence > 0 ? "var(--good)" : r.monthly.valence < 0 ? "var(--bad)" : "var(--neutral)" }}>
              {r.monthly.valence > 0 ? "🌤️ ภพเชิงบวก — เป็นช่วงเอื้ออำนวย" : r.monthly.valence < 0 ? "🌧️ ภพที่ต้องระวัง — เป็นช่วงทดสอบ" : "⛅ ภพกลางๆ — ไม่มีสัญญาณเด่นชัด"}
            </div>
          </section>

          {/* ---- Logic 10: รายปี ---- */}
          <section className={styles.panel}>
            <h2 className={styles.h2}>ปีนี้ (Logic 10)</h2>
            <div className={styles.grade} style={{ background: GRADE_COLOR[r.yearly.year_grade] }}>{r.yearly.year_grade}</div>
            <p className={styles.gradeLabel}>{r.yearly.year_label}</p>
            <dl className={styles.details}>
              <div><dt>พฤหัสบดีอยู่ราศี</dt><dd>{r.yearly.jupiter_sign} ({r.yearly.jupiter_relation})</dd></div>
              <div><dt>เสาร์อยู่ราศี</dt><dd>{r.yearly.saturn_sign} ({r.yearly.saturn_relation})</dd></div>
            </dl>
            <p className={styles.caveat}>⚠️ {r.yearly.caveat}</p>
          </section>

          {/* ---- Logic 11: ทักษาจร ---- */}
          {"taksa_jr" in r.birthday && (
            <section className={styles.panel}>
              <h2 className={styles.h2}>ทักษาจรปีนี้ (Logic 11)</h2>
              <dl className={styles.details}>
                <div><dt>อายุปีนี้</dt><dd className="num">{r.birthday.age} ปี</dd></div>
                <div><dt>บริวารจรปีนี้</dt><dd>{r.birthday.this_year_barivarn_planet}</dd></div>
                <div><dt>ดาวศรี (ดี)</dt><dd style={{ color: "var(--good)" }}>{r.birthday.sri_planet_this_year}</dd></div>
                <div><dt>ดาวกาลกิณี (ระวัง)</dt><dd style={{ color: "var(--bad)" }}>{r.birthday.kalakini_planet_this_year}</dd></div>
              </dl>
              <table className={styles.taksa}>
                <tbody>
                  {Object.entries(r.birthday.taksa_jr).map(([house, planet]) => (
                    <tr key={house}>
                      <td>{house}</td>
                      <td>{planet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ---- ที่มา / ข้อจำกัด ---- */}
          <section className={styles.panel}>
            <h2 className={styles.h2}>ที่มาของการคำนวณ</h2>
            <dl className={styles.details}>
              <div><dt>วันเกิด</dt><dd>วัน{r.dayOfWeek}</dd></div>
              <div><dt>อาทิตย์ขึ้น</dt><dd className="num">{r.sunrise} น.</dd></div>
              <div className={styles.full}><dt>ปรับเวลาท้องถิ่น</dt><dd className="num">{r.correctionMin} นาที</dd></div>
            </dl>
            <p className={styles.caveat}>
              ⚠️ อัลกอริทึมลัคนา (อันโตนาที) <strong>ยังไม่เคยตรวจสอบกับดวงจริง</strong> —
              ส่วนที่ยืนยันแล้วคือค่าปรับเวลาตามลองจิจูดเท่านั้น ผลทั้งหน้านี้พึ่งลัคนา จึงควรใช้ประกอบการพิจารณา
            </p>
          </section>
        </>
      )}
    </main>
  );
}
