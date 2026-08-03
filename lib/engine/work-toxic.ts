// รับมือสภาพแวดล้อมการทำงานเป็นพิษ (เฟส 2 สไลซ์ B — 2 ส.ค. 2569)
//
// 🔴 ที่มา: Toxic_Workplace_KB.xlsx (Toxic_Pattern_Library TP001-TP008 + Exit_Checklist) และ
//    Toxic_Workplace_Rules.json ของผู้ใช้ (KRUTH MIND Platform D) — คัดลอกเฉพาะฐานความรู้
//    ตามหลัก §0 · เนื้อหา กลยุทธ์ สคริปต์ จุดยกระดับ ตรงต้นฉบับ · เงื่อนไข DEMM ของ D
//    (Big Five/quadrant ของอีกฝ่าย) ไม่ตามมา — E ใช้ธาตุผู้ใช้ + การจำแนกรูปแบบแทน
//
// เส้นแบ่ง §16 เหมือน vision/mind-care: AI จำแนก "รูปแบบที่เจอ" เป็น enum เท่านั้น →
// engine คืนกลยุทธ์/สคริปต์/เทคนิคตั้งหลักจากตาราง — AI ไม่ด้นสดกลยุทธ์เอง

import type { Element5 } from "./element";
import { getMindCare, type MindState, type MindTechnique } from "./mind-care";

export const WORK_PATTERNS = [
  "credit_stealing",
  "gaslighting",
  "scapegoating",
  "micromanagement",
  "passive_aggression",
  "public_humiliation",
  "exclusion",
  "favoritism",
  "exit_thoughts",
] as const;
export type WorkPattern = (typeof WORK_PATTERNS)[number];

interface WorkPatternInfo {
  nameTh: string;
  /** สัญญาณที่มักเจอ (signs_in_chat ต้นฉบับ) */
  signs: string;
  /** กลยุทธ์รับมือ (strategy ต้นฉบับ) */
  strategy: string;
  /** สคริปต์พูด/เขียนจริง (scripts_th ต้นฉบับ) */
  script: string;
  /** จุดที่ควรยกระดับ (escalation_point ต้นฉบับ) */
  escalation: string;
  /** ธาตุของพลังงานแบบนี้ (element_link ต้นฉบับ) */
  elementNote: string;
  /** สภาวะใจที่มักเกิด → ใช้เลือกเทคนิคตั้งหลักจาก mind-care */
  mindState: MindState;
}

