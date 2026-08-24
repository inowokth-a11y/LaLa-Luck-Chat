/**
 * ชั้น Jyotish สากล (โหราศาสตร์อินเดียคลาสสิก) สำหรับโหมดเนื้อคู่ — งานวิจัยแยกรอบ 24 ส.ค. 2569
 *
 * 🔴 ชั้นนี้ "ไม่ใช่ตำราจตุพลวัตร" — เป็นระบบสากลที่ค้น+ยืนยันกฎจากแหล่งเผยแพร่จริง
 * (BPHS/Jaimini Sutras ฉบับแปล + เอกสารซอฟต์แวร์โหราศาสตร์มาตรฐาน) ทุกจุดต้องแสดง
 * JYOTISH_CAVEAT และห้ามให้ขัด/แทนชั้นตำรา (ลัคนา/ภพปัตนิ/ข.2/ค.1)
 *
 * แหล่งกฎ (cross-check ≥2 แหล่ง/ข้อ — รายงานเต็มในบทสนทนา 24 ส.ค. 2569):
 * - Arudha Pada: นับจากภพ→เจ้าเรือน แล้วนับเท่ากันจากเจ้าเรือนต่อ · ข้อยกเว้น ตกภพเดิม→ภพ 10
 *   จากตำแหน่งนั้น, ตกภพ 7→ภพ 4 (Saptarishis/BPHS Arudha chapter · JagannathHora · HinduCalculator)
 *   ⚠️ มีสำนักส่วนน้อยไม่ใช้ข้อยกเว้น — ใช้แบบ mainstream software
 * - Upapada Lagna = Arudha ของภพ 12 (สาย Rath/Cole = กระแสหลัก · มีสำนักเก่าใช้ภพ 7)
 * - Chara Karaka: เรียงองศาในราศีมาก→น้อย · Darakaraka = น้อยสุด · ใช้แบบ 8 ดวงรวมราหู
 *   (ราหูใช้ 30°−ตำแหน่งในราศี เพราะเดินถอยหลัง) ⚠️ สำนัก 7 ดวงก็มี — ผลต่างราว 1/4 ของดวง
 * - D9 Navamsa: navamsaIdx = floor(ลองจิจูดนิรายนะ / 3°20′) mod 12 — พิสูจน์แล้วว่า
 *   เทียบเท่ากฎคลาสสิก (จร=ราศีเดิม คงที่=ราศีที่ 9 อุภย=ราศีที่ 5) ครบทั้ง 12 กรณี
 * - Vimshottari: เกตุ7 ศุกร์20 อาทิตย์6 จันทร์10 อังคาร7 ราหู18 พฤหัส16 เสาร์19 พุธ17 (รวม 120 ปี)
 *   เริ่มจากนักษัตรดวงจันทร์เกิด (อัศวินี→เกตุ, idx mod 9) · เศษทศาแรก = สัดส่วนที่เหลือของนักษัตร
 *   · อันตรทศาเริ่มที่เจ้ามหาทศาเอง ยาว = ปีเจ้าอันตร/120 × ปีมหาทศา
 * - ราหู: ใช้ mean node (ธรรมเนียมปฏิทินอินเดีย/ปัญจางค์ · true node เป็นตัวเลือกสมัยใหม่)
 *
 * ✅ ดาราศาสตร์ verify กับ Swiss Ephemeris แล้ว (ดู planets.ts + moon 324/324 นักษัตรตรง)
 * เรือนใช้ระบบ whole-sign (มาตรฐาน Jyotish) · ปีทศาใช้ 365.25 วัน
 */

import { solarEclipticLongitude } from "./lagna";
import { moonEclipticLongitude } from "./daily";
import { lahiriAyanamsa, ZODIAC_ORDER, type ZodiacSign } from "./ascendant";
import { planetEclipticLongitude, rahuMeanLongitude } from "./planets";

const pymod = (a: number, n: number) => ((a % n) + n) % n;
const NAK_W = 360 / 27; // 13°20′

export type Graha = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu";

