// เทคนิคดูแลใจตามสภาวะ × ธาตุ (เฟส 2 สไลซ์ A — 2 ส.ค. 2569)
//
// 🔴 ที่มาของเนื้อหา: Toxic_Workplace_KB.xlsx ชีต Grounding_Recovery (GR001-GR007) ของผู้ใช้เอง
//    (KRUTH MIND Platform D) — คัดลอกเนื้อหาเข้ามาเป็นตาราง engine ของ E ตามหลัก §0
//    (ไม่ดึงข้อมูลผู้ใช้ข้าม D↔E — เอาเฉพาะฐานความรู้) · ขั้นตอน/เวลา/ธาตุ ตรงต้นฉบับ
//    ยกเว้นข้อควรระวังที่อ้างศัพท์ภายในของ D (Rain 🔴) — แปลงเป็นภาษากลางแล้ว
//
// การจับคู่ "สภาวะ → เทคนิค" ทำเพิ่มฝั่ง E จาก when_to_use ของต้นฉบับ (mapping ไม่ใช่เนื้อหาใหม่)
// GR006 (Exit Energy Calculator) จงใจยังไม่เปิด — เป็นเครื่องมือตัดสินใจลาออก เก็บไว้สไลซ์ B

import type { Element5 } from "./element";
import { FRAMING_CAVEAT } from "./wellness";

/** สภาวะใจที่ระบบรู้จัก — AI จำแนกได้เฉพาะค่าในนี้ (แพทเทิร์นเดียวกับ vision enum) */
export const MIND_STATES = ["stressed", "anxious", "self_doubt", "drained"] as const;
export type MindState = (typeof MIND_STATES)[number];

export const MIND_STATE_TH: Record<MindState, string> = {
  stressed: "เครียดเฉียบพลัน",
  anxious: "กังวล คิดวนซ้ำ",
  self_doubt: "สงสัยตัวเอง เสียความมั่นใจ",
  drained: "เหนื่อยล้า หมดพลัง",
};

export interface MindTechnique {
  id: string;
  name: string;
  nameTh: string;
  /** ขั้นตอนทำจริง — ข้อความตรงจาก KB ต้นฉบับ */
  steps: string;
  durationMin: string;
  /** ธาตุที่เทคนิคนี้เสริม (แปลงจาก element_support) */
  elements: Element5[];
  elementNote: string;
  /** ข้อควรระวังเฉพาะเทคนิค — null = ไม่มี */
  caution: string | null;
}

export const MIND_TECHNIQUES: Record<string, MindTechnique> = {
  GR001: {
    id: "GR001",
    name: "5-4-3-2-1 Grounding",
    nameTh: "สติกายภาพ 5 ขั้น",
    steps:
      "1.มอง 5 สิ่งรอบตัว 2.สัมผัส 4 อย่าง 3.ฟัง 3 เสียง 4.ดมกลิ่น 2 อย่าง 5.รับรส 1 อย่าง — ทำช้าๆ ครั้งละ ~10 วินาที",
    durationMin: "3-5",
    elements: ["Earth"],
    elementNote: "ดิน (ลงมาที่ร่างกาย)",
    caution: null,
  },
  GR002: {
    id: "GR002",
    name: "Box Breathing",
    nameTh: "หายใจกล่อง",
    steps: "หายใจเข้า 4 วิ — กลั้น 4 วิ — หายใจออก 4 วิ — กลั้น 4 วิ — ทำ 4 รอบ",
    durationMin: "3",
    elements: ["Water", "Earth"],
    elementNote: "น้ำ+ดิน (สงบ มั่นคง)",
    caution: "ไม่ควรทำขณะขับรถ",
  },
  GR003: {
    id: "GR003",
    name: "Cognitive Defusion",
    nameTh: "แยกตัวเองออกจากความคิด",
    steps:
      "1.สังเกตความคิด: 'ฉันกำลังมีความคิดว่า...' (ไม่ใช่ 'ฉัน...') 2.ตั้งชื่อให้ความคิดนั้น เช่น 'นี่คือเรื่องเล่าความไม่มั่นใจ' 3.ถามตัวเอง: 'ความคิดนี้เป็นประโยชน์ไหม ณ ตอนนี้?'",
    durationMin: "5",
    elements: ["Wood"],
    elementNote: "ลม (ดูความคิดจากระยะไกล)",
    // ต้นฉบับ: "ถ้า Rain 🔴 → ต้องการผู้เชี่ยวชาญ" — แปลงเป็นภาษากลางของ E
    caution: "ถ้าความรู้สึกหนักมากหรือต่อเนื่อง ควรคุยกับผู้เชี่ยวชาญโดยตรง",
  },
  GR004: {
    id: "GR004",
    name: "Evidence Journal",
    nameTh: "บันทึกหลักฐานความเป็นจริง",
    steps:
      "1.เขียนเหตุการณ์ที่เกิด (วัน เวลา สถานที่ ใครอยู่บ้าง) 2.เขียน 'สิ่งที่ฉันรู้ว่าจริง' 3.เก็บหลักฐานประกอบ (ข้อความ/อีเมล) 4.อ่านซ้ำทุก 3 วัน",
    durationMin: "10-15",
    elements: ["Metal"],
    elementNote: "ทอง (หลักฐานแน่นหนา)",
    caution: null,
  },
  GR005: {
    id: "GR005",
    name: "Values Anchor",
    nameTh: "ยึดค่านิยมตัวเอง",
    steps:
      "1.เขียน 3-5 สิ่งที่คุณ 'ให้คุณค่า' มากที่สุดในชีวิต 2.ถาม: สิ่งที่ทำอยู่ส่งเสริมหรือขัดแย้งกับคุณค่าเหล่านั้น? 3.ถาม: ถ้าเป็นแบบนี้ต่ออีก 1 ปี คุณค่าเหล่านั้นจะยังอยู่ไหม?",
    durationMin: "15",
    elements: ["Earth", "Wood"],
    elementNote: "ดิน+ลม (รากฐาน+ทิศทาง)",
    caution: null,
  },
  GR007: {
    id: "GR007",
    name: "Decompression Ritual",
    nameTh: "พิธีกรรมปลดปล่อยหลังวันหนัก",
    steps:
      "ออกแบบ 'พิธีกรรม' แยกโหมดงานกับโหมดพัก เช่น เปลี่ยนเสื้อทันทีที่ถึงบ้าน · อาบน้ำก่อนทำอย่างอื่น · เดิน 10 นาที · งดเปิดแชทงานหลัง 20:00",
    durationMin: "10-20",
    elements: ["Water"],
    elementNote: "น้ำ (ล้าง ปล่อยวาง)",
    caution: null,
  },
};

