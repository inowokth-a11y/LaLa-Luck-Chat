/**
 * ฤกษ์บน (นภดลฤกษ์) — ดวงจันทร์เสวยนักษัตร 27 ฤกษ์ → นพเคราะห์ฤกษ์ทั้ง 9 (Logic 3 ชั้นที่ 3)
 * งานวิจัยรอบ 1 ของแผนแม่บท Jyotish 4 โหมด (24 ส.ค. 2569 — cross-check ≥2 แหล่ง/ข้อ)
 *
 * แหล่งกฎ (ตรงกัน ≥3 แหล่งอิสระ): วิกิพีเดียไทย "ดาวนักขัตฤกษ์" · Sanook Horoscope ·
 * aduang.co · TrueID · fengshuix · อาศรมศรีจักรนารท (นิยามฤกษ์บน/ล่าง)
 * - ฤกษ์ที่ 1 = อัศวินี เริ่ม 0° เมษนิรายนะ · ช่องละ 13°20′ · จันทร์เสวย ~1 ฤกษ์/วัน
 * - กลุ่มทั้ง 9 วนเป็นวงจร: กลุ่ม k = ฤกษ์ที่ k, k+9, k+18 (ลำดับ ทลิทโท→มหัทธโน→โจโร→
 *   ภูมิปาโล→เทศาตรี→เทวี→เพชฌฆาต→ราชา→สมโณ)
 * - บูรณะฤกษ์ 6 กลุ่มใช้งานมงคลได้ · โจโร/เพชฌฆาต (ฉินทฤกษ์) + เทศาตรี (พินทุฤกษ์)
 *   เลี่ยงงานมงคล ใช้เฉพาะทาง
 *
 * 🔴 จงใจไม่แสดง "ดาวเจ้าฤกษ์" — สำนักไทย (เรียงทักษา) กับสำนักแขก (เจ้านักษัตร Vimshottari)
 * ให้ดาวคนละดวง ขัดกันตรงๆ (โน้ตเก่าใน CLAUDE.md §3.6 "ทลิทโท=เกตุ" คือระบบแขก ·
 * ระบบไทยให้อาทิตย์) — ฟังก์ชันไม่ต้องใช้ดาวเจ้าฤกษ์ จึงตัดทิ้งเพื่อไม่ต้องเลือกข้าง
 *
 * ✅ ดาราศาสตร์: ใช้ moonEclipticLongitude (verify กับ Swiss Ephemeris — นักษัตรตรง 324/324)
 * ⚠️ การจับคู่กิจกรรมสมัยใหม่ (เช่น ทะเบียนรถ) เป็นการตีความจากรายการกิจกรรมในตำรา — มี caveat
 */

import { moonEclipticLongitude } from "./daily";
import { lahiriAyanamsa } from "./ascendant";

const pymod = (a: number, n: number) => ((a % n) + n) % n;
const NAK_W = 360 / 27;

/** ชื่อนักษัตรไทย 27 ฤกษ์ (สะกดตามวิกิพีเดียไทย "ดาวนักขัตฤกษ์") */
export const RERK_NAK_TH = [
  "อัศวินี", "ภรณี", "กฤติกา", "โรหิณี", "มฤคศิระ", "อาทรา", "ปุนัพสุ", "ปุษยะ", "อาศเลษะ",
  "มาฆะ", "บุรพผลคุนี", "อุตรผลคุนี", "หัสตะ", "จิตระ", "สวาติ", "วิศาขะ", "อนุราธะ", "เชษฐา",
  "มูละ", "ปุรพษาฒ", "อุตราษาฒ", "ศรวณะ", "ธนิษฐะ", "ศตภิษัช", "บุรพภัทรบท", "อุตรภัทรบท", "เรวดี",
] as const;

export type RerkFit = "good" | "avoid" | "conditional" | "neutral";

