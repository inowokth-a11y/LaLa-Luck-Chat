// พอร์ตจาก legacy-python-engines/router_engine.py (Logic 0, CLAUDE.md §6)
//
// ลำดับตัดสินใจ 3 ชั้น ห้ามสลับ (ตรงกับแพทเทิร์น Platform D):
//   1. Safety Gate       — เสมอ ก่อนสุด ไม่มีข้อยกเว้น
//   2. Keyword matching  — เร็ว ไม่เสีย token เลย
//   3. AI classification — เฉพาะเมื่อ keyword ไม่โดน (อยู่ใน app/api/logic/router/route.ts
//                          ไม่ใช่ที่นี่ เพราะไฟล์นี้ต้อง pure ไว้เทียบ golden test)
//
// ⚠️ ไฟล์นี้ต้อง deterministic 100% — ห้ามเรียก network/AI/Date.now() ใดๆ
//    ชั้น AI เป็นหน้าที่ของ route handler ที่ห่อฟังก์ชันนี้อีกที

import { safetyGate } from "./element";

/** logic 18 = Universal Oracle — ปลายทาง fallback ตามเอกสาร §DEFAULT FALLBACK */
export const FALLBACK_LOGIC_ID = 18;

/**
 * ⚠️ ต้องเป็น array ไม่ใช่ object literal
 * Python dict วนตามลำดับที่ประกาศ แต่ JS object ที่ key เป็นเลข **วนเรียงจากน้อยไปมาก
 * เสมอ** ไม่สนลำดับที่เขียน — ตอนนี้สองอย่างนี้บังเอิญให้ผลเท่ากัน (ต้นฉบับเรียง id อยู่แล้ว)
 * แต่ถ้าวันหนึ่งมีคนสลับบรรทัดใน Python ผลจะต่างกันเงียบๆ ทันที array ล็อกลำดับไว้แน่นอน
 *
 * ⚠️ พฤติกรรมที่ต้องรู้: ตัวชนะคือ **Logic ที่ id น้อยกว่า** ไม่ใช่คำที่อยู่ซ้ายกว่าในประโยค
 *    เช่น "ฝันว่าได้เบอร์โทรใหม่" → ได้ Logic 2 (เบอร์โทร) ไม่ใช่ Logic 4 (ฝัน)
 *    นี่คือพฤติกรรมของต้นฉบับ ไม่ใช่บั๊กที่พอร์ตพลาด — แต่เป็นจุดที่ควรให้ชั้น AI ช่วยตัดสิน
 *    ในอนาคต (ดู §Router ใน CLAUDE.md)
 */
export const KEYWORD_MAP: ReadonlyArray<readonly [number, readonly string[]]> = [
  [1, ["รหัสชีวิต", "ธาตุกำเนิด", "นิสัย", "วาสนา", "จุดแข็ง", "จุดอ่อน"]],
  [2, ["เบอร์โทร", "ทะเบียนรถ", "เลขทะเบียน", "เช็คเลข", "เลขนี้"]],
  [3, ["ฤกษ์", "เวลาไหนดี", "ยามไหนดี", "ทิศมงคล", "ออกเดินทาง"]],
  [4, ["ฝัน", "นิมิต", "ลางสังหรณ์", "เมื่อคืนฝัน"]],
  [7, ["ฮวงจุ้ย", "จัดบ้าน", "จัดห้อง", "ทิศห้อง", "หันหน้าไปทาง", "โต๊ะทำงานหันไปทาง"]],
  [8, ["ดวงวันนี้", "ดวงประจำวัน"]],
  [9, ["ดวงเดือนนี้", "ดวงประจำเดือน"]],
  [10, ["ดวงปีนี้", "ดวงประจำปี"]],
  [11, ["วันเกิด", "ปีชง", "กาลกิณีปีนี้"]],
  [12, ["กินอะไรดี", "อาหารเสริมดวง", "สุขภาพ"]],
  [16, ["กิจกรรมเสริมดวง", "ฝึกอะไรดี"]],
  [17, ["สมพงศ์", "ดวงคู่", "เนื้อคู่", "ดวงความรัก"]],
  [19, ["ตั้งชื่อบริษัท", "ตั้งชื่อเพจ", "ออกแบบโลโก้", "ชื่อแบรนด์"]],
  [20, ["เข้ากับบ้านไหม", "เข้ากับรถไหม", "เพื่อนร่วมงานเข้ากันไหม"]],
  [21, ["เสี่ยงทาย", "หมุนเสี่ยงโชค", "ขอเลขเสี่ยงทาย"]],
];

