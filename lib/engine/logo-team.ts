// คะแนนสไตล์โลโก้แบบ "ทั้งทีม" + ทิศสำนักงาน (ผู้ใช้เคาะ 22 ส.ค. 2569)
//
// หลัก §16: ประกอบเฉพาะชิ้นที่มีสูตรจริง — ธาตุบุคคลจาก calculateElementSeed (verify แล้ว) ·
// เคมีจาก wuXingScore (golden test) · ทิศจาก DIRECTION_TO_ELEMENT (Logic 7) · ธาตุชื่อแบรนด์
// จาก nameElement (Logic 19 ⚠️ ตารางกลุ่มอักษรยังไม่ verify — caveat บังคับเมื่อใช้)
//
// ⚠️ "คะแนนรวมทีม" ใช้ค่าต่ำสุดของสมาชิก (min) โดยเจตนา — สไตล์ที่ดีต่อทีมต้องไม่พิฆาตใครสักคน
//    (ค่าเฉลี่ยจะกลบจุดพิฆาตของคนหนึ่งด้วยคะแนนดีของอีกคน) · การรวมเป็นสูตรเสริมออกแบบเอง

import {
  calculateElementSeed,
  wuXingScore,
  THAI_LABEL_5,
  type Element4,
  type Element5,
} from "./element";
import { thaiDayOfWeek } from "./card-id";
import { analyzeNameTaksa, type TaksaNameResult } from "./taksa-naming";
import { DIRECTION_TO_ELEMENT, ELEMENT_TO_COLORS, type Direction } from "./fengshui";
import { nameElement } from "./naming";
import { bridgeElement } from "./network-holistic";

export const LOGO_STYLES: readonly Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

/** จำนวนคนสูงสุดในทีม (เจ้าของ + หุ้นส่วน) — กันฟอร์มบวม */
export const MAX_TEAM_MEMBERS = 5;

/** ทิศที่เลือกได้ (8 ทิศ — "กลาง" ไม่ใช่ทิศที่อาคารหันไป) */
export const OFFICE_DIRECTIONS: readonly Direction[] = [
  "เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้",
  "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ",
];

/** วิธีดูทิศสำนักงาน/หน้าร้าน — แสดงใน <details> ข้างช่องเลือก (ผู้ใช้ขอ 22 ส.ค. 2569) */
export const OFFICE_DIRECTION_HELP: string[] = [
  "ยืนที่ประตูหน้าร้าน/สำนักงาน หันหน้าออกไปทางถนนหรือทางเข้าหลัก — ทิศที่คุณมองออกไปคือ \"ทิศที่หันไป\"",
  "เปิดแอปเข็มทิศบนมือถือ (มีติดเครื่องทั้ง iPhone/Android) ถือมือถือชี้ไปทางที่มองออก แล้วอ่านค่าทิศ",
  "หรือเปิด Google Maps หาอาคารของคุณ — บนแผนที่ด้านบนคือทิศเหนือเสมอ ดูว่าหน้าอาคารหันไปด้านไหนของแผนที่",
  "ถ้าอาคารอยู่ตรงมุม/มีหลายทาง ให้ยึดประตูที่ลูกค้าเข้าเป็นหลัก",
];

export interface TeamMember {
  label: string;
  dominant: Element4;
  missing: Element4[];
}

/** สมาชิกทีมจากวันเกิด — null เมื่อวันที่ไม่ถูกต้อง (พ.ศ./รูปแบบผิด = ไม่คำนวณ ไม่เดา) */
export function teamMemberFromBirthDate(label: string, birthDate: string | null | undefined): TeamMember | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const nowY = new Date().getUTCFullYear();
  if (y < 1900 || y > nowY || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ZODIAC = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];
  const seed = calculateElementSeed({
    day_of_week: thaiDayOfWeek(birthDate),
    birth_month: m,
    birth_year_ad: y,
    birth_day: d,
    zodiac_year_animal: ZODIAC[(((y - 2020) % 12) + 12) % 12],
  });
  return { label, dominant: seed.dominant, missing: seed.missing };
}

export interface StyleTeamFit {
  style: Element5;
  /** คะแนนรายคน — wuXingScore(ธาตุคน, สไตล์, ธาตุที่คนนั้นขาด) มุมเดียวกับหน้าเดิม */
  members: { label: string; score: number; productiveClash: boolean }[];
  /** ต่ำสุดของทีม — null เมื่อไม่มีสมาชิก */
  teamMin: number | null;
  /** สไตล์บำรุงธาตุชื่อแบรนด์ไหม (+2 = สไตล์ให้กำเนิดธาตุชื่อ) — null เมื่อไม่มี/อ่านธาตุชื่อไม่ได้ */
  brandScore: number | null;
  /** ทิศบำรุงสไตล์ไหม (+2 = ธาตุทิศให้กำเนิดธาตุสไตล์) — null เมื่อไม่เลือกทิศ */
  directionScore: number | null;
}

export interface TeamStyleResult {
  fits: StyleTeamFit[];
  /** สไตล์แนะนำ — teamMin สูงสุดก่อน แล้วค่อยดูทิศ/ชื่อ · null เมื่อไม่มีข้อมูลอะไรเลย */
  recommended: Element5 | null;
  brandElement: Element5 | null;
  caveats: string[];
}