export const WORK_PATTERN_INFO: Record<Exclude<WorkPattern, "exit_thoughts">, WorkPatternInfo> = {
  credit_stealing: {
    nameTh: "ถูกขโมยผลงาน/เครดิต",
    signs: "พูดว่า 'งานผม/หนู' ทั้งที่ไม่ได้ทำ · ไม่กล่าวถึงผู้ทำงานจริง · เมื่อถามรายละเอียดตอบไม่ได้",
    strategy: "สร้างการมองเห็นผลงาน: เก็บหลักฐานการทำงาน · ส่งงานผ่านช่องทางที่มีผู้เกี่ยวข้องเห็น (CC) · นำเสนองานตัวเองก่อนส่ง",
    script:
      "'ขอบคุณที่ present แทนนะครับ/ค่ะ ขอเสริมรายละเอียดในส่วนที่รับผิดชอบโดยตรง — ซึ่งได้ทำและส่งให้ทีมเมื่อ [วันที่]' · ทางอีเมล: 'ตามที่ส่งให้ทีมเมื่อ [วันที่]...'",
    escalation: "ถ้าเกิดเกิน 3 ครั้ง → เริ่มเก็บบันทึกอย่างเป็นทางการ · ผ่าน 2 เดือนไม่หยุด → แจ้ง HR",
    elementNote: "ไฟ+ทอง — พลังงานแบบแย่งเครดิตจากคนอื่น",
    mindState: "stressed",
  },
  gaslighting: {
    nameTh: "ถูกทำให้สงสัยความจำ/การรับรู้ตัวเอง",
    signs: "ถูกบอกว่าจำผิด · 'ไม่เคยพูดแบบนั้น' ทั้งที่พูด · 'คุณคิดมาก/อ่อนไหวเกิน' · เริ่มสงสัยตัวเองบ่อย",
    strategy:
      "Grey Rock: ให้ข้อมูลน้อย ไม่ตอบอารมณ์ · จดบันทึกทุกอย่าง (ข้อความ/อีเมล/เวลา) · หาพยาน · อย่าเถียงตรงๆ — รูปแบบนี้เถียงแล้วเสียเปรียบเสมอ",
    script: "ตอบสั้นๆ ว่า 'โอเคครับ/ค่ะ' แล้วไปบันทึกแทน · 'ขอให้ส่งเรื่องนี้เป็นอีเมลได้ไหมคะ เพื่อความชัดเจน'",
    escalation: "สิ่งนี้ไม่ใช่เรื่องปกติของที่ทำงาน — ถ้าเกิดบ่อย ควรปรึกษา HR หรือพิจารณาทางเลือกอื่น อย่ายอมรับว่าเป็นเรื่องธรรมดา",
    elementNote: "น้ำขุ่น — พลังงานบิดเบือน มองไม่ทะลุ",
    mindState: "self_doubt",
  },
  scapegoating: {
    nameTh: "ถูกโยนความผิด/หาแพะ",
    signs: "ถูกโทษเป็นคนแรกทุกครั้ง · ถูกตำหนิต่อหน้าทีมในเรื่องที่ไม่ได้ทำคนเดียว",
    strategy: "หาพันธมิตรที่เป็นกลางในทีมก่อน · ตอบโต้ด้วยข้อเท็จจริงเสมอ ไม่ใช้อารมณ์ · เก็บหลักฐานลำดับงาน",
    script: "'ข้อมูลที่ผม/หนูมีคือ [ข้อเท็จจริง+วันที่] — ขอให้ทีมช่วยดูตรงนี้ด้วยกันได้ไหมคะ ว่าติดที่ขั้นตอนไหนจริงๆ'",
    escalation: "ถ้าโดนเฉพาะเราคนเดียวซ้ำๆ = อาจถูกเจาะจงเป็นเป้า → ควรเก็บบันทึกจริงจังและปรึกษา HR",
    elementNote: "ไฟ — พลังงานเผาคนอื่นแทนตัวเอง",
    mindState: "stressed",
  },
  micromanagement: {
    nameTh: "ถูกจุกจิกควบคุมทุกอย่าง",
    signs: "ถูกถามสถานะงานทุกชั่วโมง · งานเสร็จแล้วถูกแก้โดยไม่มีเหตุผล · ทุกอย่างต้องรออนุมัติ",
    strategy:
      "Feed the Need: ส่ง update เองก่อนถูกถาม (เช้าละครั้ง) · ให้ข้อมูลก่อนที่เขาจะขอ · ให้เขารู้สึกควบคุมได้โดยเราไม่เสียอิสระจริง",
    script: "'จะส่ง update ทุกเช้า 9 โมงนะคะ ถ้ามีอะไรเพิ่มเติมนอกนั้นจะแจ้งทันที' · 'ขอทำแบบ X ก่อนนะคะ ถ้าไม่โอเคค่อยปรับ'",
    escalation: "ถ้าทำ Feed the Need แล้ว 30 วันไม่ดีขึ้น → อาจไม่ใช่แค่ความกังวลของเขา แต่ต้องการควบคุม — พิจารณาปรึกษา HR/ย้ายทีม",
    elementNote: "ดิน+ไฟ — ควบคุมเกิน ไม่ปล่อยให้ไหล",
    mindState: "stressed",
  },
  passive_aggression: {
    nameTh: "เจอความก้าวร้าวเชิงรับ (ประชด/เงียบใส่)",
    signs: "ตอบ 'โอเค' แต่ไม่ทำ · ส่งงานช้าโดยไม่แจ้ง · ประชดในที่ประชุม · เงียบใส่",
    strategy: "ชวนพูดอย่างนุ่มนวล ไม่กล่าวหา · สร้างพื้นที่ปลอดภัยให้เขาพูดตรงๆ · อย่าตอบประชดกลับ",
    script: "'สังเกตว่าช่วงนี้ดูเงียบกว่าปกติ มีอะไรที่อยากคุยไหมคะ' · 'อยากให้งานออกมาดี ถ้ามีส่วนไหนที่ทำให้ไม่สะดวก บอกได้เลยนะคะ'",
    escalation: "ถ้าทำงานร่วมกันไม่ได้ชัดเจน → แยกความรับผิดชอบให้ชัด ลดการพึ่งพากัน",
    elementNote: "น้ำ+ลม — ไหลหลบเลี่ยง ไม่เผชิญตรง",
    mindState: "anxious",
  },
  public_humiliation: {
    nameTh: "ถูกตำหนิ/ประจานต่อหน้าคนอื่น",
    signs: "ถูกวิจารณ์ในที่ประชุมโดยไม่แจ้งก่อน · ถูกเปรียบเทียบกับคนอื่นต่อหน้า",
    strategy: "ตั้งหลักก่อน ('รับทราบค่ะ ขอโน้ตไว้') → ขอคุยแบบตัวต่อตัวทีหลัง · อย่าแก้ตัวกลางที่ประชุม — เสียเปรียบเสมอ",
    script: "ในที่ประชุม: 'รับทราบค่ะ ขอนัดคุยเพิ่มเติมแบบตัวต่อตัวได้ไหมคะ เพื่อเข้าใจ feedback ให้ครบ' [จบแล้วนิ่ง ไม่แก้ตัว]",
    escalation: "เกิน 3 ครั้ง = สภาพแวดล้อมการทำงานที่เป็นปฏิปักษ์ → ควรเริ่มร้องเรียนอย่างเป็นทางการ",
    elementNote: "ไฟ — พลังงานเผาทำลายต่อหน้าคน",
    mindState: "stressed",
  },
  exclusion: {
    nameTh: "ถูกกีดกัน/ตัดออกจากวง",
    signs: "ไม่ถูกเชิญประชุมที่เกี่ยวข้อง · ได้ข้อมูลช้ากว่าคนอื่น · คนอื่นรู้เรื่องที่เราไม่รู้",
    strategy: "สร้างการมองเห็นเชิงรุก: ขอเข้าร่วม/ขอข้อมูลตรงๆ · สร้างความสัมพันธ์กับผู้เกี่ยวข้อง โดยตรงไม่ผ่านคนกลาง",
    script: "'อยากให้ CC เรื่อง X ด้วยนะคะ เพราะกระทบงานที่รับผิดชอบ' · หาผู้ใหญ่ในองค์กรที่ไว้ใจได้เป็นที่ปรึกษา",
    escalation: "ถ้าเจตนากีดกันชัดจนทำงานไม่ได้ → อาจเข้าข่ายบีบให้ออกทางอ้อม ควรปรึกษาด้านกฎหมายแรงงาน",
    elementNote: "น้ำ+ดิน — ถูกกั้นไม่ให้ไหลผ่าน",
    mindState: "drained",
  },
  favoritism: {
    nameTh: "เจอการเล่นพรรคเล่นพวก",
    signs: "บางคนได้สิทธิพิเศษ/โอกาส/ความคุ้มครองมากกว่าโดยไม่เกี่ยวกับผลงาน",
    strategy: "โฟกัสสิ่งที่ควบคุมได้: ผลงานที่วัดได้ + การมองเห็นจากหลายฝ่าย · อย่าแข่งเป็น 'คนโปรด' — สร้างคุณค่าที่ปฏิเสธไม่ได้แทน",
    script: "ขอเกณฑ์ที่ชัดเจน: 'อยากทราบเกณฑ์การพิจารณาเรื่องนี้ค่ะ จะได้พัฒนาให้ตรงจุด'",
    escalation: "ถ้ากระทบการประเมิน/ค่าตอบแทนชัดเจน → เก็บหลักฐานเชิงเปรียบเทียบ แล้วคุยกับ HR",
    elementNote: "ดิน — โครงสร้างเอียง ไม่เป็นธรรม",
    mindState: "anxious",
  },
};

