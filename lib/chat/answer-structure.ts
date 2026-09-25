// ขั้นจัดโครงคำตอบ (answer structurer) — 25 ก.ย. 2569 ผู้ใช้เคาะ "เริ่ม"
//
// ที่มา: งานแก้ฝันหลุดประเด็น (10 ก.ย.) พิสูจน์ว่าการส่ง "โครง" (แกน/รอง) ให้ผู้เล่าเรื่อง แก้การหลุด
// ประเด็นได้ ส่วนกฎใน system อย่างเดียวแก้ไม่ได้ · คำตอบรอบถัดไป (ผู้ใช้ถามต่อจากผลบนจอ) มีทิศกระจาย
// กว่ารอบแรก โครงตายตัวจึงไม่พอ → ให้ AI ราคาถูก (Haiku, role router) อ่านคำถามแล้ว "เลือก" โครง
//
// 🔴 เส้นแบ่ง §16 ที่ล็อกเชิงโครงสร้างในไฟล์นี้:
//   - AI จัดโครง **เลือกได้เฉพาะ id ของข้อเท็จจริงที่ระบบให้** (f1, f2, …) + รูปแบบคำตอบจาก enum
//   - ไม่มีช่องข้อความอิสระใดไหลจาก AI จัดโครงไปถึงผู้เล่าเรื่อง — directive ประกอบจาก path/ป้าย
//     ที่ระบบสร้างเองเท่านั้น (เทสต์ล็อก: ยัดข้อความแปลกลง JSON ต้องไม่โผล่ใน directive)
//   - ผลไม่ผ่านการตรวจ = null → route ตกกลับเส้นเดิมเป๊ะ (คำตอบไม่พัง)
//
// ไฟล์นี้ pure (ไม่แตะ network) — เทสต์รันตรงได้

/** รูปแบบคำตอบ — AI เลือกได้ค่าเดียวจากชุดนี้ */
export const ANSWER_SHAPES = {
  direct: "ตอบตรงจุดที่ถามก่อน แล้วค่อยให้เหตุผลสั้นๆ",
  explain_why: "อธิบายว่าผลนี้มาจากอะไร (ที่มาของตัวเลข/ธาตุที่ยึด) ให้เข้าใจง่าย",
  compare: "เทียบสิ่งที่ผู้ใช้ถามทีละข้อ ให้เห็นจุดเหมือน-จุดต่าง",
  action: "เน้นสิ่งที่ผู้ใช้ทำได้จริงจากผลนี้ เป็นข้อปฏิบัติสั้นๆ",
  reassure: "ผู้ใช้กังวล — รับรู้ความรู้สึกสั้นๆ ก่อน แล้วอธิบายผลอย่างนุ่มนวล ไม่ขู่",
} as const;
export type AnswerShape = keyof typeof ANSWER_SHAPES;

export interface Fact {
  id: string;
  /** path ที่ระบบสร้างจาก key จริงของ context (เช่น "การ์ด.essence") */
  path: string;
  /** ตัวอย่างค่า (ตัดสั้น) — ให้ AI จัดโครงเห็นว่าข้อนี้คืออะไร */
  preview: string;
}

export interface AnswerStructure {
  focus: Fact[];
  shape: AnswerShape;
}

const MAX_FACTS = 40;
const MAX_FOCUS = 3;
const PREVIEW_LEN = 80;

function preview(v: unknown): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s === undefined) return "";
  return s.length > PREVIEW_LEN ? `${s.slice(0, PREVIEW_LEN)}…` : s;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * แตก context ของหน้าเป็นรายการข้อเท็จจริง (ลึก 2 ชั้น) — key ระดับบนที่เป็น object แตกลูกหนึ่งชั้น
 * array/ค่าเดี่ยวเป็นข้อเดียว · ข้าม null/ว่าง · จำกัด 40 ข้อ (กัน prompt บวม)
 */
