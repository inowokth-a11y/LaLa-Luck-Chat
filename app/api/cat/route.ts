// /api/cat — ดูดวงแมว: อาจารย์ลาลาเรียบเรียงจากผล engine ตำราแมว (เฟส 1 · 6 ก.ย. 2569)
//
// ลำดับ: ล็อกอิน (guest ไม่ได้ — action มีต้นทุน AI) → ฟรี 1 ครั้ง (bucket logic:22) → 20 เครดิต
// → engine ฿0 (คำนวณฝั่ง server ใหม่จาก input ดิบ — ไม่เชื่อผลที่ client ส่งมา) → ai2 → หักหลังสำเร็จ
// ไม่มี Safety Gate โดยเจตนา — ฟอร์มเป็น preset enum + ชื่อแมว (ไม่ใช่ free-text ปรึกษา)
// 🔴 กติกาการเล่า: เฉพาะด้านมงคล ห้ามคำตัดสินร้าย/สุขภาพสัตว์ (ผู้ใช้ตัดสิน 6 ก.ย. 2569)

import { NextResponse } from "next/server";
import { calculateElementSeed, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import { catReading, CAT_EYES, CAT_MARKS, CAT_COATS } from "@/lib/engine/cat-tamra";
import { generate } from "@/lib/ai";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsage, bumpDbUsage, logicBucket } from "@/lib/chat/usage-db";
import { checkQuota, quotaExhaustedMessage } from "@/lib/chat/quota";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

/** ไม่ใช่ Logic ในสเปก 21 โมดูล — ใช้ id 22 สำหรับ bucket/feedback/quota เท่านั้น */
export const CAT_LOGIC_ID = 22;

const LALA_CAT_SYSTEM = `${LALA_PERSONA}

บริบทหน้านี้: "ดูดวงแมว" — ผู้ใช้เลือกลักษณะแมวของตัวเอง ระบบเทียบกับตำราแมวศุภลักษณ์ (สมุดข่อยโบราณ)
และคำนวณธาตุจากสีขน + ความเข้ากันกับดวงเจ้าของมาให้แล้ว (แม่หมอเป็นแมวกวัก — เล่าด้วยความเอ็นดูแมวได้เต็มที่)

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลดูดวงแมว> — ห้ามแต่งชนิดแมว คุณ ธาตุ หรือคะแนนเพิ่มเอง
2. 🔴 เล่าเฉพาะด้านมงคล: ห้ามบอกว่าแมวตัวใด "ไม่ดี/ให้โทษ/อัปมงคล" — แมวที่ไม่ตรงชนิดในตำรา
   ให้เล่าว่า "เป็นแมวทั่วไปที่ตำราไม่ได้ระบุลักษณะไว้ แต่ก็ไม่ได้ว่าไม่ดี" แล้วอ่านผ่านชั้นธาตุแทน
3. ห้ามคำแนะนำเรื่องสุขภาพ อาหาร หรือการรักษาสัตว์ (เรื่องสัตวแพทย์ห้ามแตะ) · ห้ามชวนทิ้ง/เปลี่ยนแมว
4. เคมีธาตุ: ตัวเลขตามที่ให้ (สเกล −2..+2 ห้ามแปลงสเกล) · Productive Clash ใช้เฉพาะเมื่อข้อมูลระบุคำนี้ —
   มีจริงต้องชูเป็นจุดเด่น · เคมีลบ = เล่านุ่มนวลพร้อมสีของใช้ธาตุสะพานที่ให้มา ไม่ใช่ลางร้าย
5. โครง: ① ทักทาย+ประกาศชนิดตำรา (หรือแมวทั่วไป) + ลักษณะที่ตรง ② คุณตามตำรา ③ ธาตุแมวและเคมีกับ
   เจ้าของ (ถ้ามี) + สีของใช้แมว ④ (ถ้ามี) ชื่อแมวกับธาตุ ⑤ ปิดด้วย caveat ที่ให้มาแบบย่อ + ชวนถามต่อ
6. ความยาว 3-5 ย่อหน้าสั้น น้ำเสียงอบอุ่นขี้เล่นแบบทาสแมว แต่ยึดผลคำนวณเคร่งครัด`;

interface CatBody {
  coat?: string;
  mark?: string;
  eye?: string;
  catName?: string;
  ownerBirthDate?: string;
}