export const LOGIC_NAMES: Record<number, string> = {
  0: "Router",
  1: "พลังงานส่วนบุคคล",
  2: "เช็คเลขวัตถุ/ทะเบียน/เบอร์โทร",
  3: "ฤกษ์ยามและทิศมงคล",
  4: "ทำนายฝัน",
  7: "ฮวงจุ้ยและการจัดพื้นที่",
  8: "ดวงรายวัน",
  9: "ดวงรายเดือน",
  10: "ดวงรายปี",
  11: "วันเกิด/ทักษาจร",
  12: "อาหารและสุขภาพ",
  16: "กิจกรรมและการเรียนรู้",
  17: "ความรักและความสมพงศ์",
  18: "กาลชะตาและสรรพสิ่ง (ทั่วไป)",
  19: "ตั้งชื่อและตราสัญลักษณ์",
  20: "ข่ายความสัมพันธ์หลาย entity",
  21: "เสี่ยงทายผูกบริบท",
  [-1]: "Safety Refusal",
};

/** 'chat' = ตอบในแชทตรงๆ, 'liff' = เปิด mini-app (เกณฑ์แบ่งอยู่ใน CLAUDE.md §1) */
export const RESPONSE_MODE: Record<number, "chat" | "liff"> = {
  1: "liff", 2: "chat", 3: "chat", 4: "chat", 7: "liff", 8: "liff", 9: "liff",
  10: "liff", 11: "liff", 12: "chat", 16: "chat", 17: "liff",
  18: "chat", 19: "liff", 20: "liff", 21: "liff",
};

export type RouteMethod = "safety_keyword" | "keyword" | "fallback_no_keyword_match" | "ai";

export interface RouteResult {
  logic_id: number;
  logic_name: string;
  confidence: number;
  method: RouteMethod;
  response_mode: "chat" | "liff";
  /** มีเฉพาะเมื่อโดน Safety Gate */
  intercepted?: boolean;
  matched_keywords?: string[];
  crisis_resource_message?: string;
  /** คำที่ทำให้ match (ชั้น keyword) — ใช้ debug ว่าทำไมถึงไปหลุดที่ Logic นี้ */
  matched_keyword?: string;
  note?: string;
}

/**
 * ตัดสินปลายทางด้วยชั้น deterministic เท่านั้น (Safety → keyword → fallback)
 * ถ้าได้ method === "fallback_no_keyword_match" แปลว่า "keyword ไม่โดน" ผู้เรียกควรส่งต่อ
 * ให้ AI classification ก่อนจะยอมรับ logic 18 จริงๆ
 */
export function routeByKeyword(message: string): RouteResult {
  // ---- ชั้น 1: Safety Gate — ก่อนเสมอ ไม่มีข้อยกเว้น ----
  const gate = safetyGate(message);
  if (gate) {
    return {
      logic_id: -1,
      logic_name: LOGIC_NAMES[-1],
      confidence: 1.0,
      method: "safety_keyword",
      response_mode: "chat",
      intercepted: true,
      matched_keywords: gate.matched_keywords,
      crisis_resource_message: gate.crisis_resource_message,
    };
  }

  // ---- ชั้น 2: Keyword matching — ตัวแรกที่โดนคือตัวที่ชนะ ----
  for (const [logicId, keywords] of KEYWORD_MAP) {
    const hit = keywords.find((k) => message.includes(k));
    if (hit !== undefined) {
      return {
        logic_id: logicId,
        logic_name: LOGIC_NAMES[logicId],
        confidence: 0.85,
        method: "keyword",
        response_mode: RESPONSE_MODE[logicId] ?? "chat",
        matched_keyword: hit,
      };
    }
  }

  // ---- ชั้น 3: ไม่โดน keyword — ผู้เรียกควรลอง AI ก่อนยอมรับค่านี้ ----
  return {
    logic_id: FALLBACK_LOGIC_ID,
    logic_name: LOGIC_NAMES[FALLBACK_LOGIC_ID],
    confidence: 0.5,
    method: "fallback_no_keyword_match",
    response_mode: RESPONSE_MODE[FALLBACK_LOGIC_ID] ?? "chat",
  };
}

/** logic id ที่ AI ได้รับอนุญาตให้เลือก — นอกเหนือจากนี้ถือว่าเพี้ยน ให้ตกไป 18 */
export const VALID_LOGIC_IDS: readonly number[] = [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21];