export interface RerkGroup {
  key: string;
  nameTh: string;
  /** ประเภทตามตำรา (บูรณะฤกษ์ = มงคลได้ · ฉินทฤกษ์/พินทุฤกษ์ = เลี่ยงงานมงคล) */
  kindTh: string;
  meaningTh: string;
  goodForTh: string;
  cautionTh: string | null;
  /** ความเหมาะรายหมวดของ /timing (⚠️ การจับคู่หมวดสมัยใหม่เป็นการตีความ — ดู RERK_CAVEAT) */
  fits: Record<string, RerkFit>;
  /** จูนจากการทดลอง 45 วัน (24 ส.ค. 2569): เฉพาะกลุ่มที่ทุกแหล่งตรงกันว่า "ห้ามงานมงคล"
   *  (ฉินทฤกษ์: โจโร/เพชฌฆาต) ถึงผลัก verdict เป็น "ควรเลี่ยง" · เทศาตรี (สำนักไม่ตรงกัน)
   *  หักคะแนนแต่ไม่ผลัก verdict — ไม่งั้นเกือบครึ่งเดือนถูกตีตราเลี่ยงเกินตำราสายกลาง */
  hardAvoid: boolean;
}

// กลุ่มที่ k (0-8) = ฤกษ์ที่ k+1, k+10, k+19 — ตารางจากงานวิจัย (ห้ามแก้ความหมายเองโดยไม่มีแหล่ง)
export const RERK_GROUPS: RerkGroup[] = [
  {
    key: "talittho", nameTh: "ทลิทโทฤกษ์", kindTh: "บูรณะฤกษ์", meaningTh: "ผู้ขอ ผู้มักน้อย",
    goodForTh: "การร้องขอทุกชนิด: ขอหมั้น ทวงหนี้ กู้ยืม สมัครงาน ยื่นเรื่องร้องทุกข์",
    cautionTh: null,
    fits: { open_company: "neutral", car_registration: "neutral", housewarming: "neutral", negotiation: "conditional", general: "good" },
    hardAvoid: false,
  },
  {
    key: "mahatthano", nameTh: "มหัทธโนฤกษ์", kindTh: "บูรณะฤกษ์", meaningTh: "เศรษฐี ผู้มั่งมี",
    goodForTh: "เปิดกิจการ/บริษัท ธุรกิจการเงิน ขึ้นบ้านใหม่ แต่งงาน ปลูกสร้าง — งานมงคลแทบทุกชนิด",
    cautionTh: null,
    fits: { open_company: "good", car_registration: "good", housewarming: "good", negotiation: "good", general: "good" },
    hardAvoid: false,
  },
  {
    key: "choro", nameTh: "โจโรฤกษ์", kindTh: "ฉินทฤกษ์ (แตกขาด)", meaningTh: "โจร ผู้ใช้กำลัง",
    goodForTh: "จู่โจม แข่งขัน ต่อสู้คดี เจรจาแตกหัก",
    cautionTh: "ห้ามงานมงคล ห้ามเริ่มการลงทุน",
    fits: { open_company: "avoid", car_registration: "avoid", housewarming: "avoid", negotiation: "conditional", general: "avoid" },
    hardAvoid: true,
  },
  {
    key: "bhumipalo", nameTh: "ภูมิปาโลฤกษ์", kindTh: "บูรณะฤกษ์", meaningTh: "ผู้รักษาแผ่นดิน",
    goodForTh: "งานที่ต้องการความมั่นคงถาวร: ที่ดิน ก่อสร้าง ขึ้นบ้าน เซ็นสัญญาระยะยาว งานมงคลทั่วไป",
    cautionTh: null,
    fits: { open_company: "good", car_registration: "good", housewarming: "good", negotiation: "good", general: "good" },
    hardAvoid: false,
  },
  {
    key: "thesatri", nameTh: "เทศาตรีฤกษ์", kindTh: "พินทุฤกษ์ (อกแตก)", meaningTh: "ผู้ท่องเที่ยว ข้ามถิ่น",
    goodForTh: "ค้าขายข้ามถิ่น โรงแรม ร้านอาหาร สถานบันเทิง ตลาด ย้ายที่อยู่",
    cautionTh: "ไม่ใช่ฤกษ์มงคลแท้ — เลี่ยงงานมงคลถาวร (ใช้เฉพาะธุรกิจบริการ/บันเทิง)",
    fits: { open_company: "conditional", car_registration: "avoid", housewarming: "avoid", negotiation: "avoid", general: "avoid" },
    hardAvoid: false,
  },
  {
    key: "thewi", nameTh: "เทวีฤกษ์", kindTh: "บูรณะฤกษ์", meaningTh: "นางพญา ความงาม เสน่ห์",
    goodForTh: "หมั้น สมรส งานศิลปะ/ความงาม อัญมณี กิจการฝ่ายหญิง",
    cautionTh: null,
    fits: { open_company: "neutral", car_registration: "neutral", housewarming: "neutral", negotiation: "neutral", general: "good" },
    hardAvoid: false,
  },
  {
    key: "phetchakhat", nameTh: "เพชฌฆาตฤกษ์", kindTh: "ฉินทฤกษ์ (แตกขาด)", meaningTh: "ผู้ตัด ผู้ประหาร",
    goodForTh: "ฟันฝ่าอุปสรรค ตัดสินคดี ผ่าตัด งานตัดขาด/เลิกรา",
    cautionTh: "ห้ามงานมงคลทุกชนิด",
    fits: { open_company: "avoid", car_registration: "avoid", housewarming: "avoid", negotiation: "avoid", general: "avoid" },
    hardAvoid: true,
  },
  {
    key: "racha", nameTh: "ราชาฤกษ์", kindTh: "บูรณะฤกษ์", meaningTh: "พระราชา ผู้มีอำนาจ",
    goodForTh: "งานพิธีใหญ่ รับตำแหน่ง เข้าหาผู้ใหญ่ งานมงคลชั้นสูง ปลูกเรือน",
    cautionTh: "บางตำราว่าสามัญชนควรเว้น (สงวนแด่งานเจ้านาย) — ใช้ได้แต่ควรทราบ",
    fits: { open_company: "good", car_registration: "neutral", housewarming: "good", negotiation: "good", general: "good" },
    hardAvoid: false,
  },
  {
    key: "samano", nameTh: "สมโณฤกษ์", kindTh: "จัตตุรฤกษ์", meaningTh: "นักบวช ความสงบ",
    goodForTh: "พิธีศาสนา บวช ทำบุญ หล่อพระ เข้าศึกษา งานกุศล",
    cautionTh: "ไม่เด่นสำหรับงานการค้าเชิงรุก",
    fits: { open_company: "neutral", car_registration: "neutral", housewarming: "neutral", negotiation: "neutral", general: "good" },
    hardAvoid: false,
  },
];

