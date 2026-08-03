// จุดเรียก AI เดียวของทั้งแอป — ปิดบัง provider ไว้ข้างใน
//
// สถาปัตยกรรมที่ผู้ใช้ตัดสินใจ (CLAUDE.md §9 ข้อ 7):
//   Router : Claude Haiku  → Gemini Flash → Claude Sonnet  (+ keyword-layer ฝั่ง caller)
//   AI-1   : Claude Sonnet → Gemini Pro   → Claude Opus    (ข้ามได้ถ้าล้มหมด — non-blocking)
//   AI-2   : OpenAI        → Gemini Pro   → Claude Opus    (→ template non-LLM ฝั่ง caller)
//
// candidate ที่ provider ยังไม่มี API key จะถูกข้ามอัตโนมัติ (isAvailable())
// ✅ ต่อครบ 3 เจ้าแล้ว: ANTHROPIC_API_KEY · OPENAI_API_KEY · GEMINI_API_KEY

import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import { isTransientError, type AiProvider, type AiRole, type GenerateRequest, type GenerateResult } from "./types";
import { calcCost } from "./pricing";
import { logAiUsage } from "@/lib/usage/log";

export type { AiRole, GenerateRequest, GenerateResult } from "./types";

interface Candidate {
  provider: AiProvider;
  model: string;
}

/**
 * ลำดับ candidate ต่อบทบาท — ตัวแรกคือ primary
 * ⚠️ model id ทุกตัวยืนยันแล้วว่ามีจริงกับ key ที่ใช้อยู่ (ตรวจจาก /models ของแต่ละเจ้า)
 *    อย่าเดา id เอง — ของเดิมเคยตั้ง "gpt-5" ซึ่งไม่มีอยู่จริง
 */
const CANDIDATES: Record<AiRole, Candidate[]> = {
  router: [
    { provider: claudeProvider, model: "claude-haiku-4-5" },
    { provider: geminiProvider, model: "gemini-3.5-flash" },
    { provider: claudeProvider, model: "claude-sonnet-5" },
  ],
  ai1: [
    { provider: claudeProvider, model: "claude-sonnet-5" },
    { provider: geminiProvider, model: "gemini-3.5-flash" },
    { provider: claudeProvider, model: "claude-opus-4-8" },
  ],
  ai2: [
    // 🔴 สลับเป็น Gemini Flash หลัก (ผู้ใช้เลือก "ทาง ค" 3 ส.ค. 2569 — เหตุผลต้นทุน:
    //    gpt-5.5 วัดจริง ฿0.62/คำตอบหลัง prompt ยาวขึ้น ทำแชทหลุดกฎกำไร 500% ·
    //    Gemini Flash ฿0.04 → กำไรกลับมา ~14×) · gpt-5.5 เป็นสำรองแรก (คุณภาพใกล้เคียง)
    // ⚠️ เงื่อนไขผูกพัน: ต้องเปิด billing บนคีย์ Gemini (paid tier) เพื่อให้คำมั่นใน /consent
    //    ว่า "ไม่ถูกใช้เทรนโมเดล" เป็นจริง — free tier ของ Google ใช้ข้อมูล improve ได้
    { provider: geminiProvider, model: "gemini-3.5-flash" },
    { provider: openaiProvider, model: "gpt-5.5" },
    { provider: claudeProvider, model: "claude-opus-4-8" }, // สำรองสุดท้ายก่อน template
  ],
  // 🔴 vision = Claude เท่านั้น (ผู้ใช้ตัดสิน 30 ก.ค. 2569 เรื่อง privacy ภาพนำเข้า):
  //    คีย์ Gemini เป็น free tier ซึ่ง Google ระบุว่า "ข้อมูลถูกใช้ improve products"
  //    → ห้ามเพิ่ม Gemini เข้า chain นี้จนกว่าจะอัปเกรดเป็น paid tier
  //    (provider อื่นมี guard throw ถ้าเจอภาพ — เผลอเพิ่มแล้วจะพังทันที ไม่รั่วเงียบๆ)
  vision: [
    { provider: claudeProvider, model: "claude-haiku-4-5" }, // งานจำแนกเข้า enum — Haiku พอและถูกสุด
    { provider: claudeProvider, model: "claude-sonnet-5" },
  ],
  // memory = สรุปประวัติดวง/ความฝันของผู้ใช้ (เฟส 3) — ข้อมูลอ่อนไหว ใช้ Claude เท่านั้น
  // (เหตุผลเดียวกับ vision: คีย์ Gemini เป็น free tier ที่ Google ใช้ข้อมูล improve products)
  memory: [
    { provider: claudeProvider, model: "claude-haiku-4-5" },
    { provider: claudeProvider, model: "claude-sonnet-5" },
  ],
};

