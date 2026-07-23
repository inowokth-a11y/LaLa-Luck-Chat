// เทสต์ลัคนาด้วยสูตรดาราศาสตร์มาตรฐาน (lib/engine/ascendant.ts)
//
// ⚠️ ไม่ใช่ golden parity — ไม่มีต้นฉบับ Python ให้เทียบ และ**จงใจไม่ตรงกับ lagna.ts เดิม**
//    เพราะของเดิมพิสูจน์แล้วว่าผิด (ANTO_NATEE รวม 2,028 นาที แทนที่จะเป็น 1,440)
//    เทสต์ชุดนี้คุมด้วย "ข้อเท็จจริงทางดาราศาสตร์ที่ตรวจสอบได้เอง" แทนการเทียบกับโค้ดอื่น

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculateAscendant,
  localSiderealTime,
  meanObliquity,
  lahiriAyanamsa,
  ZODIAC_ORDER,
} from "../lib/engine/ascendant";
import { julianDay, solarEclipticLongitude, trueSunriseUtc } from "../lib/engine/lagna";

const BKK = { lat: 13.75, lon: 100.5 };
/** เวลาไทย (UTC+7) → Julian Day */
const jdBkk = (y: number, mo: number, d: number, h: number, mi: number) =>
  julianDay(Date.UTC(y, mo - 1, d, h, mi, 0) - 7 * 3600000);

test("🔴 ข้อพิสูจน์หลัก — ตอนอาทิตย์ขึ้น ลัคนาต้องเท่ากับลองจิจูดอาทิตย์", () => {
  // ตอนอาทิตย์ขึ้น ดวงอาทิตย์อยู่บนขอบฟ้าตะวันออกพอดี = ตำแหน่งเดียวกับลัคนา
  // ส่วนต่างที่เหลือ ~-0.85° คือค่าคงที่จากนิยาม "อาทิตย์ขึ้น" (หักเหแสง -0.833°
  // + รัศมีจานสุริยะ) ไม่ใช่ความคลาดเคลื่อนของสูตร — ถ้าเกิน 3° แปลว่าสูตรพัง
  for (const [y, mo, d] of [[1986, 10, 7], [2000, 1, 1], [2024, 6, 21], [1990, 3, 15]] as const) {
    const jd = julianDay(trueSunriseUtc(y, mo, d, BKK.lat, BKK.lon));
    const sun = solarEclipticLongitude(jd);
    const asc = calculateAscendant(jd, BKK.lat, BKK.lon, "tropical");
    const diff = ((asc.tropicalLongitude - sun + 540) % 360) - 180;
    assert.ok(Math.abs(diff) < 3, `${y}-${mo}-${d}: ต่าง ${diff.toFixed(2)}° เกิน 3°`);
    assert.ok(diff < 0, "ส่วนต่างควรติดลบเสมอ (อาทิตย์อยู่ใต้ขอบฟ้าเล็กน้อยตอน 'ขึ้น')");
  }
});

test("ลัคนาต้องวนครบ 12 ราศีใน 1 วัน (ของเดิมได้แค่ 9)", () => {
  const seen = new Set<string>();
  for (let m = 0; m < 24 * 60; m += 5) {
    seen.add(calculateAscendant(jdBkk(1986, 10, 7, Math.floor(m / 60), m % 60), BKK.lat, BKK.lon).sign);
  }
  assert.equal(seen.size, 12, `พบ ${seen.size} ราศี — ต้องครบ 12`);
});

test("ผลรวมเวลาที่แต่ละราศีขึ้น = 1 วันพอดี และไม่มีราศีไหนสั้น/ยาวผิดปกติ", () => {
  const dur: Record<string, number> = {};
  for (let m = 0; m < 24 * 60; m++) {
    const s = calculateAscendant(jdBkk(1986, 10, 7, Math.floor(m / 60), m % 60), BKK.lat, BKK.lon).sign;
    dur[s] = (dur[s] ?? 0) + 1;
  }
  assert.equal(Object.values(dur).reduce((a, b) => a + b, 0), 1440);
  for (const s of ZODIAC_ORDER) {
    // ที่ละติจูดไทย ราศีขึ้นเร็วสุด/ช้าสุดอยู่ราว 1.6-2.3 ชม.
    assert.ok(dur[s] >= 80 && dur[s] <= 160, `${s} ใช้ ${dur[s]} นาที — ผิดปกติ`);
  }
});

