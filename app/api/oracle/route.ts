// Logic 21 — เสี่ยงทายผูกบริบท (สุ่มการ์ด → ธาตุ → เทียบ Wu Xing กับเลเยอร์ → AI-2 เรียบเรียง)
//
// ลำดับ (CLAUDE.md §6): Safety Gate → คำนวณ deterministic → AI-2 เรียบเรียง
// การ์ด 00-99 เป็น archetype เท่านั้น ธาตุมาจากเลขหลักหน่วย (§4.3 + Calculation Manual §5.4)

import { NextResponse } from "next/server";
import { safetyGate, wuXingScore, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { artifactElement } from "@/lib/engine/numerology";
import { createServiceClient } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";

export const runtime = "nodejs";

/** เลเยอร์บริบทที่ผูกคำถามได้ (ตาม oracle_dual_ring.html) */
const LAYERS = ["self", "place", "vehicle", "organization", "other_person"] as const;
type Layer = (typeof LAYERS)[number];

const LAYER_LABEL: Record<Layer, string> = {
  self: "ตัวคุณเอง",
  place: "สถานที่",
  vehicle: "ยานพาหนะ",
  organization: "องค์กร/กิจการ",
  other_person: "บุคคลอื่น",
};

const LALA_ORACLE_SYSTEM = `คุณคือ "อาจารย์ลาลา" ผู้ตีความคำเสี่ยงทายของ KRUTH ELEMENT พูดไทย น้ำเสียงขรึมแต่อบอุ่น

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลการเสี่ยงทาย> — ห้ามแต่งการ์ด ธาตุ หรือคะแนนขึ้นเอง
2. ห้ามฟันธงชะตาแบบชี้ขาด ห้ามทำนายสุขภาพ/การเงิน/ความตาย
3. ตีความ "ความสัมพันธ์ของธาตุ" ที่ระบบคำนวณมา ว่ามันหมายถึงอะไรกับคำถามของผู้ใช้
4. ถ้ามี Productive Clash ให้อธิบายว่าธาตุที่ขาดกลายเป็นยาได้อย่างไร
5. ความยาว 3-4 ย่อหน้าสั้น ๆ ปิดท้ายด้วยข้อคิด 1 ประโยค`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      question?: string;
      layer?: Layer;
      layerElement?: Element5 | null;
      missingElements?: Element5[];
    };

    const question = (body.question ?? "").trim();
    if (!question) return NextResponse.json({ error: "กรุณาตั้งคำถามก่อนเสี่ยงทาย" }, { status: 400 });

    // ---- 1. SAFETY GATE (free-text) — ก่อน AI เสมอ ----
    const gate = safetyGate(question);
    if (gate) {
      return NextResponse.json({
        intercepted: true,
        message: gate.crisis_resource_message,
        matched_keywords: gate.matched_keywords,
      });
    }

    const layer: Layer = LAYERS.includes(body.layer as Layer) ? (body.layer as Layer) : "self";

    // ---- 2. สุ่มการ์ด + คำนวณ deterministic ----
    const drawn = Math.floor(Math.random() * 100);
    const cardId = String(drawn).padStart(2, "0");
    // ธาตุจากเลขการ์ด (ตาราง §5.4) — ไม่ใช่จาก archetype
    const oracleElement = artifactElement(drawn) as Element5;

    // เทียบกับธาตุของเลเยอร์ที่ผูกไว้ (ถ้าผู้ใช้ระบุ)
    const layerElement = body.layerElement ?? null;
    const relation = layerElement
      ? wuXingScore(layerElement, oracleElement, body.missingElements ?? [])
      : null;

    // ---- 3. ดึงเนื้อการ์ดจาก Supabase ----
    let card: { energy_name: string; core_essence: string | null; archetype_figure: string | null } | null = null;
    try {
      const sb = createServiceClient();
      const { data } = await sb
        .from("master_energy_cards")
        .select("energy_name, core_essence, archetype_figure")
        .eq("energy_id", cardId)
        .single();
      card = data;
    } catch (e) {
      console.warn("[oracle] ดึงการ์ดจาก DB ไม่ได้", e);
    }

    // ---- 4. AI-2 เรียบเรียง ----
    const context = JSON.stringify(
      {
        คำถาม: question,
        เลเยอร์ที่ผูก: LAYER_LABEL[layer],
        การ์ดที่ได้: { เลข: cardId, ชื่อ: card?.energy_name, แก่น: card?.core_essence, บุคคลต้นแบบ: card?.archetype_figure },
        ธาตุของคำเสี่ยงทาย: THAI_LABEL_5[oracleElement],
        ธาตุของเลเยอร์: layerElement ? THAI_LABEL_5[layerElement] : null,
        ความสัมพันธ์ธาตุ: relation
          ? { คำอธิบาย: relation.relation_th, คะแนน: relation.final_score, productive_clash: relation.productive_clash }
          : null,
      },
      null,
      1
    );

    let reply: string;
    let via = "template";
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: 21,
        channel: "web",
        system: LALA_ORACLE_SYSTEM,
        input: `<ผลการเสี่ยงทาย>\n${context}\n</ผลการเสี่ยงทาย>\n\nตีความให้ผู้ใช้`,
        maxTokens: 2048,
      });
      reply = ai2.text;
      via = `${ai2.provider}/${ai2.model}${ai2.usedFallback ? " (สำรอง)" : ""}`;
    } catch (e) {
      console.warn("[oracle] AI-2 ล้มเหลว — ใช้ template", e);
      reply = [
        `การ์ดที่ได้: ${cardId} ${card?.energy_name ?? ""}`,
        card?.core_essence ?? "",
        `ธาตุของคำเสี่ยงทาย: ${THAI_LABEL_5[oracleElement]}`,
        relation ? `ความสัมพันธ์กับ${LAYER_LABEL[layer]}: ${relation.relation_th} (คะแนน ${relation.final_score})` : "",
        "",
        "(ระบบเรียบเรียงอัตโนมัติชั่วคราว — ผู้ช่วย AI ไม่พร้อมใช้งานขณะนี้)",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return NextResponse.json({
      intercepted: false,
      reply,
      via,
      draw: {
        cardId,
        energy_name: card?.energy_name ?? null,
        core_essence: card?.core_essence ?? null,
        archetype_figure: card?.archetype_figure ?? null,
        oracleElement,
        oracleElementTh: THAI_LABEL_5[oracleElement],
        layer,
        layerLabel: LAYER_LABEL[layer],
        relation,
      },
    });
  } catch (err) {
    console.error("[oracle] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