// ⚠️ ทำไม Gemini ใช้ Flash ทุกบทบาท (ไม่ใช่ Pro ตามที่ออกแบบไว้ตอนแรก):
// ทดสอบจริงกับ key ปัจจุบันแล้วพบว่า **รุ่น Pro ทุกตัวคืน 429 quota เกิน**
// (gemini-3.1-pro-preview / gemini-3-pro-preview / gemini-2.5-pro / gemini-pro-latest)
// ส่วนรุ่น Flash ทุกตัวทำงานปกติ — key นี้อยู่ free tier
// ถ้าอัปเกรดแพ็กเกจ Google แล้ว ค่อยเปลี่ยนสำรองของ ai1/ai2 กลับเป็น Pro เพื่อคุณภาพที่ดีกว่า

const RETRIES_PER_CANDIDATE = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** มี AI ให้ใช้ไหมสำหรับบทบาทนี้ (ใช้ตัดสินใจ degrade แบบ deterministic) */
export function isRoleAvailable(role: AiRole): boolean {
  return CANDIDATES[role].some((c) => c.provider.isAvailable());
}

/**
 * เรียก AI ตามบทบาท พร้อม retry/backoff และเลื่อนไป candidate ถัดไปเมื่อจำเป็น
 * โยน error เฉพาะเมื่อ candidate หมดทุกตัว — caller ต้องมี fallback ที่ไม่ใช่ LLM รองรับ
 */
export async function generate(req: GenerateRequest): Promise<GenerateResult> {
  const candidates = CANDIDATES[req.role].filter((c) => c.provider.isAvailable());
  if (candidates.length === 0) {
    throw new Error(`ไม่มี provider ที่พร้อมใช้สำหรับบทบาท "${req.role}" — ตรวจ API key ใน .env.local`);
  }

  let lastErr: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const { provider, model } = candidates[i];
    for (let attempt = 0; attempt <= RETRIES_PER_CANDIDATE; attempt++) {
      const t0 = Date.now();
      try {
        const out = await provider.generate(req, model);
        const cost = calcCost(
          model,
          out.usage?.input_tokens ?? 0,
          out.usage?.output_tokens ?? 0,
          out.usage?.web_searches ?? 0
        );
        // fire-and-forget — การบันทึกสถิติต้องไม่หน่วงคำตอบผู้ใช้และต้องไม่ทำให้พัง
        void logAiUsage({
          userId: req.userId,
          channel: req.channel,
          logicId: req.logicId,
          aiRole: req.role,
          provider: provider.name,
          model,
          usedFallback: i > 0,
          usage: out.usage,
          cacheHit: req.cacheHit ?? null,
          durationMs: Date.now() - t0,
          ok: true,
        });
        return {
          text: out.text,
          usage: out.usage,
          costThb: cost.thb,
          provider: provider.name,
          model,
          usedFallback: i > 0,
        };
      } catch (err) {
        lastErr = err;
        // บันทึกความล้มเหลวด้วย — ไม่งั้นจะไม่รู้ว่า provider ไหนล่มบ่อย
        void logAiUsage({
          userId: req.userId,
          channel: req.channel,
          logicId: req.logicId,
          aiRole: req.role,
          provider: provider.name,
          model,
          usedFallback: i > 0,
          durationMs: Date.now() - t0,
          ok: false,
          errorMessage: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
        });
        // error ถาวร (เช่น 400/401) → เลื่อน candidate ทันที ไม่ retry
        if (!isTransientError(err) || attempt === RETRIES_PER_CANDIDATE) break;
        await sleep(2 ** attempt * 500); // exponential backoff: 0.5s, 1s
      }
    }
    console.warn(`[ai] candidate ${provider.name}/${model} ล้มเหลว → ลองตัวถัดไป`, lastErr);
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * ดึง JSON จากข้อความของ AI — ทนต่อ prose/markdown ที่มาก่อน
 * เอาก้อน "ท้ายสุด" ที่ parse ได้ เพราะโมเดลมักอธิบายก่อนแล้วค่อยสรุปเป็น JSON
 */
export function extractJson<T>(text: string): T | null {
  // 1) ลอง ```json fence ก่อน (เอาอันท้ายสุด)
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  for (let i = fences.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(fences[i][1].trim()) as T;
    } catch {
      /* ลอง fence ก่อนหน้า */
    }
  }

  // 2) สแกนหาวงเล็บที่สมดุล — ไล่จาก "{" ตัวท้ายสุดมาหน้า
  const opens: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") opens.push(i);
  }
  for (let k = opens.length - 1; k >= 0; k--) {
    const start = opens[k];
    const openCh = text[start];
    const closeCh = openCh === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === openCh) depth++;
      else if (ch === closeCh) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1)) as T;
          } catch {
            break; // ก้อนนี้ไม่ใช่ JSON ที่ถูกต้อง ลองก้อนก่อนหน้า
          }
        }
      }
    }
  }
  return null;
}
