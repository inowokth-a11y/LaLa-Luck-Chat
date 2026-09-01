// Logic 21 — เสี่ยงทายวงแหวนคู่ (ปรับตาม oracle_dual_ring.html ตามที่ผู้ใช้สั่ง 19 ก.ค. 2569)
//
// ⚠️ เปลี่ยนจากเดิม: เดิม API เป็นคนสุ่มการ์ดเอง (`Math.random()`) ตอนนี้
//    **ผู้ใช้หมุนวงแหวนเองที่หน้าจอ** แล้วส่งเลขการ์ด 2 ใบมาให้ตีความ
//    การสุ่มจึงอยู่ที่มือผู้ถาม ไม่ใช่ที่ server — นี่คือแก่นของพิธีกรรมเสี่ยงทาย
//
// ลำดับ (CLAUDE.md §6): Safety Gate → โควตา → คำนวณ deterministic → AI-2 เรียบเรียง

import { NextResponse } from "next/server";
import { safetyGate, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { computeCombinedReading, type BoundLayers } from "@/lib/engine/oracle";
import { createServiceClient } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";
import { checkQuota, quotaExhaustedMessage } from "@/lib/chat/quota";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage, logicBucket } from "@/lib/chat/usage-db";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { identityLens, identityLensSummaryTh, type IdentityLens } from "@/lib/engine/identity-lens";
import { FIGURE_TONE_PROMPT } from "@/lib/share";
import { getMemoryBlock, rememberEvent } from "@/lib/memory";

export const runtime = "nodejs";

const ORACLE_LOGIC_ID = 21;

const LALA_ORACLE_SYSTEM = `${LALA_PERSONA}

บริบทหน้านี้: พิธีเสี่ยงทาย — ให้น้ำเสียงขรึมขึ้นกว่าปกติเล็กน้อย (ยังอบอุ่น แต่มีความศักดิ์สิทธิ์ของพิธี)
ผู้ใช้หมุนวงแหวนได้การ์ด 2 ใบ: ใบที่ 1 แทน "ตัวเขา" · ใบที่ 2 แทน "เรื่องที่เขาถาม"

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลการเสี่ยงทาย> — ห้ามแต่งการ์ด ธาตุ หรือคะแนนขึ้นเอง
2. ห้ามฟันธงชะตาแบบชี้ขาด ห้ามทำนายสุขภาพ/การเงิน/ความตาย
3. เชื่อมโยงการ์ดใบที่ 1 กับใบที่ 2 ว่าคุยกันอย่างไร แล้วจึงตอบคำถามที่เขาถาม
4. อธิบายความสัมพันธ์ของธาตุที่ระบบคำนวณมา ว่าหมายถึงอะไรกับคำถามของเขา
5. ความยาว 3-4 ย่อหน้าสั้น ๆ ปิดท้ายด้วยข้อคิด 1 ประโยค
6. คะแนนรวมเป็นเพียงตัวช่วยอ่านภาพรวม **ห้ามพูดเหมือนเป็นคำฟันธง**

${FIGURE_TONE_PROMPT}
เพิ่มเติม: ถ้ามี "มุมเลขตัวตน_เลนส์ทางเลือก" — เสริมท้าย 1-2 ประโยคเชื่อมเลขตัวตน/การ์ดประจำตัว
ของผู้ถามกับการ์ดที่เปิดได้ (ใช้ข้อมูลที่ให้เท่านั้น) และบอกว่าเป็น "อีกมุมหนึ่ง" คู่กับธาตุกำเนิด
— ห้ามเฉลี่ยรวมสองมุม ห้ามบอกว่ามุมไหนถูกกว่า`;

