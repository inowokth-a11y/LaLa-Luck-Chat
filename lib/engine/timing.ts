// จัดอันดับ "วันฤกษ์ดี" ในช่วงวันที่ — ต่อยอด Logic 3 (กาลโยค + อุบากอง) CLAUDE.md §3.6
// ตรรกะล้วน (เทสต์ได้ · คำนวณฝั่ง client ได้ ฟรี ไม่ใช้ AI)
//
// 🔴 caveat สำคัญ (บากไว้ทุกผล): อาจารย์ใหญ่หลายท่านเลิกใช้กาลโยคเป็นเกณฑ์หลัก — ใช้ประกอบ
//    · อุบากองมีแค่ยามกลางวัน (06:01-18:00) · ยังไม่รวมชั้นดวงส่วนตัว (ลัคนายังไม่ verify §5.2)

import { checkDayKalaYoke } from "./kalayoke";
import { bestTimeToday } from "./auspicious";
import { thaiDayOfWeek } from "./card-id";

/** เน้นประเภทวันดีตามงาน: ธงชัย=สิ่งของ/สถานที่ · อธิบดี=บุคคล/อำนาจ · any=นับวันดีทุกแบบ */
export type Emphasis = "thanchai" | "athibodi" | "any";

export interface Activity {
  key: string;
  label: string;
  emphasis: Emphasis;
}
export const ACTIVITIES: Activity[] = [
  { key: "open_company", label: "เปิด/จดทะเบียนบริษัท", emphasis: "thanchai" },
  { key: "car_registration", label: "ขอทะเบียนรถ", emphasis: "thanchai" },
  { key: "housewarming", label: "ขึ้นบ้านใหม่", emphasis: "thanchai" },
  { key: "negotiation", label: "เจรจา/ประชุมสำคัญ", emphasis: "athibodi" },
  { key: "general", label: "ทั่วไป", emphasis: "any" },
];

export const TIMING_CAVEAT =
  "กาลโยคเป็นเกณฑ์ประกอบ — อาจารย์โหราศาสตร์ไทยหลายท่านเลิกใช้เป็นเกณฑ์หลัก (ยังไม่มีข้อพิสูจน์ความแม่นเพียงพอ) · " +
  "ยามอุบากองครอบคลุมเฉพาะกลางวัน (06:01-18:00) · ผลนี้ยังไม่รวมชั้นดวงส่วนตัว (ลัคนา) โปรดใช้วิจารณญาณ";

export type Verdict = "excellent" | "good" | "neutral" | "avoid";

export interface DayRanking {
  dateISO: string;
  dayOfWeekTh: string;
  goodTypes: string[]; // ธงชัย/อธิบดี ที่ตรงวันนี้
  badTypes: string[]; // อุบาทว์/โลกาวินาศ ที่ตรงวันนี้
  verdict: Verdict;
  score: number;
  bestHour: { range: string; yam: string; meaning: string; score: number };
}

/** จ.ศ. ที่ใช้ได้จริงของวันนั้น — ปีกาลโยคเปลี่ยน 16 เม.ย. (ก่อนหน้านั้นใช้ปีก่อน) §3.6
 *  (export ให้ network-holistic ใช้ตรวจ "จังหวะเริ่มต้น" — แหล่งเดียว ห้ามก๊อปสูตร) */
export function kalaYokeCsForDate(y: number, m: number, d: number): number {
  const afterBoundary = m > 4 || (m === 4 && d >= 16);
  return (afterBoundary ? y : y - 1) - 638; // จ.ศ. = ค.ศ. - 638
}

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);
const GOOD_SET = new Set(["ธงชัย", "อธิบดี"]);

/** วนทุกวันในช่วง [fromISO, toISO] → จัดอันดับวันดีที่สุดก่อน (จำกัดจำนวนวันกันลูปยาว) */
export function rankAuspiciousDays(opts: {
  fromISO: string;
  toISO: string;
  emphasis: Emphasis;
  maxDays?: number;
}): { days: DayRanking[]; caveat: string } {
  const { emphasis } = opts;
  const maxDays = Math.min(opts.maxDays ?? 92, 366);
  const start = new Date(opts.fromISO + "T00:00:00Z");
  const end = new Date(opts.toISO + "T00:00:00Z");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { days: [], caveat: TIMING_CAVEAT };
  }

  const emphType = emphasis === "thanchai" ? "ธงชัย" : emphasis === "athibodi" ? "อธิบดี" : null;
  const days: DayRanking[] = [];

  const cur = new Date(start);
  for (let i = 0; i < maxDays && cur <= end; i++) {
    const iso = toISO(cur);
    const y = cur.getUTCFullYear(), m = cur.getUTCMonth() + 1, d = cur.getUTCDate();
    const dayTh = thaiDayOfWeek(iso);
    const cs = kalaYokeCsForDate(y, m, d);

    const hits = checkDayKalaYoke(dayTh, cs).kala_yoke_hits;
    const goodTypes = hits.filter((h) => GOOD_SET.has(h.type)).map((h) => h.type);
    const badTypes = hits.filter((h) => !GOOD_SET.has(h.type)).map((h) => h.type);

    // คะแนน: ตรงประเภทที่เน้น +3 · มีวันดีอื่น +1 · มีวันร้าย -3
    let score = 0;
    if (emphType && goodTypes.includes(emphType)) score += 3;
    else if (goodTypes.length > 0) score += 1;
    if (badTypes.length > 0) score -= 3;

    const bh = bestTimeToday(dayTh).best;
    const verdict: Verdict =
      badTypes.length > 0 && score < 0 ? "avoid" : score >= 3 ? "excellent" : score >= 1 ? "good" : "neutral";

    days.push({
      dateISO: iso,
      dayOfWeekTh: dayTh,
      goodTypes,
      badTypes,
      verdict,
      score,
      bestHour: { range: bh.time_range, yam: bh.yam_name, meaning: bh.meaning, score: bh.score },
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  // เรียง: คะแนนมากก่อน → ยามดีสุดของวัน → วันที่เร็วกว่า
  days.sort((a, b) => b.score - a.score || b.bestHour.score - a.bestHour.score || a.dateISO.localeCompare(b.dateISO));
  return { days, caveat: TIMING_CAVEAT };
}
