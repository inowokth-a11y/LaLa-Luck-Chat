// Provider: Google Gemini — ตัวสำรองกลางของทุกบทบาท (ผู้ใช้เลือกไว้)
// เรียกผ่าน REST (generativelanguage API) เพื่อไม่ต้องเพิ่ม dependency
//
// รุ่นที่ยืนยันว่าใช้ได้จริงกับ key นี้ (ตรวจจาก /v1beta/models):
//   gemini-3.5-flash · gemini-3.1-pro-preview · gemini-2.5-flash · gemini-2.5-pro

import type { AiProvider, GenerateRequest, ProviderOutput } from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** ดึงข้อความ + กันคำตอบว่าง/ขาด — ว่าง = throw ให้ fallback chain (บทเรียนเดียวกับ gpt-5.5) */
function geminiText(json: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
}): string {
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error(`Gemini คืนคำตอบว่าง (finishReason=${json.candidates?.[0]?.finishReason ?? "?"})`);
  }
  return text;
}

export const geminiProvider: AiProvider = {
  name: "gemini",

  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY);
  },

  async generate(req: GenerateRequest, model: string): Promise<ProviderOutput> {
    // 🔴 privacy guard: provider นี้ห้ามรับภาพผู้ใช้ (ดู CANDIDATES.vision ใน index.ts)
    if (req.imageBase64) {
      throw new Error("provider นี้ไม่รองรับภาพ — ภาพผู้ใช้ส่งผ่าน Claude เท่านั้น");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Gemini แยก system prompt ออกมาเป็น system_instruction (ไม่ใช่ message แรก)
        system_instruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.input }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 4096,
          // Flash เป็นโมเดล thinking — ความคิดภายในกิน maxOutputTokens จนคำตอบขาดกลางประโยค
          // (เจอจริง 3 ส.ค. 2569 ตอนสลับ ai2 เป็น Gemini หลัก: ได้ 133 ตัวอักษรแล้วขาด)
          // ปิด thinking: งาน narrator ไม่ต้องคิดลึก ข้อเท็จจริงถูกล็อกจาก engine แล้ว
          thinkingConfig: { thinkingBudget: 0 },
        },
        // ให้ค้นเว็บได้เมื่อ AI-1 ต้องการ (google_search เป็น built-in tool ของ Gemini)
        ...(req.webSearch ? { tools: [{ google_search: {} }] } : {}),
      }),
    });

    if (!res.ok) {
      const err = new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`) as Error & {
        status: number;
      };
      err.status = res.status;
      throw err;
    }

    const json = (await res.json()) as GeminiResponse;

    // ถูก safety filter บล็อก = ไม่ควร retry แต่ควรเลื่อนไป candidate ถัดไป
    if (json.promptFeedback?.blockReason) {
      throw new Error(`Gemini บล็อกคำขอ: ${json.promptFeedback.blockReason}`);
    }

    return {
      text: geminiText(json),
      usage: {
        input_tokens: json.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        web_searches: 0, // google_search ของ Gemini ไม่คิดเงินแยกแบบ Anthropic
      },
    };
  },
};
