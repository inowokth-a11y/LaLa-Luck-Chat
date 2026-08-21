// Logic 17 v1 — โหมดความรักและเนื้อคู่ (CLAUDE.md §15 คิวเปิดงาน 10 ส.ค. 2569 ข้อ 1)
//
// ขอบเขต v1 (ผู้ใช้เคาะ 21 ส.ค. 2569): 4 หัวข้อที่มีข้อมูลจริง — นิสัยคู่สองชั้น (ข.2 + ดาวเจ้าเรือน)
// + เคมีธาตุ + ทิศเกื้อหนุน · อีก 5 หัวข้อรอเจ้าของตำรา (SOULMATE_SCOPE_NOTE บอกผู้ใช้ตรงๆ)
//
// ลำดับ: ล็อกอิน (guest ไม่ได้ — action มีต้นทุน AI/ภาพ) → โควตาฟรี 1 ครั้ง (bucket logic:17)
// → เครดิต 20 → engine ฿0 → AI-2 เรียบเรียง → **หักหลังสำเร็จเท่านั้น**
// โหมดภาพ: ไม่มีสิทธิ์ฟรี — 30 เครดิต/ชุด 3 รูป (FLUX) + ป้ายกำกับบังคับ
//
// ไม่มี Safety Gate ในเส้นนี้โดยเจตนา — ฟอร์มไม่รับ free-text เลย (คำถามต่อยอดไป /api/chat ซึ่งมี gate)

import { NextResponse } from "next/server";
import { THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import {
  soulmateReading,
  soulmateElementReading,
  soulmateImagePrompt,
  SOULMATE_IMAGE_DISCLAIMER,
  type PartnerGender,
} from "@/lib/engine/soulmate";
import { calculateAscendant, type ZodiacSign } from "@/lib/engine/ascendant";
import { julianDay } from "@/lib/engine/lagna";
import { provinceByKey } from "@/lib/provinces";
import { buildProfileContext } from "@/lib/chat/plan-run";
import { generate } from "@/lib/ai";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage, logicBucket } from "@/lib/chat/usage-db";
import { checkQuota, quotaExhaustedMessage } from "@/lib/chat/quota";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { isFalAvailable, falSoulmateImages } from "@/lib/image/fal";
import { logImageGeneration } from "@/lib/image/generation-log";
import { getMemoryBlock, rememberEvent } from "@/lib/memory";

export const runtime = "nodejs";
export const maxDuration = 120;

const SOULMATE_LOGIC_ID = 17;

const LALA_SOULMATE_SYSTEM = `${LALA_PERSONA}

บริบทหน้านี้: คำทำนายความรักและเนื้อคู่ — น้ำเสียงอบอุ่น โรแมนติกพองาม แต่ยึดผลคำนวณเคร่งครัด

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลคำนวณเนื้อคู่> — ห้ามแต่งลักษณะนิสัย ราศี ธาตุ หรือคะแนนขึ้นเอง
2. 🔴 ห้ามทำนายสิ่งที่ระบบไม่ได้คำนวณเด็ดขาด: รูปร่างหน้าตา · พื้นเพครอบครัว · ฐานะการเงิน ·
   อายุมาก/น้อยกว่า · ช่วงเวลา/อายุที่จะพบ — ถ้าผู้ใช้อยากรู้ ให้บอกตรงๆ ว่าหัวข้อเหล่านี้
   ยังไม่เปิดเพราะรอข้อมูลจากตำราต้นทาง
3. ห้ามฟันธง ห้ามการันตีว่าจะพบรัก ห้ามระบุตัวบุคคล
4. โครงคำตอบ: ① นิสัยคู่ชั้นราศี (จาก "ลักษณะนิสัยคู่") ② นิสัยชั้นลึกจากดาวเจ้าเรือน
   ③ เคมีธาตุคุณ↔เขา อธิบายคะแนนที่ระบบให้ ④ ทิศ/พลังงานที่เกื้อหนุน ⑤ ปิดด้วย caveat ทุกข้อ
   ที่ให้มา (ห้ามตัดทิ้ง) + ชวนถามต่อ 1 ประโยค
5. ถ้าโหมดเป็น "element" (ไม่มีเวลาเกิด) — บอกชัดตั้งแต่ย่อหน้าแรกว่านี่คือชั้นธาตุ ไม่ใช่ชั้นลัคนา
6. เพศของคู่: ใช้คำตามที่ผู้ใช้ระบุใน "เพศคู่ที่สนใจ" เท่านั้น — ถ้าเป็น "ไม่ระบุ" ใช้คำกลางๆ ("เขาคนนั้น")`;

const GENDER_TH: Record<PartnerGender, string> = { male: "ผู้ชาย", female: "ผู้หญิง", any: "ไม่ระบุ" };

interface SoulmateBody {
  mode?: "reading" | "images";
  birthDate?: string;
  birthTime?: string; // "HH:MM" — ไม่มี = fallback ชั้นธาตุ
  province?: string;
  partnerGender?: string;
}