interface CardRow {
  energy_id: string;
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
  figure_category: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      question?: string;
      card1Id?: string;
      card2Id?: string;
      dominant?: Element5;
      missing?: Element5[];
      dayOfWeek?: string;
      boundLayers?: BoundLayers;
    };

    const question = (body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "กรุณาตั้งคำถามก่อนเสี่ยงทาย" }, { status: 400 });

    const card1Id = String(body.card1Id ?? "");
    const card2Id = String(body.card2Id ?? "");
    if (!/^\d{2}$/.test(card1Id) || !/^\d{2}$/.test(card2Id)) {
      return NextResponse.json({ error: "ต้องหมุนวงแหวนให้ครบทั้ง 2 รอบก่อน" }, { status: 400 });
    }

    // ---- 1. SAFETY GATE (free-text) — ก่อน AI และ **ก่อนหักโควตา** เสมอ ----
    const gate = safetyGate(question);
    if (gate) {
      return NextResponse.json({
        intercepted: true,
        message: gate.crisis_resource_message,
        matched_keywords: gate.matched_keywords,
      });
    }

    // ---- 1b. gate ล็อกอิน + โควตา DB + เครดิต (ผู้ใช้ตัดสิน 30 ก.ค. 2569 — ปิดรูรั่ว
    //      โควตา cookie ที่ล้างแล้วได้ใหม่) · Safety Gate ต้องมาก่อนเสมอ ----
    let userId: string | null = null;
    let isGuest = false;
    let lens: IdentityLens | null = null;
    try {
      const supabase = await createSupabaseServer();
      const u = (await supabase.auth.getUser()).data.user;
      userId = u?.id ?? null;
      isGuest = Boolean(u?.is_anonymous);
      // เลนส์เลขตัวตน (มติ 1 ก.ย. 2569) — จากโปรไฟล์ชุดเดียวกับการ์ด /profile · พังไม่ล้มพิธี
      if (userId) {
        try {
          const { data: prof } = await supabase
            .from("user_profiles_e")
            .select("birth_date,birth_time,first_name,last_name")
            .eq("auth_uid", userId)
            .maybeSingle();
          if (prof?.birth_date) {
            lens = identityLens(prof.birth_date, {
              name: [prof.first_name, prof.last_name].filter(Boolean).join("") || null,
              birthTime: prof.birth_time ?? null,
              dominant: (body.dominant ?? "Earth") as Element5,
              missing: (body.missing ?? []) as Element5[],
            });
          }
        } catch {}
      }
    } catch (e) {
      console.warn("[oracle] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนเสี่ยงทาย (ฟรี " + checkQuota({}, ORACLE_LOGIC_ID).limit + " ครั้ง จากนั้นใช้เครดิต)" },
        { status: 401 }
      );
    }
    // ผู้เยี่ยมชม (anonymous) — เสี่ยงทายเป็นสิทธิ์ของบัญชีถาวร (กันฟาร์ม incognito — กติกา 1 ส.ค. 2569)
    if (isGuest) {
      return NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "เสี่ยงทายเปิดให้บัญชีถาวรค่ะ 🐾 ผูกบัญชี (ฟรี ไม่กี่วินาที) แล้วใช้สิทธิ์ทดลองฟรี 2 ครั้งได้เลย — ข้อมูลเดิมของคุณไม่หาย" },
        { status: 401 }
      );
    }

    const bucket = logicBucket(ORACLE_LOGIC_ID);
    const used = await getDbUsage(userId, bucket);
    const quota = checkQuota({ [String(ORACLE_LOGIC_ID)]: used }, ORACLE_LOGIC_ID);
    const cost = creditCost("oracle");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: quota.remaining, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
    if (charge.mode === "denied") {
      return NextResponse.json(
        {
          quotaExceeded: true,
          message: `${quotaExhaustedMessage(ORACLE_LOGIC_ID, cost)}\n\n${chargeDeniedMessage(charge)}`,
          remaining: 0,
          limit: quota.limit,
          credits: charge.balance,
          creditCost: charge.cost,
        },
        { status: 429 }
      );
    }

    // ---- 2. คำนวณ deterministic (ยังไม่แตะ AI) ----
    const dominant = (body.dominant ?? "Earth") as Element5;
    const missing = (body.missing ?? []) as Element5[];
    const reading = computeCombinedReading({
      card1Id,
      card2Id,
      dominant,
      missing,
      dayOfWeek: body.dayOfWeek ?? "",
      boundLayers: body.boundLayers ?? {},
    });

    const cards: Record<string, CardRow | null> = { [card1Id]: null, [card2Id]: null };
    try {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("master_energy_cards")
        .select("energy_id, energy_name, core_essence, archetype_figure, figure_category")
        .in("energy_id", [card1Id, card2Id]);
      for (const row of (data ?? []) as CardRow[]) cards[row.energy_id] = row;
    } catch (e) {
      console.warn("[oracle] ดึงข้อมูลการ์ดไม่สำเร็จ — ตีความจากธาตุอย่างเดียว", e);
    }

    // ---- 3. AI-2 เรียบเรียง ----
    const context = JSON.stringify(
      {
        คำถาม: question,
        การ์ดใบที่1_ตัวคุณ: { เลข: card1Id, ...(cards[card1Id] ?? {}) },
        การ์ดใบที่2_เรื่องที่ถาม: { เลข: card2Id, ...(cards[card2Id] ?? {}) },
        ธาตุเด่นของผู้ถาม: THAI_LABEL_5[dominant],
        ธาตุที่ขาด: missing.map((m) => THAI_LABEL_5[m]),
        องค์ประกอบคะแนน: reading.components,
        คะแนนรวม: reading.aggregate,
        สรุปภาพรวม: reading.label,
        ...(lens ? { มุมเลขตัวตน_เลนส์ทางเลือก: { สรุป: identityLensSummaryTh(lens), caveat: lens.caveats } } : {}),
      },
      null,
      1
    );

    // ความจำแม่หมอ (เฟส 3) — best-effort
    const memory = await getMemoryBlock(userId);

    let reply: string;
    let via = "template";
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: ORACLE_LOGIC_ID,
        channel: "web",
        userId,
        system: LALA_ORACLE_SYSTEM,
        input: `${memory ? `${memory}\n\n` : ""}<ผลการเสี่ยงทาย>\n${context}\n</ผลการเสี่ยงทาย>\n\nตีความให้ผู้ใช้`,
        maxTokens: 1500,
      });
      reply = ai2.text;
      via = `${ai2.provider}/${ai2.model}${ai2.usedFallback ? " (สำรอง)" : ""}`;
    } catch (e) {
      console.warn("[oracle] AI-2 ล้มเหลว — ใช้ผลคำนวณล้วน", e);
      reply =
        `การ์ดใบที่ 1 (ตัวคุณ): ${card1Id} ${cards[card1Id]?.energy_name ?? ""}\n` +
        `การ์ดใบที่ 2 (เรื่องที่ถาม): ${card2Id} ${cards[card2Id]?.energy_name ?? ""}\n\n` +
        reading.components.map((c) => `• ${c.component}: ${c.detail}`).join("\n") +
        `\n\nภาพรวม ${reading.aggregate}/100 — ${reading.label}` +
        `\n\n(ระบบเรียบเรียงอัตโนมัติชั่วคราว — ผู้ช่วย AI ไม่พร้อมใช้งานขณะนี้)`;
    }

    // จำการเสี่ยงทายนี้ (fire-and-forget) — ข้อเท็จจริงจาก engine
    void rememberEvent(userId, "oracle", {
      q: question,
      a: `การ์ด ${card1Id}(${cards[card1Id]?.energy_name ?? "?"}) + ${card2Id}(${cards[card2Id]?.energy_name ?? "?"}) · คะแนน ${reading.aggregate}/100`,
    });

    // หักเมื่อตอบสำเร็จเท่านั้น — เส้นฟรี bump DB (atomic) · เส้นเครดิต spend_credits
    let afterUsed = used;
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "oracle", bucket);
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[oracle] หักเครดิตไม่สำเร็จหลังตอบแล้ว (race/พัง)", spent.reason);
    } else {
      const bumped = await bumpDbUsage(userId, bucket);
      afterUsed = bumped ?? used + 1;
    }
    const after = checkQuota({ [String(ORACLE_LOGIC_ID)]: afterUsed }, ORACLE_LOGIC_ID);

    return NextResponse.json({
      intercepted: false,
      reply,
      via,
      reading,
      cards: { [card1Id]: cards[card1Id], [card2Id]: cards[card2Id] },
      remaining: after.remaining,
      limit: after.limit,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
    });
  } catch (err) {
    console.error("[oracle] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
