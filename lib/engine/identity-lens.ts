/**
 * เลนส์เลขตัวตน (Identity Lens) — "ค่าพลังงานจากการ์ดพลังงาน" เข้าโหมดอื่น (ผู้ใช้เคาะ 1 ก.ย. 2569)
 *
 * มติผู้ใช้: ใช้ทั้งสองกลไก แล้วเล่าเป็น "สองทางให้ผู้ใช้เลือก" (แพทเทิร์น Mirror เดิม):
 * - ชั้นคะแนน 5 ด้านจากเลขตัวตน (numberAspects — สูตรเสริมเดิม + caveat เดิม)
 * - ธาตุจากเลขตัวตน (ตารางเลข→ธาตุ Logic 2 ที่ verify แล้ว — ไม่มีวันเป็น "ทอง")
 *
 * 🔴 แก้มติ §4 ข้อ 3 (digit-bridge เลิกใช้) แบบมีเงื่อนไข — ผู้ใช้เคาะ 1 ก.ย. 2569:
 * ธาตุจากเลขกลับมาในฐานะ **เลนส์ทางเลือก (ทาง ข)** เท่านั้น — ไม่แทน Element Seed (ทาง ก
 * ยังเป็นแกน) · ไม่เฉลี่ยรวมสองเลนส์ (คงกติกา §4 ข้อ 5) · แสดงคู่กันให้ผู้ใช้เลือกจุดเน้น
 * · เลนส์ ข ไม่มีแนวคิด "ธาตุที่ขาด" → Productive Clash ไม่เกิดในเลนส์นี้ (ประกาศตรงๆ)
 *
 * แหล่งเลขตัวตน: personalEnergyNumber (สูตรรวม Birth+Name+Time+Day — มติ 31 ส.ค. 2569)
 * ⚠️ ต้องคำนวณจากข้อมูลโปรไฟล์ชุดเดียวกับหน้า /profile เสมอ (ชื่อ+วันเกิด+เวลา) —
 * บทเรียน 1 ก.ย.: เลขตัวตนที่ต่างกันสองจุดทำให้ผู้ใช้สับสนว่าระบบผิด
 */

import { wuXingScore, THAI_LABEL_5, type Element5, type WuXingResult } from "./element";
import { personalEnergyNumber } from "./card-id";
import { lookup2digit, artifactElement } from "./numerology";
import { partAspects } from "./network-holistic";
import type { NumberAspectsResult } from "./number-aspects";

export const IDENTITY_LENS_CAVEAT =
  "มุมเลขตัวตนเป็นเลนส์ทางเลือก (ธาตุจากหลักเลขศาสตร์แปลงเลขเป็นธาตุ + คะแนน 5 ด้านซึ่งเป็นสูตรเสริม) — " +
  "คนละชั้นกับธาตุกำเนิดจากวันเกิดซึ่งเป็นแกนหลัก · ระบบแสดงทั้งสองมุมโดยไม่เฉลี่ยรวม " +
  "และไม่เลือกแทน (มุมเลขตัวตนไม่มีแนวคิดธาตุที่ขาด จึงไม่มี Productive Clash ในมุมนี้)";

export interface IdentityLens {
  /** เลขตัวตน 00-99 (สูตรรวม — ตรงการ์ดพลังงานหน้า /profile) */
  number: string;
  card: { id: string; name: string | null; essence: string | null };
  /** ธาตุจากเลขตัวตน (ทาง ข) — ตาราง digit→ธาตุ 4 ธาตุไทย ไม่มีวันเป็นทอง */
  element: Element5;
  elementTh: string;
  /** คะแนน 5 ด้านของเลขตัวตน (มุมผู้ใช้เอง — กลไกเดียวกับส่วนตนเองในโหมดองค์รวม) */
  aspects: NumberAspectsResult;
  caveats: string[];
}

/** สร้างเลนส์เลขตัวตนจากข้อมูลโปรไฟล์ (ส่วนที่ไม่มี = 0 ตามสูตรรวม) */
export function identityLens(
  birthDate: string,
  opts: { name?: string | null; birthTime?: string | null; dominant?: Element5; missing?: Element5[] }
): IdentityLens {
  const n = personalEnergyNumber(birthDate, { name: opts.name ?? null, birthTime: opts.birthTime ?? null });
  const number = String(n).padStart(2, "0");
  const c = lookup2digit(n);
  const element = artifactElement(n) as Element5;
  return {
    number,
    card: { id: c.input, name: c.energy_name, essence: c.essence },
    element,
    elementTh: THAI_LABEL_5[element],
    aspects: partAspects({ digits: number, letters: null }, opts.dominant, opts.missing ?? []),
    caveats: [IDENTITY_LENS_CAVEAT],
  };
}

export interface IdentityDualChemistry {
  /** ทาง ก — ธาตุกำเนิด (Element Seed · แกนหลัก · Productive Clash ได้ตามเดิม) */
  a: WuXingResult;
  /** ทาง ข — ธาตุจากเลขตัวตน (เลนส์ทางเลือก · ไม่มีธาตุที่ขาดในระบบเลข) */
  b: WuXingResult;
}

/** เคมีสองเลนส์ของผู้ใช้ ↔ สิ่งหนึ่ง (การ์ด/วัน/ทิศ) — แสดงคู่กัน ห้ามเฉลี่ย */
export function identityDualChemistry(
  seedDominant: Element5,
  seedMissing: Element5[],
  lensElement: Element5,
  target: Element5
): IdentityDualChemistry {
  return {
    a: wuXingScore(seedDominant, target, [...seedMissing]),
    b: wuXingScore(lensElement, target, []),
  };
}

/** บรรทัดสรุปเลนส์สำหรับแสดง/ฉีดเข้า context AI (จุดประกอบข้อความจุดเดียว) */
export function identityLensSummaryTh(lens: IdentityLens): string {
  return (
    `เลขตัวตน ${lens.number} · การ์ด "${lens.card.name ?? "-"}" · ธาตุจากเลขตัวตน: ${lens.elementTh} (เลนส์ทางเลือก) · ` +
    `คะแนน 5 ด้านของเลขตัวตน: ${Object.entries(lens.aspects.คะแนน).map(([k, v]) => `${k} ${v}`).join(" · ")} · ภาพรวม ${lens.aspects.ภาพรวม}/10`
  );
}