/**
 * คำอธิบายเสริมเฉพาะ Logic ที่ AI สับสนจริงตอนทดสอบ — ใช้แค่ในพรอมป์ต์เท่านั้น
 * ⚠️ ห้ามยัดลง LOGIC_NAMES เพราะตารางนั้นถูกล็อกด้วย golden test ให้ตรงกับ Python
 *
 * ที่มา: ทดสอบจริงพบว่า "คนนี้เข้ากับบ้านฉันไหม" ถูกจัดเป็น Logic 17 (ความรัก)
 * ทั้งที่เป็นความเข้ากันระหว่าง คน↔สถานที่ = Logic 20 เพราะชื่อ "ข่ายความสัมพันธ์หลาย
 * entity" ไม่ได้บอก AI ว่า entity หมายถึงบ้าน/รถ/องค์กรด้วย
 */
export const ROUTER_HINTS: Record<number, string> = {
  17: "เฉพาะความรัก/คู่รัก/เนื้อคู่ระหว่าง คน↔คน เท่านั้น",
  20: "ความเข้ากันระหว่างคนกับสิ่งที่ไม่ใช่คู่รัก เช่น บ้าน รถ องค์กร เพื่อนร่วมงาน สถานที่",
  18: "ปลายทางเริ่มต้น: ทักทาย คุยเล่น ถามกว้างๆ หรือกรณีที่ไม่มั่นใจ",
  21: "ผู้ใช้ขอ 'สุ่ม/เสี่ยงทาย' คำตอบ ไม่ใช่การคำนวณจากวันเกิด",
  12: "อาหาร ของกิน สุขภาพร่างกาย",
  3: "เลือก 'เวลา' หรือ 'ทิศ' ที่เป็นมงคลสำหรับจะทำอะไรสักอย่าง (ฤกษ์) ไม่ใช่การจัดพื้นที่",
  7: "การจัดวางพื้นที่/ห้อง/บ้าน ทิศที่หันไป สีห้อง รูปทรงห้อง",
};

/** system prompt ของชั้น AI classification (แยกจาก route handler ให้เทสต์/แก้ที่เดียว) */
export function getRouterSystemPrompt(): string {
  const menu = VALID_LOGIC_IDS.map((id) => {
    const hint = ROUTER_HINTS[id];
    return `  ${id} = ${LOGIC_NAMES[id]}${hint ? ` — ${hint}` : ""}`;
  }).join("\n");
  return `คุณคือ Router ของระบบพยากรณ์ KRUTH ELEMENT หน้าที่เดียวของคุณคือ "จำแนกว่าข้อความ
ของผู้ใช้ควรส่งไป Logic ไหน" — ห้ามตอบคำถามผู้ใช้ ห้ามทำนายอะไรทั้งสิ้น

เลือกได้เฉพาะรหัสเหล่านี้:
${menu}

กฎ:
1. ถ้าไม่มั่นใจ หรือเป็นคำถามกว้างๆ/ทักทาย/คุยเล่น ให้ตอบ 18 (กาลชะตาและสรรพสิ่ง)
2. confidence ให้ตามจริง 0.0-1.0 — ถ้าเดา ให้ต่ำกว่า 0.6
3. entities ดึงเท่าที่มีจริงในข้อความ ห้ามแต่งเพิ่ม
4. ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON

รูปแบบ: {"logic_id": <int>, "confidence": <float>, "entities": {"person_name": null, "object_type": null, "question_topic": null}}`;
}

/**
 * ตรวจผลจาก AI ก่อนเชื่อ — AI อาจคืน logic_id ที่ไม่มีจริง หรือ confidence นอกช่วง
 * คืน null ถ้าใช้ไม่ได้ (ผู้เรียกควรตกไป fallback 18)
 */
export function validateAiClassification(raw: unknown): { logic_id: number; confidence: number } | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const id = typeof o.logic_id === "number" ? o.logic_id : Number(o.logic_id);
  if (!Number.isInteger(id) || !VALID_LOGIC_IDS.includes(id)) return null;

  const rawConf = typeof o.confidence === "number" ? o.confidence : Number(o.confidence);
  // confidence เพี้ยน/ไม่มี ไม่ใช่เหตุให้ทิ้งคำตอบทั้งอัน — แค่ถือว่าไม่มั่นใจ
  const confidence = Number.isFinite(rawConf) ? Math.min(1, Math.max(0, rawConf)) : 0.5;

  return { logic_id: id, confidence };
}
