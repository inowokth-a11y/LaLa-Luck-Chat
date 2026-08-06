// สูตรวิเคราะห์เบอร์โทรฉบับทางการ — ได้รับจากเจ้าของตำราโดยตรง 6 ส.ค. 2569 (ปิดธง §5
// "สูตรเบอร์โทรออกแบบเสริมเอง ไม่ verify" ที่ค้างมาตั้งแต่ต้นโปรเจกต์)
//
// สูตรตามคำตอบข้อ 3:
//   1. ตัดเลข 2 ตัวหน้าออก (เช่น 0812345678 → ตัด "08")
//   2. เหลือ 8 หลัก → ดูทีละคู่: 12,34,56,78 (ความหมายจากตาราง 00-99 จริง)
//   3. ผลรวมตัวเลขทั้งหมด → "เลขกำลังรวม" ดูความหมาย + ความเหมาะกับผู้ใช้
//   4. น้ำหนัก: ผลรวม 40% · คู่สุดท้าย 25% · คู่รองสุดท้าย 15% · คู่อื่น 10% ต่อคู่ (10+10 = 100%)
//   5. ดูองค์ประกอบธาตุของเบอร์เทียบผู้ใช้ → คะแนนรายส่วน + คะแนนภาพรวม
//
// ⚠️ จุดตีความที่สูตรไม่ได้ระบุชัด (จดไว้ตรงๆ — ถ้าเจ้าของตำราแก้ค่อยปรับ):
//   - "ผลรวมตัวเลขทั้งหมด" ตีความเป็นผลรวมทุกหลักของทั้งเบอร์ (ธรรมเนียมเลขศาสตร์กระแสหลัก)
//   - คะแนนต่อส่วนใช้กลไก numberAspects (สูตรเสริม 5 ด้านที่ประกาศ caveat อยู่แล้ว) เป็นตัววัด
//     "เหมาะสมกับผู้ใช้" — โครงคู่+น้ำหนักคือของทางการ ตัวเลขคะแนนยังเป็นสูตรเสริม

import { numberAspects } from "./number-aspects";
import { lookup2digit } from "./numerology";
import type { Element5 } from "./element";

export const PHONE_OFFICIAL_NOTE =
  "โครงการวิเคราะห์รายคู่และน้ำหนัก (ผลรวม 40% · คู่ท้าย 25% · คู่รอง 15% · คู่อื่น 10%) " +
  "เป็นสูตรที่ได้รับยืนยันจากเจ้าของตำรา · ตัวเลขคะแนนรายด้านเป็นสูตรเสริมใช้เป็นแนวทางประกอบ";

export interface PhonePairReading {
  คู่: string;
  น้ำหนัก: string;
  ความหมาย: string | null;
  ธาตุ: string;
  คะแนน: number; // 0-10 จาก numberAspects ของคู่นั้น (รวมความเข้ากับธาตุผู้ใช้ถ้ามี)
}

export interface PhoneOfficialReading {
  เบอร์: string;
  เลขที่ตัดออก: string;
  รายคู่: PhonePairReading[];
  เลขกำลังรวม: {
    ผลรวม: number;
    ความหมาย: string | null;
    คะแนน: number;
    น้ำหนัก: string;
  };
  คะแนนภาพรวมถ่วงน้ำหนัก: number; // 0-10
  หมายเหตุ: string;
}

/** น้ำหนักต่อคู่ (เรียงจากคู่แรก→คู่ท้าย สำหรับ 4 คู่): 10, 10, 15, 25 (%) + ผลรวม 40% */
const PAIR_WEIGHTS = [10, 10, 15, 25] as const;
const SUM_WEIGHT = 40;

/**
 * วิเคราะห์เบอร์โทร 10 หลักตามสูตรทางการ — เบอร์ไม่ครบ 10 หลักคืน null (ให้ผู้เรียก fallback)
 */
export function phoneOfficialReading(
  phone: string,
  userDominant?: Element5,
  userMissing: Element5[] = []
): PhoneOfficialReading | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return null;

  const cut = digits.slice(0, 2);
  const rest = digits.slice(2); // 8 หลัก → 4 คู่
  const pairs: string[] = [rest.slice(0, 2), rest.slice(2, 4), rest.slice(4, 6), rest.slice(6, 8)];

  const รายคู่: PhonePairReading[] = pairs.map((pair, i) => {
    const a = numberAspects(pair, userDominant, userMissing);
    const meaning = lookup2digit(Number(pair));
    return {
      คู่: pair,
      น้ำหนัก: `${PAIR_WEIGHTS[i]}%`,
      ความหมาย: meaning.found ? `${meaning.energy_name} — ${meaning.essence}` : null,
      ธาตุ: a.ธาตุของเลข,
      คะแนน: a.ภาพรวม,
    };
  });

  // เลขกำลังรวม = ผลรวมทุกหลักทั้งเบอร์ (การตีความที่จดไว้ในหัวไฟล์)
  const sum = digits.split("").reduce((s, d) => s + Number(d), 0);
  const sumAspects = numberAspects(String(sum).padStart(2, "0"), userDominant, userMissing);
  const sumMeaning = lookup2digit(sum);

  const weighted =
    รายคู่.reduce((s, r, i) => s + r.คะแนน * PAIR_WEIGHTS[i], 0) + sumAspects.ภาพรวม * SUM_WEIGHT;

  return {
    เบอร์: digits,
    เลขที่ตัดออก: cut,
    รายคู่,
    เลขกำลังรวม: {
      ผลรวม: sum,
      ความหมาย: sumMeaning.found ? `${sumMeaning.energy_name} — ${sumMeaning.essence}` : null,
      คะแนน: sumAspects.ภาพรวม,
      น้ำหนัก: `${SUM_WEIGHT}%`,
    },
    คะแนนภาพรวมถ่วงน้ำหนัก: Math.round(weighted) / 100,
    หมายเหตุ: PHONE_OFFICIAL_NOTE,
  };
}
