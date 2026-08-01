// Logic 4 — ทำนายฝัน (engine matching + AI-1 ค้นคว้า + AI-2 เรียบเรียง)
//
// ⚠️ ลำดับสำคัญ ห้ามสลับ (CLAUDE.md §6):
//   1. Safety Gate (deterministic TS) ← ต้องมาก่อน AI ทุกตัว ไม่มีข้อยกเว้น
//   2. engine matching จากฐาน 457 สัญลักษณ์ + 50 ธีม (deterministic)
//   3. AI-1 (Claude Sonnet) เฉพาะกรณีไม่พบในฐาน — ตัดสินธาตุ "เชิงความหมาย" ห้ามนับขีด (§5)
//   4. AI-2 (OpenAI→Claude) เรียบเรียงเป็นคำตอบ — ห้ามเพิ่มข้อเท็จจริงเอง

import { NextResponse } from "next/server";
import { interpretDream, getAi1SystemPrompt } from "@/lib/engine/dream";
import { safetyGate } from "@/lib/engine/element";
import { generate, extractJson, isRoleAvailable } from "@/lib/ai";
import { lookupCachedDiscovery, saveDiscovery, type Discovery } from "@/lib/dream/discovery-cache";
import { checkQuota, quotaExhaustedMessage } from "@/lib/chat/quota";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage, logicBucket } from "@/lib/chat/usage-db";
import { decideCharge, creditCost, chargeDeniedMessage } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { LALA_PERSONA } from "@/lib/ai/persona";

export const runtime = "nodejs";

const DREAM_LOGIC_ID = 4;

type Ai1Discovery = Discovery;