export const GRAHA_TH: Record<Graha, string> = {
  sun: "อาทิตย์", moon: "จันทร์", mars: "อังคาร", mercury: "พุธ", jupiter: "พฤหัสบดี",
  venus: "ศุกร์", saturn: "เสาร์", rahu: "ราหู", ketu: "เกตุ",
};

/** เจ้าเรือนราศีตามระบบคลาสสิก (เมษ=0 … มีน=11) — กุมภ์=เสาร์ (ไม่รวมราหูแบบธรรมเนียมไทย) */
export const SIGN_LORD: Graha[] = [
  "mars", "venus", "mercury", "moon", "sun", "mercury",
  "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
];

/** นักษัตร 27 (ชื่อไทยตามธรรมเนียมฤกษ์) */
export const NAKSHATRA_TH = [
  "อัศวินี", "ภรณี", "กฤติกา", "โรหิณี", "มฤคศิระ", "อารทรา", "ปุนรวสุ", "ปุษยะ", "อาศเลษา",
  "มาฆะ", "ปูรวผลคุนี", "อุตตรผลคุนี", "หัสตะ", "จิตรา", "สวาติ", "วิศาขา", "อนุราธา", "เชษฐา",
  "มูละ", "ปูรวาษาฒ", "อุตตราษาฒ", "ศรวณะ", "ธนิษฐา", "ศตภิษัช", "ปูรวภัทรบท", "อุตตรภัทรบท", "เรวดี",
] as const;

// ---------------------------------------------------------------------------
// ดวง (chart)
// ---------------------------------------------------------------------------

export interface GrahaPos {
  graha: Graha;
  lon: number;        // นิรายนะ (ลาหิรี) 0-360
  signIdx: number;    // 0=เมษ
  degInSign: number;
  house: number;      // whole-sign จากลัคนา (1-12)
}

export interface JyotishChart {
  jd: number;
  lagnaIdx: number;
  positions: Record<Graha, GrahaPos>;
}

export function signTh(idx: number): ZodiacSign {
  return ZODIAC_ORDER[pymod(idx, 12)] as ZodiacSign;
}

export function buildJyotishChart(jd: number, lagnaSign: ZodiacSign): JyotishChart {
  const lagnaIdx = ZODIAC_ORDER.indexOf(lagnaSign);
  const ayan = lahiriAyanamsa(jd);
  const raw: Record<Graha, number> = {
    sun: solarEclipticLongitude(jd),
    moon: moonEclipticLongitude(jd),
    mercury: planetEclipticLongitude("mercury", jd),
    venus: planetEclipticLongitude("venus", jd),
    mars: planetEclipticLongitude("mars", jd),
    jupiter: planetEclipticLongitude("jupiter", jd),
    saturn: planetEclipticLongitude("saturn", jd),
    rahu: rahuMeanLongitude(jd),
    ketu: pymod(rahuMeanLongitude(jd) + 180, 360),
  };
  const positions = {} as Record<Graha, GrahaPos>;
  (Object.keys(raw) as Graha[]).forEach((g) => {
    const lon = pymod(raw[g] - ayan, 360);
    const signIdx = Math.floor(lon / 30);
    positions[g] = {
      graha: g, lon, signIdx, degInSign: lon - signIdx * 30,
      house: pymod(signIdx - lagnaIdx, 12) + 1,
    };
  });
  return { jd, lagnaIdx, positions };
}

// ---------------------------------------------------------------------------
// D9 Navamsa
// ---------------------------------------------------------------------------

/** navamsa sign index (0=เมษ) — เทียบเท่ากฎ จร/คงที่/อุภย คลาสสิก (พิสูจน์ครบ 12 กรณี) */
export function navamsaIdx(siderealLon: number): number {
  return Math.floor(pymod(siderealLon, 360) / (10 / 3)) % 12;
}

/** ราศีอุจ (exaltation) มาตรฐาน — ใช้เช็คความแข็งแรงใน D9 (ไม่รวมราหู/เกตุ — หลายสำนักไม่ตรงกัน) */
const EXALTATION: Partial<Record<Graha, number>> = {
  sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6,
};