export const RERK_CAVEAT =
  "ฤกษ์บนคำนวณจากตำแหน่งดวงจันทร์จริง ณ ~เที่ยงวันไทย — ดวงจันทร์ย้ายฤกษ์ได้ระหว่างวัน " +
  "(เสวย ~1 ฤกษ์/วัน) ฤกษ์ช่วงเช้า/ค่ำอาจต่างจากนี้ · การจับคู่ฤกษ์กับกิจกรรมสมัยใหม่ " +
  "(เช่น ทะเบียนรถ) เป็นการตีความจากรายการกิจกรรมในตำรา";

export interface DayRerk {
  /** ฤกษ์ที่ 1-27 */
  no: number;
  nakTh: string;
  group: RerkGroup;
  /** ความเหมาะกับหมวดงานที่ขอ (ถ้าไม่ระบุหมวด = ใช้ general) */
  fit: RerkFit;
  fitNoteTh: string;
}

/** ฤกษ์บนของวัน — ดวงจันทร์นิรายนะ ณ 12:00 ไทย (05:00 UTC — แพทเทิร์นเดียวชั้นกาลกิณี) */
export function moonRerkForDay(y: number, m: number, d: number, activityKey = "general"): DayRerk {
  const jd = Date.UTC(y, m - 1, d, 5, 0, 0) / 86400000 + 2440587.5;
  const lon = pymod(moonEclipticLongitude(jd) - lahiriAyanamsa(jd), 360);
  const idx = Math.floor(lon / NAK_W); // 0-26
  const group = RERK_GROUPS[idx % 9];
  const fit = group.fits[activityKey] ?? group.fits.general;
  const fitNoteTh =
    fit === "good"
      ? `${group.nameTh}เกื้อหนุนงานหมวดนี้ (${group.meaningTh})`
      : fit === "avoid"
        ? `${group.nameTh} — ${group.cautionTh ?? "ควรเลี่ยงงานมงคล"}`
        : fit === "conditional"
          ? `${group.nameTh}ใช้ได้เฉพาะบางกรณี: ${group.goodForTh}`
          : `${group.nameTh}โทนกลางกับงานหมวดนี้ (เด่นด้าน: ${group.goodForTh})`;
  return { no: idx + 1, nakTh: RERK_NAK_TH[idx], group, fit, fitNoteTh };
}
