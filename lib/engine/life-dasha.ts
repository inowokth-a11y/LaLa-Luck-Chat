/**
 * ยุคชีวิต (Vimshottari Mahadasha) — รอบ 2 ของแผนแม่บท Jyotish 4 โหมด (24 ส.ค. 2569)
 * ใช้กับ /fortune + คำทำนายแรกพบ — ชั้นเสริมสากล ไม่แทนชั้นตำรา/ปีส่วนบุคคล
 *
 * แหล่งกฎ (งานวิจัย cross-check ≥2 แหล่ง/ข้อ — รายงานเต็มในบทสนทนา):
 * - ธีมมหาทศารายดาว: Phaladeepika บท 19 (wisdomlib แปล) + JagannathHora + BPHS (astrosutras)
 * - หลักคู่ MD/AD: เจ้ามหาทศา = บทของชีวิต · เจ้าอันตร = สีของช่วงย่อย · มิตร-ศัตรูปรับโทน
 *   (Naisargika Maitri จาก BPHS — ตาราง**ไม่สมมาตร** ใช้ทิศทาง "มุมมองของเจ้ามหาทศาต่อเจ้าอันตร")
 * - รอยต่อทศา (dasha-sandhi): ใช้เกณฑ์อันตรทศาสุดท้าย/แรก (ธรรมเนียมนักปฏิบัติกระแสหลัก —
 *   สำนักต่างกันนิยามความยาวต่างกัน มี caveat)
 * - ราหู/เกตุในตารางมิตร-ศัตรู = ธรรมเนียมยุคหลัง ไม่ใช่ BPHS ตรง (caveat)
 *
 * 🔴 กรอบความรับผิดชอบ (จากแหล่งวิชาการเอง — ไม่ใช่การประนีประนอมของเรา):
 * - ห้ามกฎมรณะ (maraka) เด็ดขาด — ไม่มีคำว่า ตาย/อายุขัย/โรคร้ายแรง ในทุก string (เทสต์ล็อก)
 * - ทศาเสาร์/ราหู/เกตุ/อังคาร เฟรมเป็น "งานหนัก/วินัย/การเปลี่ยนแปลง" พร้อมด้านโอกาสเสมอ
 *   ("แรงเสียดทานไม่ใช่คำตัดสิน" — Paramarsh ระบุตรง)
 *
 * ✅ คำนวณบนเอนจิน Vimshottari ที่ verify แล้ว (นักษัตรตรง Swiss Ephemeris 324/324)
 */

import {
  vimshottariMahadashas, antardashas, moonNakshatra, GRAHA_TH,
  type Graha, type DashaPeriod,
} from "./jyotish";

export interface MdTheme {
  /** ด้านชีวิตที่ถูกจุดไฟในยุคนี้ */
  areasTh: string;
  /** โอกาสตามตำรา */
  upTh: string;
  /** จุดที่ต้องดูแล (เฟรมเชิงพัฒนา ไม่ใช่คำขู่) */
  careTh: string;
}

