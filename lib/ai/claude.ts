// Provider: Anthropic Claude — ใช้ official SDK (@anthropic-ai/sdk)
// Router (Haiku) + AI-1 (Sonnet, ต้องค้นเว็บได้) + เป็นตัวสำรองของ AI-2

import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, GenerateRequest, ProviderOutput } from "./types";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // อ่าน ANTHROPIC_API_KEY จาก env เอง
  return client;
}

export const claudeProvider: AiProvider = {
  name: "claude",

  isAvailable() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async generate(req: GenerateRequest, model: string): Promise<ProviderOutput> {
    const maxTokens = req.maxTokens ?? 4096;

    // AI-1 ค้นความหมายสัญลักษณ์ความฝัน — เลือก tool variant "พื้นฐาน" โดยตั้งใจ (ก.ค. 2569)
    //
    // ⚠️ อย่าอัปเป็น web_search_20260209 โดยไม่วัดก่อน: รุ่นใหม่มี dynamic filtering ซึ่งรัน
    //    code_execution 6-9 รอบเบื้องหลังเพื่อกรองผลค้น → input token พุ่งเท่าตัว
    //    วัดจริงด้วยฝันประโยคเดียวกัน max_uses=2 เท่ากัน:
    //      web_search_20260209 → in 61,515 · out 6,725 · 117 วิ · ฿11.00
    //      web_search_20250305 → in 33,904 · out 5,706 ·  82 วิ · ฿7.46  ← ใช้ตัวนี้
    //    งานของ AI-1 คือ "ตัดสินธาตุจากความหมายเชิงสัญลักษณ์ของคำเดียว" ไม่ใช่งานวิจัยที่ต้อง
    //    กรองผลค้นจำนวนมาก จึงไม่คุ้มกับ code_execution loop
    //
    // max_uses: 2 — พิสูจน์แล้วว่าบังคับได้จริง (เดิมไม่จำกัด) สัญลักษณ์คำเดียวไม่ต้องเกิน 2 แหล่ง
    const tools = req.webSearch
      ? [{ type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 2 }]
      : undefined;

    // ภาพ (role vision): ส่งเป็น content block คู่กับข้อความ — base64 ล้วน ไม่มี data: prefix
    const content: Anthropic.ContentBlockParam[] | string = req.imageBase64
      ? [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: req.imageMediaType ?? "image/jpeg",
              data: req.imageBase64,
            },
          },
          { type: "text" as const, text: req.input },
        ]
      : req.input;

    const res = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      // cacheSystem: ห่อ system เป็น block พร้อม cache_control — ต่ำกว่าเกณฑ์โมเดลจะไม่แคชเงียบๆ (ไม่ error)
      system: req.cacheSystem
        ? [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }]
        : req.system,
      messages: [{ role: "user", content }],
      // adaptive thinking ช่วยงานที่ต้องใช้เหตุผล (AI-1 ตัดสินธาตุ) — Haiku ไม่รองรับ จึงเปิดเฉพาะรุ่นใหม่
      ...(model.startsWith("claude-haiku") ? {} : { thinking: { type: "adaptive" as const } }),
      ...(tools ? { tools } : {}),
    });

    // รวมเฉพาะ text block (ข้าม thinking / server_tool_use / web_search_tool_result)
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // ⚠️ นับเฉพาะ name === "web_search" — บล็อก server_tool_use รวม code_execution ของ
    //    dynamic filtering ด้วย ถ้านับรวมจะได้ตัวเลขเกินจริง (เคยนับผิดเป็น 11 ครั้งมาแล้ว)
    const webSearches = res.content.filter(
      (b) => b.type === "server_tool_use" && b.name === "web_search"
    ).length;

    return {
      text,
      usage: {
        input_tokens: res.usage.input_tokens,
        output_tokens: res.usage.output_tokens,
        web_searches: webSearches,
        cache_read_tokens: res.usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: res.usage.cache_creation_input_tokens ?? 0,
      },
    };
  },
};
