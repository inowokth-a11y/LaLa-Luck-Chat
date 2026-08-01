// LINE OA webhook — ประตูทางเข้าหลักของระบบ (CLAUDE.md §1)
//
// ⚠️ ลำดับสำคัญ ห้ามสลับ:
//   1. ตรวจลายเซ็น       — ปฏิเสธทุก request ที่ไม่ได้มาจาก LINE จริง ก่อนแตะ payload
//   2. Safety Gate       — ผ่าน Router ชั้นแรก ก่อน AI ทุกตัว ไม่มีข้อยกเว้น
//   3. Router            — keyword ก่อน แล้วค่อย AI
//   4. Logic ปลายทาง     — chat ตอบในแชท / liff ส่งปุ่มเปิด mini-app
//
// ⚠️ ต้องคืน 200 เสมอแม้ประมวลผลไม่สำเร็จ (ยกเว้นลายเซ็นไม่ผ่าน = 401)
//    ถ้าคืน 5xx LINE จะ retry เหตุการณ์เดิมซ้ำ ผู้ใช้จะได้ข้อความซ้ำและเสียค่า AI ซ้ำ
//
// 🔴 **ต้องคืน 200 ภายใน 2 วินาที** — LINE ระบุว่าถ้าไม่ได้ 2xx ภายใน 2 วิ จะขึ้น
//    `request_timeout` และ retry ดังนั้น **ห้ามทำงานหนักก่อนตอบ 200**
//    วัดจริงก่อนแก้: ฝันที่มีในแคช 8.2 วินาที · ปลุก AI-1 ~100 วินาที → เกินทั้งคู่
//
//    โครงใหม่: ตรวจลายเซ็น (เร็ว) → **คืน 200 ทันที** → ทำงานต่อใน after()
//    - งานเร็ว (safety/LIFF/เมนู ~300ms) → ตอบด้วย replyToken (ฟรี)
//    - งานช้า (ทำนายฝัน) → ตอบรับด้วย replyToken ทันที แล้ว **push** คำตอบจริงตามไปทีหลัง
//      เพราะ LINE เตือนว่า *"don't rely on the time limit"* ของ replyToken

import { NextResponse, after } from "next/server";
import { routeByKeyword, validateAiClassification, getRouterSystemPrompt, LOGIC_NAMES, RESPONSE_MODE, type RouteResult } from "@/lib/engine/router";
import { interpretDream } from "@/lib/engine/dream";
import { generate, extractJson, isRoleAvailable } from "@/lib/ai";
import { verifyLineSignature, replyMessage, pushMessage, textMessage, type LineMessage } from "@/lib/line/client";
import { buildReply, errorMessage, unsupportedMessage, welcomeMessage, ackMessage } from "@/lib/line/reply";
import { lookupCachedDiscovery, saveDiscovery } from "@/lib/dream/discovery-cache";
import { getAi1SystemPrompt } from "@/lib/engine/dream";
import { LALA_PERSONA } from "@/lib/ai/persona";

export const runtime = "nodejs";
/** งานใน after() นับรวมในเวลานี้ — AI-1 วัดได้ ~100 วิ เผื่อไว้ถึงลิมิตของแผน (Hobby/Pro = 300s) */
export const maxDuration = 300;

interface LineEvent {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
  source?: { userId?: string };
}

const LALA_SYSTEM = `${LALA_PERSONA}

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ได้เฉพาะข้อมูลใน <ผลการวิเคราะห์> ที่ให้มาเท่านั้น — ห้ามแต่งสัญลักษณ์ ธาตุ หรือความหมายขึ้นเอง
2. ห้ามฟันธงชะตาชีวิต ห้ามทำนายเรื่องสุขภาพ/การเงิน/ความตายแบบชี้ขาด
3. ตอบระดับหลักการ ชวนให้เขาตีความเอง
4. ห้ามให้คำแนะนำทางการแพทย์หรือจิตเวช
5. ความยาว 2-3 ย่อหน้าสั้น ๆ (นี่คือแชท LINE ไม่ใช่หน้าเว็บ) เข้าเรื่องเลย`;