export const MD_THEME_TH: Record<Graha, MdTheme> = {
  ketu: {
    areasTh: "การปล่อยวาง งานเบื้องหลัง/งานวิจัย และการเติบโตทางจิตใจ",
    upTh: "ได้ความเข้าใจลึก ตัดสิ่งที่หมดหน้าที่ออกจากชีวิต และก้าวหน้าทางเส้นทางสายใน",
    careTh: "อาจรู้สึกเคว้งหรือห่างจากสิ่งคุ้นเคย — ตำราให้อ่านเป็น 'การคลายความยึด' ไม่ใช่การสูญเสีย",
  },
  venus: {
    areasTh: "ความรัก ความสัมพันธ์ ศิลปะ ความงาม และความสะดวกสบาย",
    upTh: "จังหวะดีของเรื่องคู่ งานสายศิลป์/ดีไซน์ ทรัพย์และของมีค่า รายได้จากการค้า",
    careTh: "ระวังความฟุ้งเฟ้อและการตามใจตัวเองเกินพอดี",
  },
  sun: {
    areasTh: "อำนาจ เกียรติยศ หน้าที่การงาน และความชัดเจนในตัวตน",
    upTh: "โอกาสเลื่อนตำแหน่ง การยอมรับจากผู้ใหญ่/หน่วยงาน — ยุคสั้น (6 ปี) แต่เข้มข้น",
    careTh: "ระวังอีโก้และการปะทะกับผู้มีอำนาจ · อย่าลืมแบ่งเวลาพัก",
  },
  moon: {
    areasTh: "จิตใจ ครอบครัว บ้าน และการพบปะผู้คน",
    upTh: "ความสงบใจ เรื่องบ้าน/ที่อยู่ งานที่ได้ดูแลผู้คน การย้ายถิ่น/เดินทาง",
    careTh: "อารมณ์ไวขึ้นกว่าปกติ — พักผ่อนให้พอ แล้วใช้ความละเอียดอ่อนเป็นจุดแข็ง",
  },
  mars: {
    areasTh: "พลังงาน การแข่งขัน อสังหาริมทรัพย์ และทักษะเชิงเทคนิค",
    upTh: "กล้าตัดสินใจ ได้เรื่องที่ดิน/บ้าน ชนะการแข่งขัน งานสายวิศวะ/กีฬาเด่น",
    careTh: "ใจร้อนและแรงเสียดทานกับคนรอบข้าง — ระบายพลังผ่านการลงมือทำและการออกกำลัง",
  },
  rahu: {
    areasTh: "ความเปลี่ยนแปลงใหญ่ ต่างถิ่น/ต่างประเทศ เทคโนโลยี และความทะเยอทะยาน",
    upTh: "ก้าวกระโดดนอกกรอบ ชื่อเสียง เส้นทางใหม่ที่ไม่เคยลอง — ยุคยาว (18 ปี) ของการขยับเพดาน",
    careTh: "ระวังความหมกมุ่นและทางลัด — เดินเร็วได้แต่ต้องโปร่งใส",
  },
  jupiter: {
    areasTh: "ปัญญา การศึกษา ครู/ที่ปรึกษา บุตร และความมั่งคั่งจากความรู้",
    upTh: "การขยายตัวแบบค่อยเป็นค่อยไป เกียรติยศ งานสอน/กฎหมาย/ที่ปรึกษา และบุญกุศล",
    careTh: "ระวังความชะล่าใจและการขยายเกินตัวในช่วงที่ทุกอย่างดูง่าย",
  },
  saturn: {
    areasTh: "วินัย ความรับผิดชอบ และการสร้างโครงสร้างชีวิตระยะยาว",
    upTh: "ความสำเร็จที่มั่นคงจากความเพียร อำนาจบริหาร งานระบบ/อสังหาฯ — ครึ่งหลังของยุคมักนิ่งกว่าครึ่งแรก",
    careTh: "งานหนักและความล่าช้าคือครูของยุคนี้ — ตำราว่าเสาร์ 'ให้ช้าแต่ไม่ปฏิเสธ' สิ่งที่ลงแรงจริง",
  },
  mercury: {
    areasTh: "การสื่อสาร การค้า การเรียนรู้ และเครือข่าย",
    upTh: "ก้าวหน้าด้วยไหวพริบ ธุรกิจ/การเจรจาเด่น ได้มิตรสหายและคำชื่นชมจากผู้รู้",
    careTh: "ความคิดฟุ้งและข้อตกลงที่หละหลวม — เช็กรายละเอียดก่อนตกลงทุกครั้ง",
  },
};

/** Naisargika Maitri (BPHS) — ทิศทาง: แถว = ผู้มอง · ⚠️ แถวราหู/เกตุ = ธรรมเนียมยุคหลัง */
const MAITRI: Record<Graha, { friends: Graha[]; enemies: Graha[] }> = {
  sun: { friends: ["moon", "mars", "jupiter"], enemies: ["venus", "saturn"] },
  moon: { friends: ["sun", "mercury"], enemies: [] },
  mars: { friends: ["sun", "moon", "jupiter"], enemies: ["mercury"] },
  mercury: { friends: ["sun", "venus"], enemies: ["moon"] },
  jupiter: { friends: ["sun", "moon", "mars"], enemies: ["mercury", "venus"] },
  venus: { friends: ["mercury", "saturn"], enemies: ["sun", "moon"] },
  saturn: { friends: ["mercury", "venus"], enemies: ["sun", "moon", "mars"] },
  rahu: { friends: ["jupiter", "venus", "saturn"], enemies: ["sun", "moon", "mars"] },
  ketu: { friends: ["mars", "venus", "saturn"], enemies: ["sun", "moon"] },
};

export type Harmony = "self" | "friend" | "enemy" | "neutral";

/** มุมมองของเจ้ามหาทศาต่อเจ้าอันตรทศา (ทิศทางตามธรรมเนียม — ตารางไม่สมมาตร) */
export function maitriView(md: Graha, ad: Graha): Harmony {
  if (md === ad) return "self";
  if (MAITRI[md].friends.includes(ad)) return "friend";
  if (MAITRI[md].enemies.includes(ad)) return "enemy";
  return "neutral";
}