export type Dignity = "exalted" | "own" | "neutral";
export function dignityInSign(graha: Graha, signIdx: number): Dignity {
  if (EXALTATION[graha] === signIdx) return "exalted";
  if (SIGN_LORD[signIdx] === graha) return "own";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Arudha Pada + Upapada Lagna
// ---------------------------------------------------------------------------

/**
 * Arudha ของภพ houseN (1-12 จากลัคนา) → sign index
 * กฎ: นับจากภพถึงเจ้าเรือน = d แล้วนับ d ต่อจากเจ้าเรือน · ข้อยกเว้น: ตกภพเดิม→+9 (ภพ 10
 * จากตำแหน่ง), ตกภพ 7 จากภพเดิม→+3 (ภพ 4) — ตาม BPHS/mainstream software
 */
export function arudhaOfHouse(chart: JyotishChart, houseN: number): number {
  const H = pymod(chart.lagnaIdx + houseN - 1, 12);
  const lord = SIGN_LORD[H];
  const L = chart.positions[lord].signIdx;
  const d = pymod(L - H, 12); // 0 = เจ้าเรือนอยู่ภพเดิม (นับ 1)
  const raw = pymod(L + d, 12); // = H + 2d
  if (raw === H) return pymod(H + 9, 12);
  if (raw === pymod(H + 6, 12)) return pymod(H + 3, 12);
  return raw;
}

/** Upapada Lagna = Arudha ของภพ 12 */
export function upapadaLagna(chart: JyotishChart): number {
  return arudhaOfHouse(chart, 12);
}

// ---------------------------------------------------------------------------
// Chara Karaka / Darakaraka (แบบ 8 ดวงรวมราหู — ราหูใช้ 30°−องศา)
// ---------------------------------------------------------------------------

const KARAKA_GRAHAS: Graha[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu"];

export function charaKarakas(chart: JyotishChart): { graha: Graha; effDeg: number }[] {
  return KARAKA_GRAHAS.map((g) => ({
    graha: g,
    effDeg: g === "rahu" ? 30 - chart.positions[g].degInSign : chart.positions[g].degInSign,
  })).sort((a, b) => b.effDeg - a.effDeg);
}

/** Darakaraka = องศาน้อยสุด (ตัวชี้คู่ครองตาม Jaimini) */
export function darakaraka(chart: JyotishChart): Graha {
  const ranked = charaKarakas(chart);
  return ranked[ranked.length - 1].graha;
}

// ---------------------------------------------------------------------------
// Vimshottari Dasha
// ---------------------------------------------------------------------------

const DASHA_LORDS: Graha[] = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
const DASHA_YEARS: Record<string, number> = {
  ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17,
};
const YEAR_MS = 365.25 * 86400000;

export interface DashaPeriod { lord: Graha; fromMs: number; toMs: number }

export function moonNakshatra(moonSiderealLon: number): { idx: number; nameTh: string; frac: number } {
  const lon = pymod(moonSiderealLon, 360);
  const idx = Math.floor(lon / NAK_W);
  return { idx, nameTh: NAKSHATRA_TH[idx], frac: (lon - idx * NAK_W) / NAK_W };
}

/** มหาทศาตั้งแต่เกิดไป ~100 ปี (ตัวแรก = เศษที่เหลือของเจ้านักษัตรเกิด) */
export function vimshottariMahadashas(moonSiderealLon: number, birthUtcMs: number): DashaPeriod[] {
  const nak = moonNakshatra(moonSiderealLon);
  const startLordIdx = nak.idx % 9;
  const out: DashaPeriod[] = [];
  let cursor = birthUtcMs;
  for (let i = 0; i < 10; i++) {
    const lord = DASHA_LORDS[(startLordIdx + i) % 9];
    const years = i === 0 ? (1 - nak.frac) * DASHA_YEARS[lord] : DASHA_YEARS[lord];
    const to = cursor + years * YEAR_MS;
    out.push({ lord, fromMs: cursor, toMs: to });
    cursor = to;
  }
  return out;
}

/** อันตรทศาภายในมหาทศาหนึ่ง — เริ่มที่เจ้ามหาทศาเอง (สำหรับมหาทศาแรกที่เป็นเศษ: ตัดช่วงก่อนเกิดออก) */
export function antardashas(md: DashaPeriod, fullYears?: number): DashaPeriod[] {
  const mdYears = fullYears ?? DASHA_YEARS[md.lord];
  const fullFromMs = md.toMs - mdYears * YEAR_MS; // จุดเริ่มมหาทศาเต็ม (อาจก่อนเกิด)
  const startIdx = DASHA_LORDS.indexOf(md.lord);
  const out: DashaPeriod[] = [];
  let cursor = fullFromMs;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORDS[(startIdx + i) % 9];
    const years = (DASHA_YEARS[lord] / 120) * mdYears;
    const to = cursor + years * YEAR_MS;
    if (to > md.fromMs) out.push({ lord, fromMs: Math.max(cursor, md.fromMs), toMs: to });
    cursor = to;
  }
  return out;
}

export interface MarriageWindow { fromMs: number; toMs: number; mdLord: Graha; adLord: Graha; reasonTh: string }

/**
 * หน้าต่างจังหวะเรื่องคู่ (ตามธรรมเนียม: ทศาของเจ้าเรือน 7 · ศุกร์ (หญิง: +พฤหัส) ·
 * ดาวในภพ 7 · เจ้าเรือน UL · Darakaraka) — ช่วงที่ MD หรือ AD lord อยู่ในชุดนี้
 */
export function marriageWindows(
  mahadashas: DashaPeriod[],
  favorable: Set<Graha>,
  nowMs: number,
  horizonYears = 8,
  limit = 3
): MarriageWindow[] {
  const endMs = nowMs + horizonYears * YEAR_MS;
  const out: MarriageWindow[] = [];
  for (const md of mahadashas) {
    if (md.toMs < nowMs || md.fromMs > endMs) continue;
    for (const ad of antardashas(md)) {
      if (ad.toMs < nowMs || ad.fromMs > endMs) continue;
      const mdHit = favorable.has(md.lord);
      const adHit = favorable.has(ad.lord);
      if (!mdHit && !adHit) continue;
      const both = mdHit && adHit;
      out.push({
        fromMs: Math.max(ad.fromMs, nowMs), toMs: Math.min(ad.toMs, endMs),
        mdLord: md.lord, adLord: ad.lord,
        reasonTh: both
          ? `มหาทศา${GRAHA_TH[md.lord]} + อันตรทศา${GRAHA_TH[ad.lord]} เชื่อมเรื่องคู่ทั้งสองชั้น (ช่วงน้ำหนักสูง)`
          : mdHit
            ? `มหาทศา${GRAHA_TH[md.lord]} เชื่อมเรื่องคู่`
            : `อันตรทศา${GRAHA_TH[ad.lord]} เชื่อมเรื่องคู่`,
      });
      if (out.length >= limit * 3) break;
    }
    if (out.length >= limit * 3) break;
  }
  // ช่วงที่ทั้ง MD+AD เข้าชุดมาก่อน แล้วเรียงตามเวลา
  out.sort((a, b) => {
    const aBoth = favorable.has(a.mdLord) && favorable.has(a.adLord) ? 0 : 1;
    const bBoth = favorable.has(b.mdLord) && favorable.has(b.adLord) ? 0 : 1;
    return aBoth - bBoth || a.fromMs - b.fromMs;
  });
  return out.slice(0, limit);
}

// ---------------------------------------------------------------------------
// ตารางตีความภาษาไทย (จากรายงานวิจัย — ⚠️ ตาราง "ลักษณะ" เป็นธรรมเนียมนักปฏิบัติ
// ต่อยอดจากคัมภีร์ ไม่ใช่โศลกคำต่อคำ → caveat บังคับ)
// ---------------------------------------------------------------------------

/** เจ้าเรือน 7 อยู่ภพ N → บริบทที่มักพบคู่/บทบาทของคู่ (cross-check 3 แหล่ง) */
export const SEVENTH_LORD_ARENA_TH: Record<number, string> = {
  1: "คู่เข้ามาหาคุณเอง — แรงดึงดูดเรื่องคู่ชัด คู่มักเป็นคนสร้างตัวเอง",
  2: "มักพบผ่านวงครอบครัว/คนใกล้ชิดแนะนำ — คู่มีผลกับการเงินและครอบครัว",
  3: "มักพบผ่านการสื่อสาร การเดินทางระยะสั้น หรือวงพี่น้อง/เพื่อนสนิท",
  4: "มักพบผ่านบ้าน ถิ่นเกิด หรือเครือข่ายครอบครัว — คู่มีนิสัยดูแลเอาใจใส่",
  5: "โทนรักโรแมนติก — มักพบผ่านการเรียน งานสร้างสรรค์ หรือกิจกรรมสันทนาการ",
  6: "มักพบผ่านที่ทำงาน งานบริการ หรือบริบทที่ต้องช่วยกันแก้ปัญหา — ต้องดูแลเรื่องขัดแย้งเล็กๆ",
  7: "มักพบในงานสังคม/ที่สาธารณะ — คู่มีหัวการค้า มีทักษะเจรจา",
  8: "มักพบแบบไม่คาดฝัน/บังเอิญ — ความสัมพันธ์เปลี่ยนชีวิตลึก",
  9: "มักพบผ่านการเดินทางไกล การศึกษาขั้นสูง หรือสายความเชื่อ — คู่อาจต่างถิ่น/ต่างวัฒนธรรม",
  10: "มักพบผ่านหน้าที่การงาน — คู่มีความทะเยอทะยาน อาจอยู่สายอาชีพใกล้กัน",
  11: "มักพบผ่านเพื่อน งานสังคม หรือเครือข่าย — คู่หนุนเรื่องรายได้/เป้าหมาย",
  12: "โทนต่างแดน/ต่างถิ่นชัด — อาจพบหรือใช้ชีวิตคู่ไกลบ้าน หรือคู่ทำงานสายเก็บตัว/ต่างประเทศ",
};

/** ดาวอยู่ในภพ 7 → ลักษณะที่เติมให้คู่ (ฐาน Sārāvalī + ธรรมเนียมนักปฏิบัติ) */
export const PLANET_IN_7TH_TH: Record<Graha, string> = {
  sun: "สง่า มั่นใจ ใส่ใจสถานะ — ต้องดูแลเรื่องทิฐิชนกัน",
  moon: "หน้าตาอ่อนโยน อารมณ์ละเอียด ดูแลเก่ง แต่อารมณ์ขึ้นลงได้",
  mars: "กระฉับกระเฉง โครงหน้าคม กล้าตัดสินใจ — พลังงานสูง ใจร้อนได้",
  mercury: "ดูอ่อนวัย ช่างพูดช่างคุย หัวไว มีเสน่ห์ทางความคิด",
  jupiter: "ภูมิฐาน มีการศึกษา/คุณธรรม รูปร่างสมบูรณ์ อบอุ่นแบบผู้ใหญ่",
  venus: "งดงาม มีรสนิยม รักสวยรักงาม โรแมนติก",
  saturn: "เป็นผู้ใหญ่กว่าวัย จริงจัง มีวินัย — ความสัมพันธ์สุกงอมช้าแต่มั่นคง",
  rahu: "แหวกแนว มีเสน่ห์แปลกใหม่ อาจต่างถิ่น/ต่างวัฒนธรรม — เข้มข้น",
  ketu: "โทนปล่อยวาง มีมิติจิตใจ/จิตวิญญาณ อ่านยากแต่ลึก",
};

/** Darakaraka → ภาพตัวแทนคู่ (ธรรมเนียมนักปฏิบัติต่อยอด Jaimini) */
export const DK_ARCHETYPE_TH: Record<Graha, string> = {
  sun: "คู่แนวผู้นำ มีตำแหน่ง/ความภูมิใจในตัวเองสูง",
  moon: "คู่แนวอบอุ่น ใส่ใจความรู้สึก ติดบ้าน",
  mars: "คู่แนวนักสู้ ชอบแข่งขัน สายเทคนิค/กีฬา",
  mercury: "คู่แนวหัวไว ช่างสื่อสาร ดูเด็กกว่าวัย ชอบเดินทาง",
  jupiter: "คู่แนวผู้รู้ มีการศึกษา/ศีลธรรม ให้การปกป้อง",
  venus: "คู่แนวโรแมนติก มีศิลปะ รักความประณีต",
  saturn: "คู่แนวผู้ใหญ่ อาจอายุ/วุฒิภาวะมากกว่า ซื่อสัตย์ ผูกพันแบบค่อยเป็นค่อยไป",
  rahu: "คู่แนวแหวกขนบ มีเสน่ห์ต่างถิ่น/ต่างวัฒนธรรม",
  ketu: "คู่แนวเรียบง่าย ปล่อยวาง มีมิติทางจิตใจ",
};

/** รูปลักษณ์ที่ดาวในภพ 7 "เติม" ให้คู่ (ฐาน Sārāvalī + ธรรมเนียมนักปฏิบัติ — ชั้นเสริม
 *  🔴 ไม่แทนตาราง ค.1 ของตำรา — ใช้เป็นตัวเสริมทั้งในคำทำนายและ prompt ภาพ) */
export const PLANET_APPEARANCE: Record<Graha, { th: string; en: string }> = {
  sun: { th: "สง่าผ่าเผย บุคลิกโดดเด่นเห็นแล้วจำได้", en: "dignified commanding presence" },
  moon: { th: "ใบหน้าอ่อนโยน ผิวพรรณผ่องใส ดวงตาเด่น", en: "gentle attractive face with luminous skin and expressive eyes" },
  mars: { th: "โครงหน้าคม รูปร่างกระชับแข็งแรง", en: "sharp defined features, fit athletic build" },
  mercury: { th: "ดูอ่อนกว่าวัย สดใสคล่องแคล่ว", en: "youthful fresh lively look" },
  jupiter: { th: "ภูมิฐาน รูปร่างสมบูรณ์ อบอุ่นน่าเกรงใจ", en: "dignified warm presence with a full well-built figure" },
  venus: { th: "งดงาม มีเสน่ห์ แต่งตัวมีรสนิยม", en: "beautiful refined charming appearance with tasteful style" },
  saturn: { th: "สูงโปร่ง/เพรียว ดูเป็นผู้ใหญ่กว่าวัย", en: "tall lean composed mature appearance" },
  rahu: { th: "ลุคแปลกใหม่สะดุดตา อาจมีกลิ่นอายต่างถิ่น", en: "distinctive striking look with an exotic touch" },
  ketu: { th: "เรียบง่าย สมถะ ดูลึกซึ้ง", en: "simple understated serene look" },
};

export const HOUSE_MEANING_TH: Record<number, string> = {
  1: "ตัวตน/ร่างกาย", 2: "ทรัพย์/ครอบครัว/วาจา", 3: "ความกล้า/การสื่อสาร", 4: "บ้าน/แม่/ความสุขใจ",
  5: "บุตร/ความรัก/ความคิดสร้างสรรค์", 6: "อุปสรรค/งานบริการ/สุขภาพ", 7: "คู่ครอง/หุ้นส่วน",
  8: "การเปลี่ยนแปลงลึก/มรดก", 9: "โชค/ครู/เดินทางไกล", 10: "การงาน/ชื่อเสียง",
  11: "ลาภ/เครือข่าย/เพื่อน", 12: "ต่างแดน/การปล่อยวาง/ค่าใช้จ่าย",
};

const BENEFICS: Graha[] = ["jupiter", "venus"];
const MALEFICS: Graha[] = ["saturn", "mars", "rahu", "ketu", "sun"];

// ---------------------------------------------------------------------------
// ชั้นเนื้อคู่ Jyotish แบบประกอบเสร็จ (เรียกจาก /api/soulmate)
// ---------------------------------------------------------------------------

export const JYOTISH_CAVEAT =
  "ชั้น Jyotish สากลเป็นชั้นเสริมจากโหราศาสตร์อินเดียคลาสสิก (BPHS/Jaimini ฉบับแปล) — " +
  "ไม่ได้มาจากตำราต้นทางของระบบ · ตารางลักษณะคู่เป็นธรรมเนียมนักปฏิบัติที่ต่อยอดจากคัมภีร์ · " +
  "ตำแหน่งดาวใกล้ขอบราศี/ขอบช่อง D9 อาจคลาดได้ · ธรรมเนียมที่เลือกใช้: karaka 8 ดวง · " +
  "ราหู mean node · arudha แบบมีข้อยกเว้น (สำนักอื่นอาจให้ผลต่าง)";

export const JYOTISH_TIMING_CAVEAT =
  "ช่วงเวลาจากทศาเป็น 'จังหวะที่เรื่องคู่มีน้ำหนัก' ตามหลัก Vimshottari — ไม่ใช่คำการันตีว่าจะพบคู่ " +
  "และไม่ได้ระบุตัวบุคคล";

export interface SoulmateJyotish {
  lagnaSign: ZodiacSign;
  seventhSign: ZodiacSign;
  seventhLord: { grahaTh: string; house: number; houseMeaningTh: string; arenaTh: string };
  planetsIn7th: { grahaTh: string; traitTh: string }[];
  /** แนวโน้มรูปลักษณ์เพิ่มจากดาวในภพ 7 (ชั้นเสริม — ไม่แทน ค.1) · en ใช้ป้อน prompt ภาพ */
  appearance: { th: string[]; en: string[] };
  darakaraka: { grahaTh: string; archetypeTh: string };
  upapada: {
    signTh: ZodiacSign;
    second: { signTh: ZodiacSign; occupantsTh: string[]; toneTh: string };
  };
  d9: {
    venus: { signTh: ZodiacSign; dignity: Dignity };
    seventhLord: { grahaTh: string; signTh: ZodiacSign; dignity: Dignity };
    noteTh: string;
  };
  nakshatra: { nameTh: string; idx: number };
  currentDasha: { mdTh: string; adTh: string } | null;
  windows: { fromTh: string; toTh: string; reasonTh: string }[];
  caveats: string[];
}

function thaiDate(ms: number): string {
  const d = new Date(ms + 7 * 3600000);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

/**
 * ประกอบชั้น Jyotish เต็มสำหรับโหมดเนื้อคู่ (ต้องมีเวลาเกิด — ลัคนา+ดวงจันทร์แม่นพอ)
 * @param userGender เพศผู้ใช้ ("female" → เพิ่มพฤหัสเป็น karaka สามีตามธรรมเนียม Strī Jātaka)
 */
export function soulmateJyotish(
  jd: number,
  birthUtcMs: number,
  lagnaSign: ZodiacSign,
  nowMs: number,
  userGender?: string | null
): SoulmateJyotish {
  const chart = buildJyotishChart(jd, lagnaSign);
  const seventhIdx = pymod(chart.lagnaIdx + 6, 12);
  const seventhLordGraha = SIGN_LORD[seventhIdx];
  const lordPos = chart.positions[seventhLordGraha];

  const in7 = (Object.values(chart.positions) as GrahaPos[]).filter((p) => p.house === 7);
  const dk = darakaraka(chart);

  const ulIdx = upapadaLagna(chart);
  const ul2Idx = pymod(ulIdx + 1, 12);
  const ul2Occupants = (Object.values(chart.positions) as GrahaPos[]).filter((p) => p.signIdx === ul2Idx);
  const hasBenefic = ul2Occupants.some((p) => BENEFICS.includes(p.graha));
  const hasMalefic = ul2Occupants.some((p) => MALEFICS.includes(p.graha));
  const ul2Lord = SIGN_LORD[ul2Idx];
  const ul2LordDignity = dignityInSign(ul2Lord, chart.positions[ul2Lord].signIdx);
  const ul2Tone =
    ul2Occupants.length === 0
      ? ul2LordDignity !== "neutral"
        ? "ไม่มีดาว — เจ้าเรือนแข็งแรง ถือเป็นสัญญาณความยั่งยืนของชีวิตคู่ (JS 1.4.8)"
        : "ไม่มีดาว — อ่านจากเจ้าเรือนเป็นหลัก โทนกลางๆ"
      : hasBenefic && !hasMalefic
        ? "มีดาวศุภเคราะห์หนุน — สัญญาณเกื้อหนุนความยั่งยืนของชีวิตคู่"
        : hasMalefic && !hasBenefic
          ? "มีดาวบาปเคราะห์ — เป็นจุดที่ต้องช่วยกันดูแลความสัมพันธ์ระยะยาว (ไม่ใช่คำตัดสิน)"
          : "มีทั้งดาวหนุนและดาวท้าทาย — ชีวิตคู่มีทั้งจุดแข็งและจุดที่ต้องดูแล";

  const venusD9 = navamsaIdx(chart.positions.venus.lon);
  const lordD9 = navamsaIdx(lordPos.lon);

  // จังหวะเรื่องคู่: เจ้าเรือน 7 · ศุกร์ · ดาวในภพ 7 · เจ้าเรือน UL · DK (+พฤหัสสำหรับดวงหญิง)
  const favorable = new Set<Graha>([seventhLordGraha, "venus", ...in7.map((p) => p.graha), SIGN_LORD[ulIdx], dk]);
  if (userGender === "female") favorable.add("jupiter");

  const nak = moonNakshatra(chart.positions.moon.lon);
  const mds = vimshottariMahadashas(chart.positions.moon.lon, birthUtcMs);
  const curMd = mds.find((m) => nowMs >= m.fromMs && nowMs < m.toMs) ?? null;
  const curAd = curMd ? antardashas(curMd).find((a) => nowMs >= a.fromMs && nowMs < a.toMs) ?? null : null;
  const windows = marriageWindows(mds, favorable, nowMs).map((w) => ({
    fromTh: thaiDate(w.fromMs), toTh: thaiDate(w.toMs), reasonTh: w.reasonTh,
  }));

  return {
    lagnaSign,
    seventhSign: signTh(seventhIdx),
    seventhLord: {
      grahaTh: GRAHA_TH[seventhLordGraha],
      house: lordPos.house,
      houseMeaningTh: HOUSE_MEANING_TH[lordPos.house],
      arenaTh: SEVENTH_LORD_ARENA_TH[lordPos.house],
    },
    planetsIn7th: in7.map((p) => ({ grahaTh: GRAHA_TH[p.graha], traitTh: PLANET_IN_7TH_TH[p.graha] })),
    appearance: {
      th: in7.map((p) => `${GRAHA_TH[p.graha]}: ${PLANET_APPEARANCE[p.graha].th}`),
      en: in7.slice(0, 3).map((p) => PLANET_APPEARANCE[p.graha].en),
    },
    darakaraka: { grahaTh: GRAHA_TH[dk], archetypeTh: DK_ARCHETYPE_TH[dk] },
    upapada: {
      signTh: signTh(ulIdx),
      second: { signTh: signTh(ul2Idx), occupantsTh: ul2Occupants.map((p) => GRAHA_TH[p.graha]), toneTh: ul2Tone },
    },
    d9: {
      venus: { signTh: signTh(venusD9), dignity: dignityInSign("venus", venusD9) },
      seventhLord: { grahaTh: GRAHA_TH[seventhLordGraha], signTh: signTh(lordD9), dignity: dignityInSign(seventhLordGraha, lordD9) },
      noteTh:
        dignityInSign("venus", venusD9) !== "neutral" || dignityInSign(seventhLordGraha, lordD9) !== "neutral"
          ? "ดาวฝ่ายคู่แข็งแรงใน D9 — สัญญาณหนุนคุณภาพชีวิตคู่ระยะยาว"
          : "ดาวฝ่ายคู่ใน D9 โทนกลาง — คุณภาพชีวิตคู่ขึ้นกับการดูแลกันมากกว่าแต้มดวง",
    },
    nakshatra: { nameTh: nak.nameTh, idx: nak.idx + 1 },
    currentDasha: curMd ? { mdTh: GRAHA_TH[curMd.lord], adTh: curAd ? GRAHA_TH[curAd.lord] : "-" } : null,
    windows,
    caveats: [JYOTISH_CAVEAT, JYOTISH_TIMING_CAVEAT],
  };
}
