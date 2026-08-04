// สัญญากลางของชั้น AI — ทุก provider ต้องทำตาม interface เดียวกัน
// (CLAUDE.md §9 ข้อ 7: Router=Claude Haiku · AI-1=Claude Sonnet · AI-2=OpenAI · Gemini=สำรองกลาง)

/** บทบาทของ AI ในระบบ — คนละหน้าที่ คนละโมเดล */
export type AiRole =
  | "router" // Logic 0: จำแนก intent → ชี้ Logic
  | "ai1" // Logic 4: ค้นคว้า+ตัดสินธาตุของสัญลักษณ์ที่ไม่มีในฐาน
  | "ai2" // ตัวหลัก "อาจารย์ลาลา ลักกี้": เรียบเรียงคำทำนาย/บทสนทนา
  | "vision" // จำแนกลวดลาย/รูปทรงจากภาพเป็น enum — Claude เท่านั้น (ดู CANDIDATES)
  | "memory"; // สรุปประวัติผู้ใช้ (rolling summary เฟส 3) — Claude เท่านั้น (ข้อมูลอ่อนไหว)

export interface GenerateRequest {
  role: AiRole;
  system: string;
  /** ข้อความผู้ใช้ หรือ context ที่ engine คำนวณมาแล้ว */
  input: string;
  maxTokens?: number;
  /** ให้ provider เปิดเครื่องมือค้นเว็บ (ใช้กับ AI-1) */
  webSearch?: boolean;
  /** ขอแคช system prompt (Anthropic prompt caching — ต้อง ≥4,096 token บน Haiku ไม่งั้นเงียบเฉยๆ)
   *  เปิดเฉพาะ prompt ใหญ่คงที่ เช่น planner (4 ส.ค. 2569: ~6k token — เดิมเล็กเกินเกณฑ์ ดู §10) */
  cacheSystem?: boolean;

  // ---- ภาพ (role "vision" เท่านั้น) ----
  // 🔴 provider ที่ไม่รองรับภาพต้อง throw ทันทีถ้าเจอ field นี้ — ห้ามเงียบๆ ส่งแค่ข้อความ
  //    และห้ามส่งภาพผู้ใช้ผ่าน Gemini จนกว่าคีย์จะเป็น paid tier (free tier ใช้ข้อมูลเทรน)
  /** base64 ล้วน (ไม่มี data: prefix) */
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp";

  // ---- ข้อมูลประกอบสำหรับบันทึกต้นทุน (ไม่ส่งผลต่อคำตอบ) ----
  /** Logic ที่เรียก (ตรงกับ LOGIC_NAMES) */
  logicId?: number;
  /** 'web' | 'line' */
  channel?: string;
  /** ผู้ใช้ (ถ้ารู้) — ตอนนี้เว็บยังไม่มีระบบสมาชิก ส่วนใหญ่จึงเป็น null */
  userId?: string | null;
  /** true = ตอบได้จากแคช/ฐานข้อมูล ไม่ต้องปลุก AI-1 */
  cacheHit?: boolean;
}

export interface GenerateResult {
  text: string;
  usage?: AiUsage;
  /** ต้นทุนบาทของการเรียกครั้งนี้ (0 ถ้า provider ไม่คืน usage) */
  costThb?: number;
  /** provider/โมเดลที่ตอบจริง — ใช้ log ว่า turn ไหนใช้ตัวสำรอง */
  provider: string;
  model: string;
  /** true ถ้าไม่ได้ใช้ candidate ตัวแรก */
  usedFallback: boolean;
}

/** token/การค้นเว็บที่ใช้ไปจริง — ใช้คำนวณต้นทุนลง ai_usage_log */
export interface AiUsage {
  input_tokens: number;
  output_tokens: number;
  /** จำนวนครั้งที่ค้นเว็บ (คิดเงินแยกจาก token) */
  web_searches: number;
  /** prompt caching (Anthropic): token ที่อ่านจากแคช (คิด 0.1×) / เขียนแคช (คิด 1.25×) */
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
}

export interface ProviderOutput {
  text: string;
  /** undefined = provider ไม่ได้คืนตัวเลขมา → ต้นทุนจะถูกบันทึกเป็น 0 และต้องเตือน */
  usage?: AiUsage;
}

export interface AiProvider {
  name: string;
  /** พร้อมใช้ไหม (มี API key หรือยัง) */
  isAvailable(): boolean;
  generate(req: GenerateRequest, model: string): Promise<ProviderOutput>;
}

/** error ชั่วคราวที่ควร retry ก่อนเลื่อนไป candidate ถัดไป */
export function isTransientError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (typeof e?.status === "number") {
    return e.status === 429 || e.status === 408 || e.status >= 500;
  }
  const msg = String(e?.message ?? "").toLowerCase();
  return msg.includes("timeout") || msg.includes("econnreset") || msg.includes("overloaded");
}