export const HARMONY_TH: Record<Harmony, string> = {
  self: "ช่วงย่อยของเจ้ายุคเอง — ธีมหลักเข้มข้นเต็มที่",
  friend: "เจ้าช่วงย่อยเป็นมิตรกับเจ้ายุค — จังหวะไหลลื่น เสริมธีมหลัก",
  enemy: "เจ้าช่วงย่อยเป็นศัตรูกับเจ้ายุค — มีแรงเสียดทาน งานคืบแต่ต้องออกแรง (เป็นระดับความยาก ไม่ใช่คำตัดสินว่าร้าย)",
  neutral: "เจ้าช่วงย่อยเป็นกลางกับเจ้ายุค — โทนผสม เดินได้ตามปัจจัยแวดล้อม",
};

export const LIFE_DASHA_CAVEAT =
  "ยุคชีวิต (มหาทศา) เป็นชั้น Jyotish สากล — ชั้นเสริม ไม่ใช่ตำราหลักของระบบ · ธีมเป็นภาพรวมกลาง: " +
  "ตำราคลาสสิกกำหนดให้ผลจริงขึ้นกับสภาพดาวเจ้าทศาในดวงกำเนิด (เรือน อุจ-นิจ ดาวร่วม/มอง) เสมอ · " +
  "เป็นจังหวะพลังงาน ไม่ใช่กำหนดการเหตุการณ์ล่วงหน้า";

export const SANDHI_CAVEAT =
  "ช่วงรอยต่อระหว่างยุค (ทศาสันธิ) — ระบบใช้เกณฑ์อันตรทศาสุดท้าย/แรกตามธรรมเนียมกระแสหลัก " +
  "(สำนักต่างกันนิยามความยาวต่างกัน) · คำแนะนำมาตรฐาน: ช่วงนี้เหมาะสังเกตมากกว่าผูกมัดเรื่องใหญ่";

function thaiDate(ms: number): string {
  const d = new Date(ms + 7 * 3600000);
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

export interface LifeDasha {
  nakshatraTh: string;
  current: {
    lordTh: string;
    fromTh: string;
    toTh: string;
    /** ความคืบหน้าของยุค 0-100 */
    progressPct: number;
    theme: MdTheme;
  };
  sub: {
    lordTh: string;
    fromTh: string;
    toTh: string;
    harmony: Harmony;
    harmonyTh: string;
    /** สีของช่วงย่อยจากธีมเจ้าอันตร (ย่อ) */
    colorTh: string;
  };
  /** อยู่ในช่วงรอยต่อยุค (อันตรสุดท้ายของยุคเดิม/อันตรแรกของยุคใหม่ที่ไม่ใช่ยุคแรกของชีวิต) */
  inSandhi: boolean;
  next: { lordTh: string; startTh: string; areasTh: string };
  caveats: string[];
}

/** ยุคชีวิต ณ เวลาปัจจุบัน — null เมื่อหายุคไม่เจอ (อายุเกินรอบ 120 ปีของตาราง) */
export function lifeDasha(moonSiderealLon: number, birthUtcMs: number, nowMs: number): LifeDasha | null {
  const mds = vimshottariMahadashas(moonSiderealLon, birthUtcMs);
  const idx = mds.findIndex((m) => nowMs >= m.fromMs && nowMs < m.toMs);
  if (idx < 0) return null;
  const md = mds[idx];
  const ads = antardashas(md);
  const adIdx = ads.findIndex((a) => nowMs >= a.fromMs && nowMs < a.toMs);
  const ad = ads[adIdx] ?? ads[ads.length - 1];
  const next: DashaPeriod | null = mds[idx + 1] ?? null;

  // รอยต่อ: อันตรสุดท้ายของยุคปัจจุบัน หรืออันตรแรกของยุคที่ไม่ใช่ยุคแรกในชีวิต
  const inSandhi = adIdx === ads.length - 1 || (adIdx === 0 && idx > 0);

  const harmony = maitriView(md.lord, ad.lord);
  return {
    nakshatraTh: moonNakshatra(moonSiderealLon).nameTh,
    current: {
      lordTh: GRAHA_TH[md.lord],
      fromTh: thaiDate(md.fromMs),
      toTh: thaiDate(md.toMs),
      progressPct: Math.round(((nowMs - md.fromMs) / (md.toMs - md.fromMs)) * 100),
      theme: MD_THEME_TH[md.lord],
    },
    sub: {
      lordTh: GRAHA_TH[ad.lord],
      fromTh: thaiDate(ad.fromMs),
      toTh: thaiDate(ad.toMs),
      harmony,
      harmonyTh: HARMONY_TH[harmony],
      colorTh: MD_THEME_TH[ad.lord].areasTh,
    },
    inSandhi,
    next: next
      ? { lordTh: GRAHA_TH[next.lord], startTh: thaiDate(next.fromMs), areasTh: MD_THEME_TH[next.lord].areasTh }
      : { lordTh: "-", startTh: "-", areasTh: "-" },
    caveats: inSandhi ? [LIFE_DASHA_CAVEAT, SANDHI_CAVEAT] : [LIFE_DASHA_CAVEAT],
  };
}