/** เช็กลิสต์ประเมินก่อนตัดสินใจลาออก (Exit_Checklist ต้นฉบับ — 3 ข้อแรกของหมวดประเมิน) */
export const EXIT_FIRST_STEPS: string[] = [
  "นับจำนวนรูปแบบพฤติกรรมแย่ที่เกิดซ้ำเกิน 3 ครั้ง/เดือน — ถ้าหลายรูปแบบพร้อมกัน = ปัญหาทั้งระบบ ไม่ใช่แค่คนเดียว",
  "ให้คะแนนตัวเอง 1-10: พลังงานที่เหลือหลังเลิกงาน · ความสุขนอกงาน · ความมั่นใจเทียบ 6 เดือนก่อน · ความสัมพันธ์นอกงาน — ถ้าเฉลี่ยต่ำกว่า 5 คือสัญญาณชัด",
  "เขียนคุณค่า 3-5 อย่างที่สำคัญที่สุดในชีวิต แล้วถาม: ที่นี่ส่งเสริมหรือขัดแย้งกับมัน? ถ้าอยู่ต่อ 1 ปี คุณค่าเหล่านั้นจะยังอยู่ไหม?",
];

export const WORK_SHIELD_CAVEAT =
  "แนวทางรับมือทั่วไปจากคลังความรู้ ไม่ใช่คำแนะนำทางกฎหมายหรือ HR อย่างเป็นทางการ — สถานการณ์รุนแรงหรือกระทบสิทธิ ควรปรึกษา HR/ผู้เชี่ยวชาญโดยตรง";