export function buildFactIndex(context: unknown): Fact[] {
  const out: Fact[] = [];
  if (!isPlainObject(context)) return out;
  const push = (path: string, v: unknown) => {
    if (out.length >= MAX_FACTS) return;
    if (v === null || v === undefined || v === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    out.push({ id: `f${out.length + 1}`, path, preview: preview(v) });
  };
  for (const [k, v] of Object.entries(context)) {
    if (isPlainObject(v)) {
      const entries = Object.entries(v);
      if (entries.length === 0) continue;
      for (const [k2, v2] of entries) push(`${k}.${k2}`, v2);
    } else {
      push(k, v);
    }
  }
  return out;
}

/** system prompt ของ AI จัดโครง — สร้างจาก enum ตรงๆ (เพิ่ม shape แล้วลืมแก้ prompt ไม่ได้) */
export function buildStructurerSystem(): string {
  const shapes = Object.entries(ANSWER_SHAPES)
    .map(([k, d]) => `- "${k}": ${d}`)
    .join("\n");
  return `คุณคือผู้จัดโครงคำตอบของระบบดูดวง หน้าที่เดียว: อ่านคำถามของผู้ใช้กับรายการข้อเท็จจริงบนหน้าจอ
แล้วเลือกว่าคำตอบควรยึดข้อเท็จจริงข้อไหน และตอบรูปแบบไหน — คุณไม่ได้เขียนคำตอบเอง

กติกา:
1. "focus" = id ของข้อเท็จจริงที่ตรงกับคำถามที่สุด 1-${MAX_FOCUS} ข้อ เรียงจากสำคัญสุด ใช้ได้เฉพาะ id ในรายการ
2. ถ้าคำถามไม่เกี่ยวกับข้อไหนเลย ให้ focus เป็น [] (ห้ามเดา)
3. "shape" = เลือกหนึ่งค่า:
${shapes}
4. ตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น: {"focus":["f1"],"shape":"direct"}`;
}

export function buildStructurerInput(question: string, facts: readonly Fact[]): string {
  const list = facts.map((f) => `${f.id} | ${f.path} | ${f.preview}`).join("\n");
  return `<ข้อเท็จจริงบนหน้าจอ>\n${list}\n</ข้อเท็จจริงบนหน้าจอ>\n\nคำถามของผู้ใช้: ${question}`;
}

/**
 * ตรวจผลจาก AI จัดโครง — คืน null ถ้าใช้ไม่ได้ (route ตกกลับเส้นเดิม)
 * id ที่ไม่มีจริงถูกทิ้ง · ซ้ำถูกทิ้ง · เกิน 3 ตัด · shape นอก enum = ใช้ไม่ได้ทั้งก้อน
 * focus ว่างหลังกรอง = null (ไม่มีอะไรให้ยึด — ปล่อยผู้เล่าเรื่องทำงานแบบเดิม)
 */
export function validateStructure(raw: unknown, facts: readonly Fact[]): AnswerStructure | null {
  if (!isPlainObject(raw)) return null;
  const shape = raw.shape;
  if (typeof shape !== "string" || !Object.prototype.hasOwnProperty.call(ANSWER_SHAPES, shape)) return null;
  if (!Array.isArray(raw.focus)) return null;
  const byId = new Map(facts.map((f) => [f.id, f]));
  const focus: Fact[] = [];
  for (const id of raw.focus) {
    if (typeof id !== "string") continue;
    const f = byId.get(id);
    if (!f || focus.includes(f)) continue;
    focus.push(f);
    if (focus.length >= MAX_FOCUS) break;
  }
  if (focus.length === 0) return null;
  return { focus, shape: shape as AnswerShape };
}

/**
 * บรรทัดสั่งงานท้าย input ของผู้เล่าเรื่อง — ประกอบจาก path ของระบบ + คำอธิบาย shape ของระบบเท่านั้น
 * (ไม่มีข้อความจาก AI จัดโครงหลุดเข้ามา)
 */
export function structureDirective(s: AnswerStructure): string {
  const paths = s.focus.map((f) => f.path).join(", ");
  return (
    `🔴 โครงคำตอบ: ยึดข้อมูลบนหน้าจอส่วน ${paths} เป็นหลัก (เรียงจากสำคัญสุด) · ` +
    `รูปแบบ: ${ANSWER_SHAPES[s.shape]} · ข้อมูลส่วนอื่นบนหน้าจอเอ่ยได้เฉพาะเมื่อจำเป็นต่อคำตอบ ห้ามไล่ทุกข้อ`
  );
}

// ---- สวิตช์เปิด/ปิด (env ANSWER_STRUCTURER) ----
// "on" = ทุกคน · "off" = ปิด · "ab" (ค่าเริ่มต้น) = ครึ่งหนึ่งของผู้ใช้ตามกลุ่มคงที่จาก uid
// กลุ่มคำนวณซ้ำได้จาก uid (structurerGroup) → วิเคราะห์ย้อนหลังด้วยการเทียบความเห็นผู้ใช้รายกลุ่ม
export type StructurerMode = "on" | "off" | "ab";

export function structurerMode(env: string | undefined = process.env.ANSWER_STRUCTURER): StructurerMode {
  const v = (env ?? "").trim().toLowerCase();
  if (v === "on" || v === "1" || v === "true") return "on";
  if (v === "off" || v === "0" || v === "false") return "off";
  return "ab";
}

/** กลุ่ม A/B คงที่ต่อผู้ใช้ — "structured" หรือ "baseline" (FNV-1a บน uid) */
export function structurerGroup(uid: string): "structured" | "baseline" {
  let h = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2 === 0 ? "structured" : "baseline";
}

export function structurerEnabledFor(uid: string, mode: StructurerMode = structurerMode()): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return structurerGroup(uid) === "structured";
}
