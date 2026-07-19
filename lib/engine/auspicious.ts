// พอร์ตจาก legacy-python-engines/auspicious_timing_engine.py (Logic 3 — ยามอุบากอง, CLAUDE.md §6)
// ครอบคลุมเฉพาะยามกลางวัน (06:01-18:00) จาก Ubakong_Time_Chart.xlsx (35 แถว verified)
// ❌ ยังไม่มี: ยามกลางคืน, Flying Stars (CLAUDE.md §3.6)

import ubakongTable from "../../data/ubakong_time_chart.json";

interface UbakongRow {
  day_of_week: string;
  time_start: string;
  time_end: string;
  yam_name: string;
  meaning: string;
  prediction_status: string;
  score: number;
}

const UBAKONG_TABLE = ubakongTable as UbakongRow[];

export interface TimeObj {
  hour: number;
  minute: number;
  second?: number;
}

const secOfDay = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const parseTimeSec = (t: string) => {
  const [h, m, s] = t.split(":").map((x) => parseInt(x, 10));
  return secOfDay(h, m, s);
};
const hhmm = (t: TimeObj) =>
  `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;

export interface AuspiciousFound {
  day: string;
  time: string;
  yam_name: string;
  meaning: string;
  verdict: string;
  score: number;
  found: true;
}
export interface AuspiciousNotFound {
  day: string;
  time: string;
  found: false;
  note: string;
}

export function checkAuspiciousTime(dayOfWeekTh: string, t: TimeObj): AuspiciousFound | AuspiciousNotFound {
  const tSec = secOfDay(t.hour, t.minute, t.second ?? 0);
  for (const row of UBAKONG_TABLE) {
    if (row.day_of_week !== dayOfWeekTh) continue;
    const start = parseTimeSec(row.time_start);
    const end = parseTimeSec(row.time_end);
    if (start <= tSec && tSec <= end) {
      return {
        day: dayOfWeekTh,
        time: hhmm(t),
        yam_name: row.yam_name,
        meaning: row.meaning,
        verdict: row.prediction_status,
        score: row.score,
        found: true,
      };
    }
  }
  return {
    day: dayOfWeekTh,
    time: hhmm(t),
    found: false,
    note: "เวลานี้อยู่นอกช่วงยามกลางวัน (06:01-18:00) — ยามกลางคืนยังไม่มีข้อมูลในตารางต้นฉบับ",
  };
}

export interface BestTimeResult {
  day: string;
  best: { time_range: string; yam_name: string; meaning: string; score: number };
  worst: { time_range: string; yam_name: string; meaning: string; score: number };
}

export function bestTimeToday(dayOfWeekTh: string): BestTimeResult {
  const todays = UBAKONG_TABLE.filter((r) => r.day_of_week === dayOfWeekTh);
  // Python max/min คืน "ตัวแรก" ที่ได้ค่าสุด/ต่ำสุด (เมื่อเสมอ) — จำลองด้วย > / <
  let best = todays[0];
  let worst = todays[0];
  for (const r of todays) {
    if (r.score > best.score) best = r;
    if (r.score < worst.score) worst = r;
  }
  const range = (r: UbakongRow) => `${r.time_start.slice(0, 5)}-${r.time_end.slice(0, 5)}`;
  return {
    day: dayOfWeekTh,
    best: { time_range: range(best), yam_name: best.yam_name, meaning: best.meaning, score: best.score },
    worst: { time_range: range(worst), yam_name: worst.yam_name, meaning: worst.meaning, score: worst.score },
  };
}
