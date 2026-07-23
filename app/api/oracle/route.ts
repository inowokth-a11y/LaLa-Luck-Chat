// Logic 21 — เสี่ยงทายวงแหวนคู่ (ปรับตาม oracle_dual_ring.html ตามที่ผู้ใช้สั่ง 19 ก.ค. 2569)
//
// ⚠️ เปลี่ยนจากเดิม: เดิม API เป็นคนสุ่มการ์ดเอง (`Math.random()`) ตอนนี้
//    **ผู้ใช้หมุนวงแหวนเองที่หน้าจอ** แล้วส่งเลขการ์ด 2 ใบมาให้ตีความ
//    การสุ่มจึงอยู่ที่มือผู้ถาม ไม่ใช่ที่ server — นี่คือแก่นของพิธีกรรมเสี่ยงทาย
//
// ลำดับ (CLAUDE.md §6): Safety Gate → โควตา → คำนวณ deterministic → AI-2 เรียบเรียง

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safetyGate, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { computeCombinedReading, type BoundLayers } from "@/lib/engine/oracle";
import { createServiceClient } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";
import {
  parseQuota, serializeQuota, checkQuota, consumeQuota, quotaExhaustedMessage,
} from "@/lib/chat/quota";

export const runtime = "nodejs";

const QUOTA_COOKIE = "kruth_chat_quota";
const ORACLE_LOGIC_ID = 21;

const LALA_ORACLE_SYSTEM = `คุณคือ "อาจารย์ลาลา" ผู้ตีความคำเสี่ยงทายของ KRUTH ELEMENT พูดไทย น้ำเสียงขรึมแต่อบอุ่น

ผู้ใช้หมุนวงแหวนได้การ์ด 2 ใบ: ใบที่ 1 แทน "ตัวเขา" · ใบที่ 2 แทน "เรื่องที่เขาถาม"

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลการเสี่ยงทาย> — ห้ามแต่งการ์ด ธาตุ หรือคะแนนขึ้นเอง
2. ห้ามฟันธงชะตาแบบชี้ขาด ห้ามทำนายสุขภาพ/การเงิน/ความตาย
3. เชื่อมโยงการ์ดใบที่ 1 กับใบที่ 2 ว่าคุยกันอย่างไร แล้วจึงตอบคำถามที่เขาถาม
4. อธิบายความสัมพันธ์ของธาตุที่ระบบคำนวณมา ว่าหมายถึงอะไรกับคำถามของเขา
5. ความยาว 3-4 ย่อหน้าสั้น ๆ ปิดท้ายด้วยข้อคิด 1 ประโยค
6. คะแนนรวมเป็นเพียงตัวช่วยอ่านภาพรวม **ห้ามพูดเหมือนเป็นคำฟันธง**`;

interface CardRow {
  energy_id: string;
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
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

    // ---- 1b. โควตา ----
    const jar = await cookies();
    const quotaState = parseQuota(jar.get(QUOTA_COOKIE)?.value);
    const quota = checkQuota(quotaState, ORACLE_LOGIC_ID);
    if (!quota.allowed) {
      return NextResponse.json(
        { quotaExceeded: true, message: quotaExhaustedMessage(ORACLE_LOGIC_ID), remaining: 0, limit: quota.limit },
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
        .select("energy_id, energy_name, core_essence, archetype_figure")
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
      },
      null,
      1
    );

    let reply: string;
    let via = "template";
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: ORACLE_LOGIC_ID,
        channel: "web",
        system: LALA_ORACLE_SYSTEM,
        input: `<ผลการเสี่ยงทาย>\n${context}\n</ผลการเสี่ยงทาย>\n\nตีความให้ผู้ใช้`,
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

    const next = consumeQuota(quotaState, ORACLE_LOGIC_ID);
    const after = checkQuota(next, ORACLE_LOGIC_ID);

    const res = NextResponse.json({
      intercepted: false,
      reply,
      via,
      reading,
      cards: { [card1Id]: cards[card1Id], [card2Id]: cards[card2Id] },
      remaining: after.remaining,
      limit: after.limit,
    });
    res.cookies.set(QUOTA_COOKIE, serializeQuota(next), {
      httpOnly: true, sameSite: "lax", path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("[oracle] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