const LALA_SYSTEM = `${LALA_PERSONA}

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ได้เฉพาะข้อมูลใน <ผลการวิเคราะห์> ที่ให้มาเท่านั้น — ห้ามแต่งสัญลักษณ์ ธาตุ หรือความหมายขึ้นเอง
2. ห้ามฟันธงชะตาชีวิต ห้ามทำนายเรื่องสุขภาพ/การเงิน/ความตายแบบชี้ขาด
3. ถ้าผู้ใช้ไม่ได้ขอ "คำทำนายลึก" ให้ตอบระดับหลักการ ชวนให้เขาตีความเอง
4. ห้ามให้คำแนะนำทางการแพทย์หรือจิตเวช
5. ความยาว 3-5 ย่อหน้าสั้น ๆ ไม่ต้องขึ้นต้นด้วย "นี่คือ..." เข้าเรื่องเลย

โครงคำตอบ: ทักทายสั้น ๆ → สัญลักษณ์ที่พบและธาตุของมัน → ความหมายเชิงจิตวิทยา → เชื่อมกับธาตุประจำวันถ้ามี → ปิดท้ายด้วยคำถามชวนคิด 1 ข้อ`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      dreamText?: string;
      dayOfWeek?: string | null;
      wantDeepReading?: boolean;
    };
    const dreamText = (body.dreamText ?? "").trim();
    if (!dreamText) {
      return NextResponse.json({ error: "กรุณาเล่าความฝันของคุณ" }, { status: 400 });
    }

    // ---- 1. SAFETY GATE — ก่อน AI ทุกตัว ----
    const gate = safetyGate(dreamText);
    if (gate) {
      return NextResponse.json({
        intercepted: true,
        message: gate.crisis_resource_message,
        matched_keywords: gate.matched_keywords,
      });
    }

    // ---- 1b. gate ล็อกอิน — หลัง Safety Gate เสมอ (คนส่งสัญญาณวิกฤตต้องได้ข้อความช่วยเหลือ
    //      โดยไม่ติดล็อกอิน) · ผู้ใช้ตัดสิน 30 ก.ค. 2569: ฝันเป็นฟังก์ชันแพงสุดของระบบ
    //      (฿0.57 เจอในฐาน / ฿7.46 ปลุก AI-1) โควตา cookie ล้างแล้วได้ใหม่ = รูรั่วต้นทุน
    //      → บังคับล็อกอิน นับโควตาที่ DB (bucket logic:4) แล้วต่อด้วยเครดิต (2 เครดิต)
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServer();
      userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    } catch (e) {
      console.warn("[dream] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนทำนายฝัน (ฟรี " + checkQuota({}, DREAM_LOGIC_ID).limit + " ครั้ง จากนั้นใช้เครดิต)" },
        { status: 401 }
      );
    }

    const bucket = logicBucket(DREAM_LOGIC_ID);
    const used = await getDbUsage(userId, bucket);
    const quota = checkQuota({ [String(DREAM_LOGIC_ID)]: used }, DREAM_LOGIC_ID);
    const cost = creditCost("dream");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: quota.remaining, loggedIn: true, balance, cost });
    if (charge.mode === "denied") {
      return NextResponse.json(
        {
          quotaExceeded: true,
          message: `${quotaExhaustedMessage(DREAM_LOGIC_ID, cost)}\n\n${chargeDeniedMessage(charge)}`,
          remaining: 0,
          limit: quota.limit,
          credits: charge.balance,
          creditCost: charge.cost,
        },
        { status: 429 }
      );
    }

    // ---- 2. engine matching (deterministic) ----
    const result = interpretDream(dreamText, body.dayOfWeek ?? null, body.wantDeepReading ?? false, true);

    // ---- 3. AI-1: เฉพาะเมื่อไม่พบในฐานความรู้ ----
    let discovery: Ai1Discovery | null = null;
    let discoverySource: "none" | "cache" | "ai1" = "none";

    // 3a. อ่านแคชก่อน — AI-1 ราคา ฿10/ครั้ง (web search) ถ้าเคยค้นคำนี้แล้วไม่ต้องจ่ายซ้ำ
    if (!result.found_anything) {
      const cached = await lookupCachedDiscovery(dreamText);
      if (cached) {
        discovery = cached;
        discoverySource = "cache";
      }
    }

    // 3b. ไม่มีในแคชจริงๆ ค่อยเรียก AI-1
    if (!result.found_anything && !discovery && isRoleAvailable("ai1")) {
      try {
        const ai1 = await generate({
          role: "ai1",
          logicId: 4,
          channel: "web",
          system: getAi1SystemPrompt(),
          input: `ผู้ใช้ฝันว่า: "${dreamText}"

หาสัญลักษณ์หลักในความฝันนี้ที่ยังไม่มีในฐานข้อมูล 457 รายการ แล้วตัดสินธาตุจากความหมายเชิงสัญลักษณ์

⚠️ รูปแบบผลลัพธ์ (บังคับ): วิเคราะห์ให้สั้นที่สุดเท่าที่จำเป็น แล้ว**ปิดท้ายด้วย JSON ในบล็อก \`\`\`json เสมอ**
อย่าอธิบายยาวจนไม่ได้เขียน JSON — JSON คือผลลัพธ์ที่ระบบต้องใช้ ต้องมีเสมอ:

\`\`\`json
{"category":"...","dream_object":"...","chinese_char":"...","kangxi_strokes":null,"element":"ไม้|ไฟ|ดิน|ทอง|น้ำ","meaning_keyword":"..."}
\`\`\``,
          webSearch: true,
          maxTokens: 6000, // เผื่อพื้นที่ให้ค้นเว็บ+วิเคราะห์ แล้วยังเหลือเขียน JSON ปิดท้าย
        });
        discovery = extractJson<Ai1Discovery>(ai1.text);
        if (discovery?.dream_object) {
          discoverySource = "ai1";
          await saveDiscovery(discovery); // เข้าแคช + คิวรอรีวิว (ไม่ throw ถ้าเขียนไม่ได้)
        }
      } catch (e) {
        console.warn("[dream] AI-1 ล้มเหลว — ข้ามขั้นตอนค้นคว้า", e);
        // ไม่ throw: AI-1 เป็น non-blocking ตามดีไซน์ fallback
      }
    }

    // ---- 4. AI-2: เรียบเรียงคำตอบ ----
    const context = JSON.stringify(
      {
        ความฝัน: dreamText,
        สัญลักษณ์ที่พบในฐานข้อมูล: result.symbol_matches,
        ธีมจิตวิทยาที่พบ: result.theme_matches,
        การเชื่อมโยงกับธาตุประจำวัน: result.context_synthesis || null,
        สัญลักษณ์ใหม่จากการค้นคว้า: discovery,
        โหมด: body.wantDeepReading ? "คำทำนายลึก" : "ระดับหลักการ",
      },
      null,
      1
    );

    let reply: string;
    let via = "template";
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: 4,
        channel: "web",
        cacheHit: discoverySource === "cache" || result.found_anything,
        system: LALA_SYSTEM,
        input: `<ผลการวิเคราะห์>\n${context}\n</ผลการวิเคราะห์>\n\nเรียบเรียงเป็นคำตอบให้ผู้ใช้`,
        maxTokens: 2048,
      });
      reply = ai2.text;
      via = `${ai2.provider}/${ai2.model}${ai2.usedFallback ? " (สำรอง)" : ""}`;
    } catch (e) {
      console.warn("[dream] AI-2 ล้มเหลว — ใช้ template non-LLM", e);
      reply = renderTemplate(result, discovery); // fallback ขั้นสุดท้าย: ผู้ใช้ยังได้คำตอบ
    }

    // หักเมื่อตอบสำเร็จเท่านั้น — เส้นฟรี bump DB (atomic) · เส้นเครดิต spend_credits
    let afterUsed = used;
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "dream", bucket);
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[dream] หักเครดิตไม่สำเร็จหลังตอบแล้ว (race/พัง)", spent.reason);
    } else {
      const bumped = await bumpDbUsage(userId, bucket);
      afterUsed = bumped ?? used + 1;
    }
    const afterQuota = checkQuota({ [String(DREAM_LOGIC_ID)]: afterUsed }, DREAM_LOGIC_ID);

    return NextResponse.json({
      intercepted: false,
      reply,
      via,
      remaining: afterQuota.remaining,
      limit: afterQuota.limit,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
      engine: {
        found_anything: result.found_anything,
        symbol_matches: result.symbol_matches,
        theme_matches: result.theme_matches,
        context_synthesis: result.context_synthesis,
      },
      discovery,
      discovery_source: discoverySource, // "cache" = ไม่ได้เรียก AI-1 รอบนี้ (ประหยัด ~฿9.3)
    });
  } catch (err) {
    console.error("[dream] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/** fallback ขั้นสุดท้ายเมื่อ AI ทุกตัวล่ม — render ผล engine แบบไม่ใช้ LLM */
function renderTemplate(
  r: ReturnType<typeof interpretDream>,
  discovery: Ai1Discovery | null
): string {
  const lines: string[] = [];
  if (r.symbol_matches?.length) {
    lines.push("สัญลักษณ์ที่พบในความฝันของคุณ:");
    for (const m of r.symbol_matches) lines.push(`• ${m.object} — ธาตุ${m.element} (${m.meaning})`);
  }
  if (r.theme_matches?.length) {
    lines.push("", "ธีมทางจิตวิทยา:");
    for (const t of r.theme_matches) lines.push(`• ${t.theme} — ${t.psychological_meaning}`);
  }
  if (discovery?.dream_object) {
    lines.push("", `สัญลักษณ์ใหม่ที่ค้นพบ: ${discovery.dream_object} — ธาตุ${discovery.element ?? "-"}`);
  }
  if (r.context_synthesis) lines.push("", r.context_synthesis);
  if (!lines.length) lines.push("ยังไม่พบสัญลักษณ์นี้ในฐานข้อมูล ลองเล่ารายละเอียดเพิ่มเติมได้ไหมคะ");
  lines.push("", "(ระบบเรียบเรียงอัตโนมัติชั่วคราว — ผู้ช่วย AI ไม่พร้อมใช้งานขณะนี้)");
  return lines.join("\n");
}