test("ลัคนาไล่ราศีตามลำดับ ไม่กระโดดข้าม", () => {
  let prevIdx = -1;
  let jumps = 0;
  for (let m = 0; m < 24 * 60; m += 2) {
    const idx = ZODIAC_ORDER.indexOf(
      calculateAscendant(jdBkk(1986, 10, 7, Math.floor(m / 60), m % 60), BKK.lat, BKK.lon).sign
    );
    if (prevIdx >= 0 && idx !== prevIdx) {
      assert.equal(idx, (prevIdx + 1) % 12, `กระโดดจาก ${ZODIAC_ORDER[prevIdx]} ไป ${ZODIAC_ORDER[idx]}`);
      jumps++;
    }
    prevIdx = idx;
  }
  assert.equal(jumps, 12, "ควรเปลี่ยนราศี 12 ครั้งพอดีใน 1 วัน");
});

test("ลองจิจูดมีผลจริง — จังหวัดต่างกันได้ลัคนาต่างกันเมื่อเกิดใกล้รอยต่อ", () => {
  // แม่ฮ่องสอน (97.97) กับ อุบลฯ (104.86) ห่าง ~6.9° = ~27.6 นาทีเวลา
  const t = { y: 1986, mo: 10, d: 7, h: 6, mi: 28 };
  const west = calculateAscendant(
    julianDay(Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi) - 7 * 3600000), 19.3, 97.97
  );
  const east = calculateAscendant(
    julianDay(Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi) - 7 * 3600000), 15.23, 104.86
  );
  // ต้องต่างกันในเชิงองศา (จะข้ามราศีหรือไม่ขึ้นกับว่าเกิดใกล้รอยต่อแค่ไหน)
  assert.notEqual(west.longitude.toFixed(2), east.longitude.toFixed(2));
});

test("ระบบนิรายนะกับสายนะต่างกัน ~24 องศาในยุคปัจจุบัน", () => {
  const jd = jdBkk(2026, 7, 19, 12, 0);
  const sid = calculateAscendant(jd, BKK.lat, BKK.lon, "sidereal");
  const trop = calculateAscendant(jd, BKK.lat, BKK.lon, "tropical");
  const gap = ((trop.longitude - sid.longitude + 360) % 360);
  assert.ok(gap > 23 && gap < 25, `ต่าง ${gap.toFixed(2)}° — ควรอยู่ราว 24°`);
  assert.equal(trop.ayanamsaUsed, 0, "โหมดสายนะต้องไม่ลบอายนางศะ");
});

test("อายนางศะลาหิรีอยู่ในช่วงที่ถูกต้องตามยุค", () => {
  // ค่าอ้างอิงที่ทราบกันทั่วไป: J2000 ≈ 23.85° และเพิ่มปีละ ~50 ลิปดา
  assert.ok(Math.abs(lahiriAyanamsa(2451545.0) - 23.85) < 0.02, "ที่ J2000 ควร ≈ 23.85°");
  const rate = lahiriAyanamsa(2451545.0 + 36525) - lahiriAyanamsa(2451545.0);
  assert.ok(Math.abs(rate - 1.3969) < 0.01, "100 ปีควรเพิ่ม ~1.4° (50 ลิปดา/ปี)");
});

test("ค่าดาราศาสตร์พื้นฐานอยู่ในช่วงที่ถูกต้อง", () => {
  const jd = jdBkk(2000, 1, 1, 12, 0);
  assert.ok(meanObliquity(jd) > 23.4 && meanObliquity(jd) < 23.5, "obliquity ~23.44°");
  const lst = localSiderealTime(jd, 100.5);
  assert.ok(lst >= 0 && lst < 360);
  // LST ต้องเดินเร็วกว่าเวลาสุริยะ: 1 วันสุริยะ = 360.9856° ของ sidereal
  const lst2 = localSiderealTime(jd + 1, 100.5);
  const advance = ((lst2 - lst + 360) % 360);
  assert.ok(Math.abs(advance - 0.9856) < 0.01, `เดินไป ${advance.toFixed(4)}° ควร ~0.9856°`);
});

test("ละติจูดสูงขึ้นทำให้ราศียาว/สั้นต่างกันมากขึ้น (ปรากฏการณ์จริง)", () => {
  const count = (lat: number) => {
    const d: Record<string, number> = {};
    for (let m = 0; m < 1440; m += 3) {
      const s = calculateAscendant(jdBkk(2000, 3, 20, Math.floor(m / 60), m % 60), lat, 100.5).sign;
      d[s] = (d[s] ?? 0) + 3;
    }
    return Math.max(...Object.values(d)) - Math.min(...Object.values(d));
  };
  assert.ok(count(55) > count(13.75), "ละติจูดสูงต้องมีความต่างของช่วงราศีมากกว่า");
});
