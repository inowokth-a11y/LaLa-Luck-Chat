// สร้างเคสตำแหน่งดาว (พุธ/ศุกร์/อังคาร/พฤหัส/เสาร์ + ราหู) จาก lib/engine/planets.ts
// เพื่อเทียบกับ Swiss Ephemeris — วิธีรันดูใน scripts/verify-planets-swisseph.py
//   npx tsx scripts/gen-planet-cases.mjs > /tmp/planet-ours.json
import { planetEclipticLongitude, rahuMeanLongitude, PLANET_KEYS } from "../lib/engine/planets.ts";
import { lahiriAyanamsa } from "../lib/engine/ascendant.ts";

const pymod = (a, n) => ((a % n) + n) % n;
// Julian Day จาก UTC ตรงๆ (แพทเทิร์นเดียว gen-asc-cases.mjs)
const jdUtc = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h, mi, 0) / 86400000 + 2440587.5;
const cases = [];
// ครอบช่วงเกิดผู้ใช้จริง 1950-2010 + ปัจจุบัน-อนาคตใกล้ (transit) ทุก ~73 วัน
for (let year = 1950; year <= 2030; year += 2) {
  for (const [m, d, h] of [[1, 5, 3], [3, 20, 9], [6, 7, 15], [8, 25, 21], [11, 11, 6]]) {
    const jd = jdUtc(year, m, d, h, 30);
    const ayan = lahiriAyanamsa(jd);
    const row = { jd, ayan };
    for (const p of PLANET_KEYS) row[p] = pymod(planetEclipticLongitude(p, jd) - ayan, 360);
    row.rahu = pymod(rahuMeanLongitude(jd) - ayan, 360);
    cases.push(row);
  }
}
console.log(JSON.stringify(cases));
