// ราคาโมเดล + คำนวณต้นทุนต่อการเรียก 1 ครั้ง
//
// ⚠️ ราคาที่นี่คือ **ค่าที่ต้องอัปเดตด้วยมือ** เมื่อผู้ให้บริการเปลี่ยนราคา
//    ตัวเลขชุดนี้ตรงกับที่บันทึกไว้ใน CLAUDE.md §10 (ก.ค. 2569)
//    ต้นทุนที่คำนวณได้จะถูก**เก็บค่าตายตัวลง ai_usage_log** ไม่คำนวณย้อนหลัง
//    เพราะราคาและเรตแลกเปลี่ยนเปลี่ยนได้ — ของเก่าต้องคงต้นทุน ณ วันนั้นไว้

/** USD ต่อ 1 ล้าน token */
interface ModelPrice {
  input: number;
  output: number;
}

const PRICES: Record<string, ModelPrice> = {
  "gpt-5.5": { input: 5, output: 30 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "gemini-3.5-flash": { input: 1.5, output: 9 },
};

/** ค่าค้นเว็บของ Anthropic — $10 ต่อ 1,000 ครั้ง */
const WEB_SEARCH_USD_EACH = 10 / 1000;

/**
 * เรตแลกเปลี่ยนที่ใช้แปลงเป็นบาท
 * ⚠️ ค่าคงที่ ไม่ได้ดึงเรตจริงตามเวลา — ถ้าเงินบาทผันผวนมากต้องอัปเดตเอง
 *    ตั้ง `USD_THB_RATE` ใน env เพื่อทับค่านี้ได้โดยไม่ต้องแก้โค้ด
 */
export function usdThbRate(): number {
  const env = Number(process.env.USD_THB_RATE);
  return Number.isFinite(env) && env > 0 ? env : 36;
}

export interface CostBreakdown {
  usd: number;
  thb: number;
  /** true = ไม่รู้จักโมเดลนี้ ต้นทุนที่ได้จึงเป็น 0 และเชื่อถือไม่ได้ */
  unknownModel: boolean;
}

/**
 * คำนวณต้นทุนการเรียก 1 ครั้ง
 * ⚠️ โมเดลที่ไม่มีในตารางจะได้ต้นทุน 0 พร้อมธง `unknownModel` — **ห้ามเงียบ**
 *    ผู้เรียกต้อง log เตือน ไม่งั้นต้นทุนจะหายไปจากรายงานโดยไม่มีใครรู้
 */
export function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  webSearches = 0,
  cacheReadTokens = 0,
  cacheCreationTokens = 0
): CostBreakdown {
  const p = PRICES[model];
  if (!p) {
    return { usd: webSearches * WEB_SEARCH_USD_EACH, thb: 0, unknownModel: true };
  }
  // prompt caching (Anthropic): อ่านจากแคช = 0.1× ราคา input · เขียนแคช = 1.25×
  // (input_tokens ของ API ไม่รวมส่วนแคชอยู่แล้ว — บวกแยกตรงนี้เพื่อบันทึกต้นทุนตามจริง)
  const usd =
    (inputTokens / 1_000_000) * p.input +
    (cacheReadTokens / 1_000_000) * p.input * 0.1 +
    (cacheCreationTokens / 1_000_000) * p.input * 1.25 +
    (outputTokens / 1_000_000) * p.output +
    webSearches * WEB_SEARCH_USD_EACH;
  return { usd, thb: usd * usdThbRate(), unknownModel: false };
}

/** รายชื่อโมเดลที่มีราคาอยู่ — ใช้เทสต์ว่า CANDIDATES ทุกตัวมีราคาครบ */
export function pricedModels(): string[] {
  return Object.keys(PRICES);
}