/** ประกอบ origin จาก header ของ request — ใช้ทำลิงก์ LIFF โดยไม่ต้อง hardcode โดเมน */
function baseUrlFrom(req: Request): string {
  const env = process.env.NEXT_PUBLIC_LIFF_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  // ---- 1. ตรวจลายเซ็นก่อนแตะ payload ----
  // ต้องอ่านเป็น text ดิบ — parse แล้ว stringify ใหม่จะทำให้ลายเซ็นไม่ตรง
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    console.warn("[line] ลายเซ็นไม่ผ่าน — ปฏิเสธ request");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(rawBody) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return NextResponse.json({ ok: true, note: "payload ไม่ใช่ JSON" });
  }

  const baseUrl = baseUrlFrom(req);

  // 🔴 ห้ามใส่ await ตรงนี้ — งานทั้งหมดย้ายไปหลังส่ง 200 แล้ว
  after(async () => {
    await Promise.all(events.map((ev) => handleEvent(ev, baseUrl)));
  });

  // ตอบ 200 ทันที (ไม่กี่ ms) ให้ทันลิมิต 2 วินาทีของ LINE
  return NextResponse.json({ ok: true, accepted: events.length });
}

async function handleEvent(ev: LineEvent, baseUrl: string): Promise<Record<string, unknown>> {
  if (ev.type === "follow") {
    if (ev.replyToken) await replyMessage(ev.replyToken, welcomeMessage());
    return { type: "follow", replied: true };
  }

  if (ev.type !== "message" || !ev.replyToken) {
    return { type: ev.type, replied: false, reason: "ไม่ใช่เหตุการณ์ที่ต้องตอบ" };
  }

  const msg = ev.message;
  if (!msg) return { type: ev.type, replied: false };

  if (msg.type !== "text") {
    await replyMessage(ev.replyToken, unsupportedMessage(msg.type));
    return { type: `message/${msg.type}`, replied: true, reason: "ยังไม่รองรับสื่อชนิดนี้" };
  }

  const text = (msg.text ?? "").trim();
  if (!text) {
    await replyMessage(ev.replyToken, welcomeMessage());
    return { type: "message/text", replied: true, reason: "ข้อความว่าง" };
  }

  try {
    const route = await routeMessage(text);

    // ---- ทางเร็ว: ตอบได้ทันทีจากผลของ Router (safety / liff / ยังไม่เปิด / เมนู) ----
    const immediate = buildReply(route, baseUrl);
    if (immediate) {
      await replyMessage(ev.replyToken, immediate);
      return { logic_id: route.logic_id, method: route.method, replied: "reply" };
    }

    // ---- ทางช้า: Logic 4 ทำนายฝัน (engine + AI อาจนานถึง ~100 วินาที) ----
    // ตอบรับด้วย replyToken ทันทีก่อน แล้วค่อย push คำตอบจริงตามไป
    // ⚠️ ห้ามเก็บ replyToken ไว้ใช้ตอนงานเสร็จ — LINE เตือนว่าห้ามพึ่งอายุ token
    const userId = ev.source?.userId;
    if (!userId) {
      // ไม่มี userId (เช่นบางบริบทกลุ่ม) → push ไม่ได้ ต้องยอมใช้ reply ตอนจบ
      const messages = await handleDream(text);
      await replyMessage(ev.replyToken, messages);
      return { logic_id: route.logic_id, replied: "reply (ไม่มี userId ให้ push)" };
    }

    await replyMessage(ev.replyToken, ackMessage());
    const messages = await handleDream(text);
    const pushed = await pushMessage(userId, messages);
    if (!pushed.ok) console.error("[line] push คำตอบไม่สำเร็จ", pushed.error);
    return { logic_id: route.logic_id, method: route.method, replied: "ack+push", push_ok: pushed.ok };
  } catch (e) {
    console.error("[line] ประมวลผลล้มเหลว", e);
    const userId = ev.source?.userId;
    // ตอบ error ด้วย reply ถ้ายังไม่เคยใช้ token, ไม่งั้น push
    const sent = await replyMessage(ev.replyToken, errorMessage());
    if (!sent.ok && userId) await pushMessage(userId, errorMessage());
    return { replied: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Router 3 ชั้น (ใช้ตรรกะเดียวกับ /api/logic/router — ไม่ยิง HTTP หากันเอง) */
async function routeMessage(text: string): Promise<RouteResult> {
  const base = routeByKeyword(text);
  if (base.method !== "fallback_no_keyword_match" || !isRoleAvailable("router")) return base;

  try {
    const ai = await generate({
      role: "router",
      channel: "line",
      system: getRouterSystemPrompt(),
      input: text,
      maxTokens: 300,
    });
    const valid = validateAiClassification(extractJson(ai.text));
    if (!valid) return base;
    return {
      logic_id: valid.logic_id,
      logic_name: LOGIC_NAMES[valid.logic_id],
      confidence: valid.confidence,
      method: "ai",
      response_mode: RESPONSE_MODE[valid.logic_id] ?? "chat",
    };
  } catch (e) {
    console.warn("[line] Router ชั้น AI ล้มเหลว — ใช้ fallback", e);
    return base;
  }
}

/**
 * Logic 4 — ทำนายฝันในแชท (ลำดับเดียวกับ /api/dream)
 * Safety Gate ถูกตรวจไปแล้วที่ชั้น Router แต่ interpretDream() ตรวจซ้ำเองอยู่แล้ว — ปล่อยไว้
 * เพราะการตรวจซ้ำถูกกว่าการลืมตรวจ
 */
async function handleDream(dreamText: string): Promise<LineMessage[]> {
  const result = interpretDream(dreamText, null, false, true);

  let discovery: Record<string, unknown> | null = null;
  if (!result.found_anything) {
    const cached = await lookupCachedDiscovery(dreamText);
    if (cached) {
      discovery = cached as unknown as Record<string, unknown>;
    } else if (isRoleAvailable("ai1")) {
      try {
        const ai1 = await generate({
          role: "ai1",
          logicId: 4,
          channel: "line",
          system: getAi1SystemPrompt(),
          input: `ผู้ใช้ฝันว่า: "${dreamText}"\n\nหาสัญลักษณ์หลักแล้วตัดสินธาตุจากความหมายเชิงสัญลักษณ์ ปิดท้ายด้วย JSON ในบล็อก \`\`\`json เสมอ`,
          webSearch: true,
          maxTokens: 6000,
        });
        const parsed = extractJson<Record<string, unknown>>(ai1.text);
        if (parsed?.dream_object) {
          discovery = parsed;
          await saveDiscovery(parsed);
        }
      } catch (e) {
        console.warn("[line] AI-1 ล้มเหลว — ข้ามขั้นตอนค้นคว้า", e);
      }
    }
  }

  const context = JSON.stringify(
    {
      ความฝัน: dreamText,
      สัญลักษณ์ที่พบในฐานข้อมูล: result.symbol_matches,
      ธีมจิตวิทยาที่พบ: result.theme_matches,
      สัญลักษณ์ใหม่จากการค้นคว้า: discovery,
    },
    null,
    1
  );

  try {
    const ai2 = await generate({
      role: "ai2",
      logicId: 4,
      channel: "line",
      system: LALA_SYSTEM,
      input: `<ผลการวิเคราะห์>\n${context}\n</ผลการวิเคราะห์>\n\nเรียบเรียงเป็นคำตอบสั้นๆ สำหรับแชท LINE`,
      maxTokens: 1024,
    });
    return [textMessage(ai2.text)];
  } catch (e) {
    console.warn("[line] AI-2 ล้มเหลว — ใช้ template", e);
    return [textMessage(renderDreamTemplate(result))];
  }
}

/** fallback ขั้นสุดท้ายเมื่อ AI ล่มหมด — ผู้ใช้ต้องได้คำตอบเสมอ */
function renderDreamTemplate(r: ReturnType<typeof interpretDream>): string {
  const lines: string[] = [];
  if (r.symbol_matches?.length) {
    lines.push("สัญลักษณ์ที่พบในความฝันของคุณ:");
    for (const m of r.symbol_matches) lines.push(`• ${m.object} — ธาตุ${m.element} (${m.meaning})`);
  }
  if (r.theme_matches?.length) {
    lines.push("", "ธีมทางจิตวิทยา:");
    for (const t of r.theme_matches) lines.push(`• ${t.theme} — ${t.psychological_meaning}`);
  }
  if (!lines.length) lines.push("ยังไม่พบสัญลักษณ์นี้ในฐานข้อมูล ลองเล่ารายละเอียดเพิ่มเติมได้ไหมคะ");
  lines.push("", "(ระบบเรียบเรียงอัตโนมัติชั่วคราว)");
  return lines.join("\n");
}

/** GET = health check — ดูว่าตั้งค่า key ครบไหมโดยไม่เปิดเผยค่า */
export async function GET() {
  return NextResponse.json({
    ok: true,
    has_channel_secret: Boolean(process.env.LINE_CHANNEL_SECRET),
    has_access_token: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    router_ai_available: isRoleAvailable("router"),
  });
}
