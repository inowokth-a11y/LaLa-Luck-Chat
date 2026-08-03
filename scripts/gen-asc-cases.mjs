// สร้างเคสทดสอบลัคนา 72 เคส (8 วัน × 9 เวลา × 4 จังหวัดวน) แล้วคำนวณด้วย engine ของเรา
// ใช้คู่กับ verify-asc-swisseph.py — ดูวิธีรันในไฟล์นั้น
import { calculateAscendant, ZODIAC_ORDER } from "../lib/engine/ascendant.ts";

// Julian Day จากเวลาท้องถิ่นไทย (UTC+7)
function jdFromLocal(y, mo, d, h, mi) {
  const ms = Date.UTC(y, mo - 1, d, h - 7, mi, 0);
  return ms / 86400000 + 2440587.5;
}

const cases = [];
// กระจาย: หลายปี หลายเวลา หลายจังหวัด (กทม/เชียงใหม่/ภูเก็ต/อุบล)
const places = [
  ["กรุงเทพฯ", 13.7563, 100.5018],
  ["เชียงใหม่", 18.7883, 98.9853],
  ["ภูเก็ต", 7.8804, 98.3923],
  ["อุบลราชธานี", 15.2448, 104.8473],
];
const dates = [
  [1986, 10, 7], [1990, 3, 15], [1990, 8, 15], [1975, 1, 1], [2000, 12, 31],
  [2010, 6, 21], [1960, 2, 29], [1995, 4, 13],
];
const times = [[0,30],[3,15],[6,28],[9,0],[12,45],[15,30],[18,30],[21,10],[23,59]];
let i = 0;
for (const [y,mo,d] of dates) for (const [h,mi] of times) {
  const [pn, lat, lon] = places[i++ % places.length];
  const jd = jdFromLocal(y,mo,d,h,mi);
  const r = calculateAscendant(jd, lat, lon, "sidereal");
  cases.push({ y,mo,d,h,mi, place: pn, lat, lon, jd, ourLon: r.longitude, ourSign: r.sign, deg: r.degreeInSign });
}
console.log(JSON.stringify(cases));