/** แปลงข้อความ → WorkPattern · ไม่รู้จัก = null (AI ห้ามเดา) */
export function toWorkPattern(v: unknown): WorkPattern | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if ((WORK_PATTERNS as readonly string[]).includes(s)) return s as WorkPattern;
  if (/ขโมยผลงาน|แย่งเครดิต|เคลมงาน|claim งาน|เอาหน้า/.test(s)) return "credit_stealing";
  if (/จำผิด|ไม่เคยพูด|คิดไปเอง|สงสัยความจำ|gaslight/.test(s)) return "gaslighting";
  if (/โยนความผิด|แพะ|โทษฉัน|โทษผม/.test(s)) return "scapegoating";
  if (/จุกจิก|micromanage|ควบคุมทุกอย่าง|ถามทุกชั่วโมง/.test(s)) return "micromanagement";
  if (/ประชด|เงียบใส่|ก้าวร้าวเชิงรับ/.test(s)) return "passive_aggression";
  if (/ประจาน|ดุต่อหน้า|ตำหนิต่อหน้า|อับอายต่อหน้า/.test(s)) return "public_humiliation";
  if (/กีดกัน|ไม่เชิญประชุม|ตัดออกจากวง|โดดเดี่ยวในทีม/.test(s)) return "exclusion";
  if (/เล่นพรรคเล่นพวก|ลำเอียง|คนโปรด/.test(s)) return "favoritism";
  if (/อยากลาออก|อยากออกจากงาน|ทนไม่ไหว|ควรออกไหม/.test(s)) return "exit_thoughts";
  return null;
}

export interface WorkShieldResult {
  pattern: WorkPattern;
  nameTh: string;
  validation: string;
  signs?: string;
  strategy?: string;
  script?: string;
  escalation?: string;
  elementNote?: string;
  grounding: MindTechnique;
  exitSteps?: string[];
  caveat: string;
}

/** กลยุทธ์รับมือ + เทคนิคตั้งหลัก (เลือกตามธาตุที่ผู้ใช้ขาด ผ่าน mind-care) */
export function getWorkShield(pattern: WorkPattern, missing: Element5[]): WorkShieldResult {
  const validation =
    "สิ่งที่คุณรู้สึกนั้นสมเหตุสมผล — คนที่เจอแบบเดียวกันก็รู้สึกแบบนี้ ไม่ใช่ความอ่อนแอของคุณ";

  if (pattern === "exit_thoughts") {
    const care = getMindCare("drained", missing);
    return {
      pattern,
      nameTh: "กำลังชั่งใจว่าจะอยู่ต่อหรือออก",
      validation,
      strategy:
        "การตัดสินใจอยู่หรือออกเป็นของคุณคนเดียว — หน้าที่ของแม่หมอคือช่วยให้ข้อมูลครบ ไม่ผลักไปทางไหน",
      grounding: care.primary,
      exitSteps: EXIT_FIRST_STEPS,
      caveat: WORK_SHIELD_CAVEAT,
    };
  }

  const info = WORK_PATTERN_INFO[pattern];
  const care = getMindCare(info.mindState, missing);
  return {
    pattern,
    nameTh: info.nameTh,
    validation,
    signs: info.signs,
    strategy: info.strategy,
    script: info.script,
    escalation: info.escalation,
    elementNote: info.elementNote,
    grounding: care.primary,
    caveat: WORK_SHIELD_CAVEAT,
  };
}
