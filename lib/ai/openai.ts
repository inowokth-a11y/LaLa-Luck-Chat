// Provider: OpenAI — ใช้กับ AI-2 "อาจารย์ลาลา ลักกี้" (ชั้นเรียบเรียงคำทำนาย)
// ผู้ใช้เลือกไว้ว่าชั้นนำเสนอใช้ OpenAI เพราะข้อเท็จจริงถูกล็อกด้วย engine + Claude มาแล้ว
//
// ⚠️ ยังไม่มี OPENAI_API_KEY ใน .env.local — isAvailable() จะคืน false และระบบจะ
// fallback ไป Claude อัตโนมัติ (ดู lib/ai/index.ts) ใส่ key เมื่อไหร่ก็สลับเองทันที
// ไม่ต้องแก้โค้ด — เรียกผ่าน REST เพื่อไม่ต้องเพิ่ม dependency ตอนที่ยังไม่ได้ใช้

import type { AiProvider, GenerateRequest, ProviderOutput } from "./types";

export const openaiProvider: AiProvider = {
  name: "openai",

  isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  async generate(req: GenerateRequest, model: string): Promise<ProviderOutput> {
    // 🔴 privacy guard: provider นี้ห้ามรับภาพผู้ใช้ (ดู CANDIDATES.vision ใน index.ts)
    if (req.imageBase64) {
      throw new Error("provider นี้ไม่รองรับภาพ — ภาพผู้ใช้ส่งผ่าน Claude เท่านั้น");
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: req.maxTokens ?? 4096,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.input },
        ],
      }),
    });

    if (!res.ok) {
      const err = new Error(`OpenAI ${res.status}: ${await res.text()}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: (json.choices?.[0]?.message?.content ?? "").trim(),
      usage: {
        input_tokens: json.usage?.prompt_tokens ?? 0,
        output_tokens: json.usage?.completion_tokens ?? 0,
        web_searches: 0, // OpenAI ในระบบนี้ไม่ได้เปิดค้นเว็บ
      },
    };
  },
};
