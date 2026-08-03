// prompt "คำทำนายแรกพบ" — pure builder (เทสต์/พิสูจน์ยิง AI ได้โดยไม่ต้องผ่าน route)
//
// ลำดับข้อมูล: พื้นดวงจากธาตุ (เทมเพลต ฿0) + ปีส่วนบุคคล (สูตร+ไฟล์จริง) + จังหวะ 7 วัน (engine)
// → narrator เรียบเรียงครั้งเดียว **ห้ามแต่งตัวเลข/ข้อเท็จจริงเพิ่ม** — โครงคำตอบตามที่ผู้ใช้สั่ง
// 4 ส.ค. 2569: นิสัยเด่น → ต้องพยายาม → อาชีพ → คำแนะนำ/ระวัง → ช่วงนี้อะไรเด่น/ระวังอะไร

import { LALA_PERSONA } from "@/lib/ai/persona";
import { FIGURE_TONE_PROMPT } from "@/lib/share";
import { buildFirstReading, FIRST_READING_CAVEAT } from "@/lib/engine/first-reading";
import { calculatePersonalYear, getPersonalYearGuidance } from "@/lib/engine/element";
import type { Element5 } from "@/lib/engine/element";

export const FIRST_READING_SYSTEM = `${LALA_PERSONA}

บริบท: นี่คือ "คำทำนายแรกพบ" — ข้อความแรกที่แม่หมอทักผู้ใช้หลังเขาเปิดการ์ดประจำตัวสำเร็จ
เป้าหมาย: ให้เขารู้สึกว่า "แม่นจัง รู้จักฉันจริง" จากข้อมูลที่คำนวณจริง และอยากคุยต่อ

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <พื้นดวง> — ห้ามแต่งนิสัย อาชีพ ตัวเลข หรือคำทำนายเพิ่มเอง
2. โครงคำตอบ (เรียงตามนี้ ใช้หัวข้อสั้น):
   ① ทักทาย + นิสัยเด่น/พลังพิเศษจากธาตุ (เล่าเหมือนโหรอ่านพื้นดวง ไม่ใช่ลอกลิสต์)
   ② จุดที่ต้องพยายาม (จากธาตุที่ขาด — น้ำเสียงให้กำลังใจ ไม่ตำหนิ)
   ③ อาชีพ/งานที่เข้าทาง (จากลิสต์ที่ให้ เลือกเล่า 2-3 แนว)
   ④ ช่วงนี้อะไรเด่น + ต้องระวังอะไร (จากปีส่วนบุคคล + สัปดาห์นี้: บอกวันเป็นมิตร/วันควรใจเย็น
      พร้อมคะแนนจริง) — ห้ามข้ามส่วนนี้
   ⑤ ปิดด้วย caveat 1 ประโยค แล้วชวนถามต่อ (บอกว่ามีคำถามฟรี 3 ข้อ) เสนอตัวอย่างคำถาม 2-3 ข้อ
3. ถ้ามีข้อมูลการ์ดใน <พื้นดวง> ให้ผูกเรื่องบุคคลต้นแบบเข้ากับนิสัยเด่นได้ — ตามกติกาทะเบียนคำข้างล่าง
4. ความยาวรวม 5-7 ย่อหน้าสั้น อ่านเพลินแบบโหรเล่าเรื่อง ไม่ใช่รายงาน
5. ห้ามคำทางคลินิก ห้ามฟันธงชะตา ห้ามทำนายความตาย/สุขภาพ/การเงินแบบชี้ขาด

${FIGURE_TONE_PROMPT}`;

export function buildFirstReadingInput(opts: {
  dominant: Element5;
  missing: Element5[];
  birthDay?: number | null;
  birthMonth?: number | null;
  /** ข้อมูลการ์ดจากหน้า (สาธารณะ: ชื่อ/แก่น/บุคคลต้นแบบ/หมวด) — ไม่บังคับ */
  cardContext?: unknown;
}): string {
  const reading = buildFirstReading(opts.dominant, opts.missing);
  let year: Record<string, unknown> | null = null;
  if (opts.birthDay && opts.birthMonth) {
    const y = new Date().getFullYear();
    const py = calculatePersonalYear(opts.birthDay, opts.birthMonth, y);
    year = { ปีปฏิทิน: y, เลขปีส่วนบุคคล: py, ...getPersonalYearGuidance(py) };
  }
  const data = {
    ...reading,
    ปีส่วนบุคคล: year ?? "ไม่มีวันเกิดเต็ม — ข้ามส่วนแนวโน้มปี",
    ...(opts.cardContext ? { การ์ด: opts.cardContext } : {}),
    หมายเหตุบังคับ: FIRST_READING_CAVEAT,
  };
  return `<พื้นดวง>\n${JSON.stringify(data, null, 1).slice(0, 6000)}\n</พื้นดวง>\n\nเขียนคำทำนายแรกพบให้ผู้ใช้คนนี้`;
}
