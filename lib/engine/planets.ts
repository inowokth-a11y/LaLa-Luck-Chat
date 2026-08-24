/**
 * ตำแหน่งดาวเคราะห์ (geocentric ecliptic longitude, ของวันจริง of-date)
 * สำหรับชั้น Jyotish สากลของโหมดเนื้อคู่ — พุธ ศุกร์ อังคาร พฤหัส เสาร์ + ราหู (mean node)
 *
 * วิธี: Keplerian elements โดยประมาณของ JPL (Standish, "Keplerian Elements for
 * Approximate Positions of the Major Planets", ช่วงใช้งาน ค.ศ. 1800-2050)
 * → heliocentric → geocentric → precession J2000→ของวันจริง
 *
 * ✅ verify กับ Swiss Ephemeris แล้ว (24 ส.ค. 2569 · scripts/verify-planets-swisseph.py ·
 * 205 เคส ปี 1950-2030): median คลาด พุธ/ศุกร์/อังคาร ~0.012° · พฤหัส 0.037° · เสาร์ 0.081° ·
 * ราหู 0.004° (max 0.17°) — ราศีตรง 1,229/1,230 จุด (พลาด 1 เคสเสาร์ห่างขอบราศี 0.10° =
 * ความกำกวมขอบโดยธรรมชาติ) · ช่อง D9 (3°20′) ตรง ~97-100% พลาดเฉพาะติดขอบช่อง
 * → คุณภาพพอสำหรับชั้น Jyotish (ต้องมี caveat "ตำแหน่งใกล้ขอบราศี/ขอบช่อง D9 อาจคลาด")
 * ⚠️ อย่าใช้แทน jupiterLongitude/saturnLongitude ของ transit.ts (golden test ล็อกไว้) —
 * ไฟล์นี้เป็นชุดใหม่สำหรับชั้น Jyotish โดยเฉพาะ
 */

const pymod = (a: number, n: number) => ((a % n) + n) % n;

const DEG = Math.PI / 180;

/** องค์ประกอบวงโคจร J2000 + อัตราต่อศตวรรษจูเลียน (a AU · e · I ϖ Ω L องศา) */
interface Kepler {
  a: number; e: number; I: number; L: number; peri: number; node: number;
  da: number; de: number; dI: number; dL: number; dperi: number; dnode: number;
}

// ค่าจากตาราง JPL/Standish 1800-2050 AD (ϖ = longitude of perihelion, L = mean longitude)
const ELEMENTS: Record<string, Kepler> = {
  mercury: {
    a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.2503235, peri: 77.45779628, node: 48.33076593,
    da: 0.00000037, de: 0.00001906, dI: -0.00594749, dL: 149472.67411175, dperi: 0.16047689, dnode: -0.12534081,
  },
  venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.9790995, peri: 131.60246718, node: 76.67984255,
    da: 0.0000039, de: -0.00004107, dI: -0.0007889, dL: 58517.81538729, dperi: 0.00268329, dnode: -0.27769418,
  },
  earth: { // Earth-Moon barycenter
    a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, peri: 102.93768193, node: 0,
    da: 0.00000562, de: -0.00004392, dI: -0.01294668, dL: 35999.37244981, dperi: 0.32327364, dnode: 0,
  },
  mars: {
    a: 1.52371034, e: 0.0933941, I: 1.84969142, L: -4.55343205, peri: -23.94362959, node: 49.55953891,
    da: 0.00001847, de: 0.00007882, dI: -0.00813131, dL: 19140.30268499, dperi: 0.44441088, dnode: -0.29257343,
  },
  jupiter: {
    a: 5.202887, e: 0.04838624, I: 1.30439695, L: 34.39644051, peri: 14.72847983, node: 100.47390909,
    da: -0.00011607, de: -0.00013253, dI: -0.00183714, dL: 3034.74612775, dperi: 0.21252668, dnode: 0.20469106,
  },
  saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, peri: 92.59887831, node: 113.66242448,
    da: -0.0012506, de: -0.00050991, dI: 0.00193609, dL: 1222.49362201, dperi: -0.41897216, dnode: -0.28867794,
  },
};

export type PlanetKey = "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export const PLANET_KEYS: PlanetKey[] = ["mercury", "venus", "mars", "jupiter", "saturn"];

/** แก้สมการเคปเลอร์ E - e·sinE = M (เรเดียน) */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/** พิกัด heliocentric ecliptic J2000 (AU) ของดาว ณ T ศตวรรษจูเลียนจาก J2000 */
function heliocentric(el: Kepler, T: number): [number, number, number] {
  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = (el.I + el.dI * T) * DEG;
  const L = el.L + el.dL * T;
  const peri = el.peri + el.dperi * T;
  const node = (el.node + el.dnode * T) * DEG;
  const omega = (peri * DEG) - node; // argument of perihelion
  const M = pymod(L - peri, 360) * DEG;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cosO = Math.cos(node), sinO = Math.sin(node);
  const cosI = Math.cos(I), sinI = Math.sin(I);
  const cosw = Math.cos(omega), sinw = Math.sin(omega);
  const x = (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp;
  const y = (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp;
  const z = sinw * sinI * xp + cosw * sinI * yp;
  return [x, y, z];
}

/**
 * geocentric ecliptic longitude ของวันจริง (tropical, องศา 0-360)
 * — ระบบเดียวกับ solarEclipticLongitude/moonEclipticLongitude ที่มีอยู่
 */
export function planetEclipticLongitude(planet: PlanetKey, jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const [px, py] = heliocentric(ELEMENTS[planet], T);
  const [ex, ey] = heliocentric(ELEMENTS.earth, T);
  const lonJ2000 = Math.atan2(py - ey, px - ex) / DEG;
  // precession ทั่วไปในลองจิจูด J2000 → ของวันจริง (~50.29″/ปี)
  const precession = 1.3969713 * T + 0.0003086 * T * T;
  return pymod(lonJ2000 + precession, 360);
}

/** ราหู = mean lunar ascending node (Meeus บท 47, of-date) — เกตุ = +180° */
export function rahuMeanLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const omega =
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000;
  return pymod(omega, 360);
}