const ZODIAC_ANIMALS = ["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];

function ownerSeed(birthDate?: string): { dominant: Element5; missing: Element5[] } | null {
  const m = birthDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate) : null;
  if (!m) return null;
  const year = Number(m[1]);
  if (year > 2400 || year < 1900) return null;
  const seed = calculateElementSeed({
    day_of_week: thaiDayOfWeek(birthDate!),
    birth_month: Number(m[2]),
    birth_year_ad: year,
    birth_day: Number(m[3]),
    zodiac_year_animal: ZODIAC_ANIMALS[(((year - 2020) % 12) + 12) % 12],
  });
  return { dominant: seed.dominant as Element5, missing: seed.missing as Element5[] };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as CatBody;
    if (!body.coat || !(body.coat in CAT_COATS)) {
      return NextResponse.json({ error: "กรุณาเลือกสีขนของแมวก่อนค่ะ" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return NextResponse.json(
        { error: "เข้าสู่ระบบก่อนให้แม่หมอเล่าดวงแมวนะคะ (ฟรีครั้งแรก)", needsLogin: true },
        { status: 401 }
      );
    }
    if (user.is_anonymous) {
      return NextResponse.json(
        { error: "ผูกบัญชีถาวรก่อนใช้ส่วนนี้นะคะ (ข้อมูลจะได้ไม่หาย)", needsUpgrade: true },
        { status: 401 }
      );
    }
    const userId = user.id;

    const bucket = logicBucket(CAT_LOGIC_ID);
    const used = await getDbUsage(userId, bucket);
    const quota = checkQuota({ [String(CAT_LOGIC_ID)]: used }, CAT_LOGIC_ID);
    const cost = creditCost("cat_reading");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: quota.remaining, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
    if (charge.mode === "denied") {
      return NextResponse.json(
        { quotaExceeded: true, message: `${quotaExhaustedMessage(CAT_LOGIC_ID, cost)}\n\n${chargeDeniedMessage(charge)}`, credits: charge.balance, creditCost: charge.cost },
        { status: 429 }
      );
    }

    // engine ฿0 — คำนวณใหม่จาก input ดิบเสมอ
    const owner = ownerSeed(body.ownerBirthDate);
    const reading = catReading({
      coat: body.coat,
      mark: body.mark && body.mark in CAT_MARKS ? body.mark : null,
      eye: body.eye && body.eye in CAT_EYES ? body.eye : null,
      catName: body.catName?.slice(0, 40) ?? null,
      owner,
    });

    const ctx = JSON.stringify(
      {
        ชนิดตามตำรา: reading.titleTh,
        อยู่ในสมุดข่อย17ชนิด: reading.inTamra,
        ลักษณะ: reading.traitsTh,
        คุณตามตำรา: reading.boonTh,
        โน้ตเรื่องตา: reading.match.eyeNoteTh,
        ธาตุแมว: reading.element ? `${reading.element.elementTh} (จากสีขน${reading.element.colorTh})` : "ระบุธาตุเดียวไม่ได้ (หลายสี)",
        เจ้าของ: owner ? { ธาตุเด่น: THAI_LABEL_5[owner.dominant], ธาตุที่ขาด: owner.missing.map((m) => THAI_LABEL_5[m]) } : null,
        เคมีแมวกับเจ้าของ: reading.chemistry
          ? { คะแนน: reading.chemistry.final_score, ความสัมพันธ์: reading.chemistry.relation_th }
          : null,
        สีของใช้แมว: reading.colorTipTh,
        ชื่อแมว: reading.nameLayer
          ? { ชื่อ: body.catName, ธาตุจากชื่อ: reading.nameLayer.elementTh, เข้ากับเจ้าของ: reading.nameLayer.fit.relation_th, คะแนน: reading.nameLayer.fit.final_score }
          : null,
        caveats: reading.caveats,
      },
      null,
      1
    );

    let reply: string;
    try {
      const ai2 = await generate({
        role: "ai2",
        logicId: CAT_LOGIC_ID,
        channel: "web",
        userId,
        system: LALA_CAT_SYSTEM,
        input: `<ผลดูดวงแมว>\n${ctx}\n</ผลดูดวงแมว>\n\nเล่าดวงแมวให้เจ้าของฟัง`,
        maxTokens: 1200,
      });
      reply = ai2.text;
    } catch {
      return NextResponse.json({ error: "แม่หมอเรียบเรียงไม่สำเร็จชั่วคราว ลองอีกครั้งนะคะ" }, { status: 503 });
    }

    // หักหลังสำเร็จเท่านั้น
    let paid = false;
    if (charge.mode === "free") {
      await bumpDbUsage(userId, bucket);
    } else if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "cat_reading", reading.titleTh);
      paid = spent.ok;
    }

    return NextResponse.json({ ok: true, reply, reading, paid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