/** ตารางจับคู่สภาวะ → เทคนิค [หลัก, สำรอง] — จาก when_to_use ของต้นฉบับ */
const STATE_TECHNIQUES: Record<MindState, [string, string]> = {
  stressed: ["GR002", "GR001"], // เฉียบพลัน/ก่อนเรื่องยาก → หายใจกล่อง · สติกายภาพ
  anxious: ["GR001", "GR003"], // overthink → ลงมาที่กาย · แยกจากความคิด
  self_doubt: ["GR003", "GR004"], // สงสัยตัวเอง → defusion · บันทึกความจริง
  drained: ["GR007", "GR005"], // หมดพลัง → ปลดปล่อยหลังงาน · กลับหาคุณค่า
};

/** ธงแดงต่อสภาวะ — สัญญาณที่ควรแนะนำผู้เชี่ยวชาญ (ภาษากลาง ไม่มีคำทางคลินิก) */
export const STATE_RED_FLAGS: Record<MindState, string> = {
  stressed: "ถ้าความเครียดกระทบการนอนหรืองานต่อเนื่องเกิน 2 สัปดาห์ ควรปรึกษาผู้เชี่ยวชาญ",
  anxious: "ถ้าความกังวลวนจนหยุดไม่ได้หรือกระทบชีวิตประจำวัน ควรปรึกษาผู้เชี่ยวชาญ",
  self_doubt: "ถ้าเริ่มรู้สึกไร้ค่าหรือโทษตัวเองรุนแรงต่อเนื่อง ควรคุยกับผู้เชี่ยวชาญโดยตรง",
  drained: "ถ้าหมดพลังต่อเนื่องหลายสัปดาห์ พักแล้วไม่ฟื้น ควรปรึกษาผู้เชี่ยวชาญ",
};

export const MIND_CARE_CAVEAT = FRAMING_CAVEAT;

/** แปลงข้อความสภาวะ (ไทย/อังกฤษ) → MindState · ไม่รู้จัก = null (ห้ามเดา) */
export function toMindState(v: unknown): MindState | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if ((MIND_STATES as readonly string[]).includes(s)) return s as MindState;
  if (/เครียด|กดดัน|ตึง/.test(s)) return "stressed";
  if (/กังวล|คิดวน|คิดมาก|ฟุ้ง|นอนไม่หลับ/.test(s)) return "anxious";
  if (/สงสัยตัวเอง|ไม่มั่นใจ|เสียความมั่นใจ|ด้อยค่า/.test(s)) return "self_doubt";
  if (/หมดพลัง|หมดไฟ|เหนื่อยล้า|เหนื่อยใจ|ท้อ/.test(s)) return "drained";
  return null;
}

export interface MindCareResult {
  state: MindState;
  stateTh: string;
  primary: MindTechnique;
  alternative: MindTechnique;
  /** true = เทคนิคหลักเสริมธาตุที่ผู้ใช้ขาดพอดี (ยกมาพูดได้ว่า "เข้ากับพื้นดวง") */
  primaryBoostsMissing: boolean;
  redFlag: string;
  caveat: string;
}

/**
 * เลือกเทคนิคตามสภาวะ + ปรับตามธาตุผู้ใช้: ถ้าเทคนิคสำรองเสริมธาตุที่ขาดแต่ตัวหลักไม่ →
 * สลับให้ตัวที่เสริมธาตุขาดขึ้นเป็นหลัก (หลักเดียวกับ wellness: เติมธาตุที่พร่อง)
 */
export function getMindCare(state: MindState, missing: Element5[]): MindCareResult {
  const [a, b] = STATE_TECHNIQUES[state];
  let primary = MIND_TECHNIQUES[a];
  let alternative = MIND_TECHNIQUES[b];
  const boosts = (t: MindTechnique) => t.elements.some((e) => missing.includes(e));
  if (!boosts(primary) && boosts(alternative)) {
    [primary, alternative] = [alternative, primary];
  }
  return {
    state,
    stateTh: MIND_STATE_TH[state],
    primary,
    alternative,
    primaryBoostsMissing: boosts(primary),
    redFlag: STATE_RED_FLAGS[state],
    caveat: MIND_CARE_CAVEAT,
  };
}