export function scoreStylesForTeam(opts: {
  members: readonly TeamMember[];
  brandName?: string | null;
  direction?: Direction | null;
}): TeamStyleResult {
  const brandEl = opts.brandName?.trim() ? nameElement(opts.brandName.trim()) : null;
  const dirEl = opts.direction ? DIRECTION_TO_ELEMENT[opts.direction] : null;

  const fits: StyleTeamFit[] = LOGO_STYLES.map((style) => {
    const members = opts.members.map((mem) => {
      const r = wuXingScore(mem.dominant, style, [...mem.missing]);
      return { label: mem.label, score: r.final_score, productiveClash: r.productive_clash };
    });
    return {
      style,
      members,
      teamMin: members.length ? Math.min(...members.map((x) => x.score)) : null,
      brandScore: brandEl ? wuXingScore(brandEl, style, []).final_score : null,
      directionScore: dirEl ? wuXingScore(style, dirEl, []).final_score : null,
    };
  });

  const hasAny = opts.members.length > 0 || brandEl !== null || dirEl !== null;
  let recommended: Element5 | null = null;
  if (hasAny) {
    const key = (f: StyleTeamFit) => [f.teamMin ?? -99, f.directionScore ?? 0, f.brandScore ?? 0];
    recommended = [...fits].sort((a, b) => {
      const ka = key(a), kb = key(b);
      return kb[0] - ka[0] || kb[1] - ka[1] || kb[2] - ka[2];
    })[0].style;
  }

  const caveats: string[] = [];
  if (opts.members.length > 1) {
    caveats.push("คะแนนรวมทีมใช้ค่าต่ำสุดของสมาชิก (สไตล์ที่ดีต้องไม่พิฆาตใครสักคน) — เป็นเครื่องมือช่วยเลือกที่ออกแบบขึ้นเอง ไม่มีในตำรา");
  }
  if (brandEl) {
    caveats.push("ธาตุจากชื่อแบรนด์ใช้เกณฑ์เลขกลุ่มอักษร→ดาวประจำเลข→ธาตุประจำวัน");
  }
  return { fits, recommended, brandElement: brandEl, caveats };
}

/**
 * คำแนะนำความสัมพันธ์ ทิศสำนักงาน ↔ ธาตุเจ้าของ — พิฆาตแนะสีธาตุสะพาน (通關) ในโลโก้ ·
 * Productive Clash (ทิศเป็นธาตุที่เจ้าของขาด) ชูเป็นข้อดี · เข้ากันดีบอกสั้น
 */
export function directionOwnerAdvice(
  ownerDominant: Element4,
  ownerMissing: readonly Element4[],
  direction: Direction
): string {
  const dirEl = DIRECTION_TO_ELEMENT[direction];
  const r = wuXingScore(ownerDominant, dirEl, [...ownerMissing]);
  const dirTh = THAI_LABEL_5[dirEl];
  if (r.productive_clash) {
    return `ทิศ${direction}เป็นธาตุ${dirTh} — ${r.relation_th}`;
  }
  if (r.final_score <= -2) {
    const bridge = bridgeElement(ownerDominant as Element5, dirEl);
    const colors = bridge ? ELEMENT_TO_COLORS[bridge].slice(0, 3).join("/") : "";
    return (
      `ทิศ${direction} (ธาตุ${dirTh}) พิฆาตกับธาตุเจ้าของ — แนะนำแทรกสีธาตุ${bridge ? THAI_LABEL_5[bridge] : ""}` +
      (colors ? ` (${colors}) ในโลโก้เป็นสะพานเชื่อม (通關)` : "")
    );
  }
  if (r.final_score >= 2) return `ทิศ${direction} (ธาตุ${dirTh}) เกื้อหนุนธาตุเจ้าของ (+${r.final_score})`;
  return `ทิศ${direction} (ธาตุ${dirTh}) กับธาตุเจ้าของ: ${r.relation_th}`;
}


/**
 * ทักษาปกรณ์ของชื่อแบรนด์เทียบวันเกิดเจ้าของ (รอบ "ไล่ทีละข้อ" 24 ส.ค. 2569)
 * ธรรมเนียมตั้งชื่อกิจการใช้ทักษาเจ้าของกิจการ — เตือนเมื่อชื่อมีอักษรวรรคกาลกิณีของเจ้าของ
 * (ชั้นเสริม — คนละระบบกับธาตุชื่อ/คะแนนสไตล์ อ่านแยกชั้น) · null เมื่อข้อมูลไม่ครบ/วันไม่ถูกต้อง
 */
export function brandNameTaksa(brandName: string | null | undefined, ownerBirthDate: string | null | undefined): TaksaNameResult | null {
  if (!brandName?.trim() || !ownerBirthDate || !/^\d{4}-\d{2}-\d{2}$/.test(ownerBirthDate)) return null;
  // normalization layer: กัน พ.ศ./ปีเสีย (บทเรียน data-quality §5.1 — แพทเทิร์นเดียว teamMemberFromBirthDate)
  const y = Number(ownerBirthDate.slice(0, 4));
  if (y < 1900 || y > new Date().getUTCFullYear()) return null;
  try {
    return analyzeNameTaksa(brandName.trim(), thaiDayOfWeek(ownerBirthDate));
  } catch {
    return null;
  }
}