/** คำนวณลัคนา (นิรายนะ — verify กับ Swiss Ephemeris แล้ว §5.2) จากวันเกิด+เวลา+จังหวัด */
function lagnaFrom(birthDate: string, birthTime: string, provinceKey: string): ZodiacSign | null {
  if (!/^\d{2}:\d{2}$/.test(birthTime)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = birthTime.split(":").map(Number);
  if (hh > 23 || mm > 59) return null;
  const p = provinceByKey(provinceKey);
  const jd = julianDay(Date.UTC(y, m - 1, d, hh, mm, 0) - 7 * 3600000); // เวลาไทย → UT
  return calculateAscendant(jd, p.lat, p.lon, "sidereal").sign;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SoulmateBody;
    const mode = body.mode === "images" ? "images" : "reading";

    // เพศคู่ที่สนใจ — ผู้ใช้ต้องเลือกเอง ห้ามเดา (กติกาในคิว §15)
    const partnerGender = body.partnerGender as PartnerGender | undefined;
    if (!partnerGender || !["male", "female", "any"].includes(partnerGender)) {
      return NextResponse.json({ error: "กรุณาเลือกเพศคู่ที่สนใจก่อนค่ะ (ระบบจะไม่เดาให้)" }, { status: 400 });
    }

    // ธาตุประจำตัวจากวันเกิด (กัน พ.ศ./ปีเสียใน buildProfileContext แล้ว)
    const profile = buildProfileContext(body.birthDate);
    if (!profile) {
      return NextResponse.json(
        { error: "กรุณากรอกวันเกิด (ค.ศ.) ให้ถูกต้องก่อนค่ะ เช่น 1990-03-15" },
        { status: 400 }
      );
    }

    // ---- gate ล็อกอิน (guest ไม่ได้ — แบบเดียวกับ oracle/dream) ----
    let userId: string | null = null;
    let isGuest = false;
    try {
      const supabase = await createSupabaseServer();
      const u = (await supabase.auth.getUser()).data.user;
      userId = u?.id ?? null;
      isGuest = Boolean(u?.is_anonymous);
    } catch (e) {
      console.warn("[soulmate] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนดูคำทำนายเนื้อคู่ค่ะ (ฟรีครั้งแรก จากนั้นใช้เครดิต)" },
        { status: 401 }
      );
    }
    if (isGuest) {
      return NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "คำทำนายเนื้อคู่เปิดให้บัญชีถาวรค่ะ 🐾 ผูกบัญชี (ฟรี ไม่กี่วินาที) แล้วรับสิทธิ์ฟรีครั้งแรกได้เลย — ข้อมูลเดิมไม่หาย" },
        { status: 401 }
      );
    }

    // ---- คำนวณ engine ฿0 (ใช้ร่วมทั้งสองโหมด) ----
    const lagna = body.birthTime && body.province ? lagnaFrom(body.birthDate!, body.birthTime, body.province) : null;
    const reading = lagna
      ? soulmateReading(lagna, profile.dominant, profile.missing)
      : soulmateElementReading(profile.dominant, profile.missing);
    // ธาตุของ "คู่" สำหรับโทนภาพ: ชั้นลัคนา = ธาตุราศีที่ 7 · ชั้นธาตุ = ธาตุอันดับ 1 ที่เกื้อหนุน
    const partnerElement: Element5 =
      reading.mode === "lagna" ? reading.partner.element : reading.rankedElements[0].element;

    // =======================================================================
    // โหมดภาพ — 30 เครดิต/ชุด 3 รูป ไม่มีสิทธิ์ฟรี (FLUX มีต้นทุนจริงทุกครั้ง)
    // =======================================================================
    if (mode === "images") {
      if (!isFalAvailable()) {
        return NextResponse.json({ error: "ระบบสร้างภาพยังไม่พร้อมใช้งานค่ะ" }, { status: 503 });
      }
      const cost = creditCost("soulmate_images");
      const balance = await getCreditBalance(userId);
      const charge = decideCharge({ freeRemaining: 0, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
      if (charge.mode === "denied") {
        return NextResponse.json(
          { quotaExceeded: true, message: chargeDeniedMessage(charge), credits: charge.balance, creditCost: charge.cost },
          { status: 429 }
        );
      }

      const prompt = soulmateImagePrompt({ gender: partnerGender, element: partnerElement });
      const images = await falSoulmateImages(prompt, 3);

      // หักหลังสำเร็จเท่านั้น
      let creditsLeft: number | null = null;
      if (charge.mode === "credits") {
        const spent = await spendCredits(userId, charge.cost, "soulmate_images", logicBucket(SOULMATE_LOGIC_ID));
        if (spent.ok) creditsLeft = spent.balance;
        else console.warn("[soulmate] หักเครดิตภาพไม่สำเร็จหลังสร้างแล้ว", spent.reason);
      }
      for (const img of images) {
        void logImageGeneration({
          authUid: userId,
          kind: "soulmate_image",
          imageUrl: img.url,
          stored: false,
          prompt,
          brandElement: partnerElement,
        });
      }
      return NextResponse.json({
        images: images.map((i) => i.url),
        disclaimer: SOULMATE_IMAGE_DISCLAIMER,
        ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
      });
    }

    // =======================================================================
    // โหมดคำทำนาย — ฟรีครั้งแรก (bucket logic:17) แล้ว 20 เครดิต
    // =======================================================================
    const bucket = logicBucket(SOULMATE_LOGIC_ID);
    const used = await getDbUsage(userId, bucket);
    const quota = checkQuota({ [String(SOULMATE_LOGIC_ID)]: used }, SOULMATE_LOGIC_ID);
    const cost = creditCost("soulmate");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: quota.remaining, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
    if (charge.mode === "denied") {
      return NextResponse.json(
        {
          quotaExceeded: true,
          message: `${quotaExhaustedMessage(SOULMATE_LOGIC_ID, cost)}\n\n${chargeDeniedMessage(charge)}`,
          credits: charge.balance,
          creditCost: charge.cost,
        },
        { status: 429 }
      );
    }

    const context = JSON.stringify(
      {
        โหมด: reading.mode === "lagna" ? "ลัคนา (มีเวลาเกิด)" : "element (ชั้นธาตุ — ไม่มีเวลาเกิด)",
        เพศคู่ที่สนใจ: GENDER_TH[partnerGender],
        ธาตุเด่นของผู้ใช้: THAI_LABEL_5[profile.dominant],
        ธาตุที่ผู้ใช้ขาด: profile.missing.map((m) => THAI_LABEL_5[m]),
        ...(reading.mode === "lagna"
          ? {
              ลัคนาราศี: reading.lagnaSign,
              ราศีคู่ครอง_ภพปัตนิ: reading.seventhSign,
              ลักษณะนิสัยคู่: reading.partner.traits,
              จุดแข็งของคู่: reading.partner.strengths,
              จุดที่ต้องเข้าใจกัน: reading.partner.weaknesses,
              ธาตุของคู่: THAI_LABEL_5[reading.partner.element],
              ดาวเจ้าเรือนของราศีคู่: reading.rulers,
              เคมีธาตุ: {
                คะแนน: reading.chemistry.score.final_score,
                ความสัมพันธ์: reading.chemistry.score.relation_th,
              },
              ทิศที่เกื้อหนุน: reading.chemistry.supportDirections,
            }
          : {
              อันดับธาตุคู่ที่เกื้อหนุน: reading.rankedElements,
              ทิศที่เกื้อหนุน: reading.supportDirections,
            }),
        คำเตือนที่ต้องแสดงครบ: reading.caveats,
      },
      null,
      1
    );

    const memory = await getMemoryBlock(userId);
    let reply: string;
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: SOULMATE_LOGIC_ID,
        channel: "web",
        userId,
        system: LALA_SOULMATE_SYSTEM,
        input: `${memory ? `${memory}\n\n` : ""}<ผลคำนวณเนื้อคู่>\n${context}\n</ผลคำนวณเนื้อคู่>\n\nเรียบเรียงคำทำนายเนื้อคู่ให้ผู้ใช้`,
        maxTokens: 1600,
      });
      reply = ai2.text;
    } catch (e) {
      console.warn("[soulmate] AI ล้มเหลว — ใช้ผลคำนวณล้วน", e);
      reply =
        (reading.mode === "lagna"
          ? `ลัคนา ${reading.lagnaSign} → ราศีคู่ครอง (ภพปัตนิ): ${reading.seventhSign}\n` +
            `ลักษณะนิสัยคู่: ${reading.partner.traits}\nจุดแข็ง: ${reading.partner.strengths}\n` +
            `เคมีธาตุ: ${reading.chemistry.score.relation_th} (${reading.chemistry.score.final_score})\n` +
            `ทิศเกื้อหนุน: ${reading.chemistry.supportDirections.join(", ")}`
          : `อันดับธาตุคู่ที่เกื้อหนุน: ${reading.rankedElements.map((r) => `${r.thai} ${r.score}`).join(" · ")}\n` +
            `ทิศเกื้อหนุน: ${reading.supportDirections.join(", ")}`) +
        `\n\n${reading.caveats.join("\n")}\n\n(ระบบเรียบเรียงอัตโนมัติชั่วคราว — ผู้ช่วย AI ไม่พร้อมใช้งานขณะนี้)`;
    }

    void rememberEvent(userId, "soulmate", {
      q: `เนื้อคู่ (${GENDER_TH[partnerGender]})`,
      a:
        reading.mode === "lagna"
          ? `ลัคนา ${reading.lagnaSign} → คู่ราศี ${reading.seventhSign} (${THAI_LABEL_5[reading.partner.element]}) เคมี ${reading.chemistry.score.final_score}`
          : `ชั้นธาตุ — คู่เกื้อหนุนอันดับ 1: ${reading.rankedElements[0].thai}`,
    });

    // หักหลังสำเร็จเท่านั้น
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "soulmate", bucket);
      if (spent.ok) creditsLeft = spent.balance;
      else console.warn("[soulmate] หักเครดิตไม่สำเร็จหลังตอบแล้ว", spent.reason);
    } else {
      await bumpDbUsage(userId, bucket);
    }

    return NextResponse.json({
      reply,
      reading,
      partnerElement,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
    });
  } catch (err) {
    console.error("[soulmate] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
