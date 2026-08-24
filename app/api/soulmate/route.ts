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
  soulmateCollagePrompt,
  soulmateImageCaptions,
  partnerMatchReading,
  SOULMATE_IMAGE_DISCLAIMER,
  type PartnerGender,
} from "@/lib/engine/soulmate";
import { randomUUID } from "node:crypto";
import {
  ensureSoulmateBucket,
  storeSoulmateImage,
  soulmateSignedUrl,
  newShareToken,
} from "@/lib/soulmate/store";
import { calculateAscendant, type ZodiacSign } from "@/lib/engine/ascendant";
import { julianDay } from "@/lib/engine/lagna";
import { soulmateJyotish, soulmateConvergence, overlapWindows, type SoulmateJyotish, type ConvergenceResult } from "@/lib/engine/jyotish";
import { provinceByKey } from "@/lib/provinces";
import { buildProfileContext } from "@/lib/chat/plan-run";
import { generate } from "@/lib/ai";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
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
2. 🔴 ห้ามทำนาย "อายุของคู่" เด็ดขาด (บอกได้เพียงวุฒิภาวะจากข้อมูลดาวที่ให้) · "พื้นเพ/ฐานะ/
   การงานฝั่งคู่" พูดได้**เฉพาะ**จากข้อมูล "แนวโน้มฝั่งคู่_BhavatBhavam" เป็นแนวโน้มกว้างๆ
   ห้ามระบุตัวเลขทรัพย์สิน/อาชีพเจาะจง/ชื่อสถานที่ ·
   ส่วน "รูปลักษณ์" พูดได้**เฉพาะ**จากข้อมูล "แนวโน้มรูปลักษณ์ตามนรลักษณ์" ที่ให้มา
   (ตาราง ค.1) และต้องเรียกว่า "แนวโน้ม" ห้ามฟันธง · "บริบทที่มักพบคู่" และ
   "จังหวะเวลาเรื่องคู่" พูดได้**เฉพาะ**เมื่อมีข้อมูล "ชั้นJyotishสากล_ชั้นเสริม" และต้อง
   บอกว่ามาจากชั้นเสริมสากล (ไม่ใช่ตำราหลัก) — จังหวะเวลา = "ช่วงที่เรื่องคู่มีน้ำหนัก"
   ห้ามพูดเป็นคำการันตีว่าจะพบคู่
3. ห้ามฟันธง ห้ามการันตีว่าจะพบรัก ห้ามระบุตัวบุคคล
4. โครงคำตอบ: ① นิสัยคู่ชั้นราศี (จาก "ลักษณะนิสัยคู่") ② นิสัยชั้นลึกจากดาวเจ้าเรือน
   ③ เคมีธาตุคุณ↔เขา อธิบายคะแนนที่ระบบให้ ③.3 ถ้ามี "ชั้นJyotishสากล_ชั้นเสริม" — เพิ่มหัวข้อ
   "มุมมองจากดวงดาว (ชั้นเสริมสากล)": บริบทที่มักพบคู่ (เจ้าเรือน 7) · ลักษณะเพิ่มจากดาวในภพ 7 ·
   ภาพตัวแทนคู่จาก Darakaraka · ความยั่งยืนจาก Upapada/D9 · ปิดด้วยจังหวะเวลาเรื่องคู่
   (ระบุช่วง พ.ศ. ตามข้อมูล ห้ามแต่งเพิ่ม ห้ามการันตี) ③.5 ถ้ามี "ธาตุจากชื่อผู้ใช้_ชั้นเสริม" — เพิ่มหัวข้อสั้น
   "พลังจากชื่อของคุณ" เล่าจากการ์ด/เลขศาสตร์/ความเข้ากันที่ให้**เท่านั้น** · ถ้ามี "เนื้อคู่มุมธาตุชื่อ"
   ให้เล่าต่อว่ามุมธาตุชื่อชี้ไปที่คู่แบบไหน (นิสัยแนวโน้ม/แนวโน้มรูปลักษณ์ ค.1/สไตล์การแต่งกาย
   ตามข้อมูลที่ให้เท่านั้น เรียกว่า "แนวโน้ม" เสมอ) และบอกชัดว่าทั้งหมดเป็นชั้นเสริม
   ประกอบ (แกนหลักคือลัคนา/ภพปัตนิ) ห้ามให้ชั้นชื่อขัดหรือแทนคำทำนายชั้นลัคนา
   ④ ทิศ/พลังงานที่เกื้อหนุน ⑤ ปิดด้วย caveat ทุกข้อที่ให้มา (ห้ามตัดทิ้ง) + ชวนถามต่อ 1 ประโยค
5. ถ้าโหมดเป็น "element" (ไม่มีเวลาเกิด) — บอกชัดตั้งแต่ย่อหน้าแรกว่านี่คือชั้นธาตุ ไม่ใช่ชั้นลัคนา
6. เพศของคู่: ใช้คำตามที่ผู้ใช้ระบุใน "เพศคู่ที่สนใจ" เท่านั้น — ถ้าเป็น "ไม่ระบุ" ใช้คำกลางๆ ("เขาคนนั้น")`;

const GENDER_TH: Record<PartnerGender, string> = { male: "ผู้ชาย", female: "ผู้หญิง", any: "ไม่ระบุ" };

// โหมดเช็คกับคนที่สนใจ (23 ส.ค. 2569) — narrator เข้มเรื่องบุคคลที่สาม
const LALA_MATCH_SYSTEM = `${LALA_PERSONA}

บริบทหน้านี้: "เช็คความเข้ากันกับคนที่ผู้ใช้สนใจ" — ระบบคำนวณเคมีธาตุ ความสอดคล้อง 5 ด้าน และภพปัตนิมาให้แล้ว

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลเช็คความเข้ากัน> — ห้ามแต่งเลข ธาตุ ราศี หรือคะแนนเพิ่มเอง
2. 🔴 อีกฝ่ายเป็นบุคคลที่สาม: พูดเชิง "พลังงานเข้ากันแบบไหน" เท่านั้น — ห้ามตัดสินนิสัยเขา
   ห้ามทำนายชะตาของเขา และห้ามฟันธงว่าความสัมพันธ์นี้จะสำเร็จ/ล้มเหลว
3. คะแนนอ้างเป็นตัวเลข x/10 หรือ +/− ตามข้อมูลเสมอ · ใช้คำว่า "Productive Clash" เฉพาะเมื่อ
   ข้อมูลระบุคำนี้ไว้จริงเท่านั้น (ห้ามตีความความหมายอื่นมาสวมคำนี้) — เมื่อมีจริงต้องชูเป็นจุดเด่น
4. ภพปัตนิ: ตรง = อธิบายว่าตามตำราถือเป็นสัญญาณเกื้อหนุน (ราศีเขาอยู่ในเรือนคู่ครองของคุณ) ·
   ไม่ตรง = บอกชัดว่าไม่ใช่ลางร้าย เป็นเพียงชั้นหนึ่งจากหลายชั้น
4.5 ถ้ามี "จังหวะเวลาสองฝ่าย_ชั้นJyotishเสริม" — เล่าเป็นหัวข้อสั้น "จังหวะเวลาของทั้งคู่"
   ใช้ช่วง พ.ศ. ตามข้อมูลเท่านั้น · ช่วงทับซ้อน = "จังหวะที่เรื่องคู่มีน้ำหนักทั้งสองฝ่าย"
   ห้ามการันตีว่าจะคบกัน/แต่งงาน · เป็นชั้นเสริมสากล ไม่ใช่ตำราหลัก
5. โครง: ① พลังงานของสองฝ่าย ② เคมีธาตุ ②.5 ถ้ามี "ธาตุจากชื่อเขา" — เพิ่มหัวข้อสั้น "พลังจากชื่อ"
   เล่าจากการ์ด/เลขศาสตร์/ความเข้ากันที่ให้**เท่านั้น** ในเชิงพลังงาน (ห้ามตัดสินนิสัยเขาจากชื่อ)
   และบอกชัดว่าเป็นชั้นเสริมประกอบ ③ ด้านที่หนุนกัน/ด้านที่ต้องช่วยกันดูแล ④ ทางปฏิบัติ
   ⑤ ปิดด้วย caveat ที่ให้มาครบ + ชวนถามต่อ 1 ประโยค
6. ความยาว 4-5 ย่อหน้าสั้น`;

interface SoulmateBody {
  mode?: "reading" | "images" | "match";
  birthDate?: string;
  birthTime?: string; // "HH:MM" — ไม่มี = fallback ชั้นธาตุ
  province?: string;
  partnerGender?: string;
  // โหมด match — ข้อมูลอีกฝ่าย (ใช้คำนวณชั่วขณะ **ไม่จัดเก็บ** — PARTNER_PRIVACY_NOTE)
  partnerBirthDate?: string;
  partnerBirthTime?: string;
  partnerProvince?: string;
  partnerName?: string;
  /** ชื่อ-นามสกุลของผู้ใช้เอง (ไม่บังคับ) — ชั้นเสริมธาตุจากชื่อ · คำนวณชั่วขณะ ไม่จัดเก็บเพิ่ม */
  name?: string;
  /** เพศผู้ใช้ (ไม่บังคับ — "female" เพิ่มพฤหัสเป็น karaka ตามธรรมเนียม Strī Jātaka ของชั้น Jyotish) */
  userGender?: string;
  // ตัวเลือกรูปลักษณ์ของภาพ (preset key เท่านั้น — engine เพิกเฉยค่านอก enum · ไม่ใช่คำทำนาย)
  look?: string;
  face?: string;
  age?: string;
}

/** คำนวณลัคนา (นิรายนะ — verify กับ Swiss Ephemeris แล้ว §5.2) จากวันเกิด+เวลา+จังหวัด */
function birthChartFrom(
  birthDate: string,
  birthTime: string,
  provinceKey: string
): { sign: ZodiacSign; jd: number; birthUtcMs: number } | null {
  if (!/^\d{2}:\d{2}$/.test(birthTime)) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = birthTime.split(":").map(Number);
  if (hh > 23 || mm > 59) return null;
  const p = provinceByKey(provinceKey);
  const birthUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0) - 7 * 3600000; // เวลาไทย → UT
  const jd = julianDay(birthUtcMs);
  return { sign: calculateAscendant(jd, p.lat, p.lon, "sidereal").sign, jd, birthUtcMs };
}

function lagnaFrom(birthDate: string, birthTime: string, provinceKey: string): ZodiacSign | null {
  return birthChartFrom(birthDate, birthTime, provinceKey)?.sign ?? null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SoulmateBody;
    const mode = body.mode === "images" ? "images" : body.mode === "match" ? "match" : "reading";

    // เพศคู่ที่สนใจ — ผู้ใช้ต้องเลือกเอง ห้ามเดา (กติกาในคิว §15) · โหมด match ไม่ใช้เพศ
    const partnerGender = (body.partnerGender ?? "any") as PartnerGender;
    if (mode !== "match" && (!body.partnerGender || !["male", "female", "any"].includes(body.partnerGender))) {
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
    const birthChart = body.birthTime && body.province ? birthChartFrom(body.birthDate!, body.birthTime, body.province) : null;
    const lagna = birthChart?.sign ?? null;
    // ชั้น Jyotish สากล (ชั้นเสริม ฿0) — ต้องมีเวลาเกิด · พังห้ามล้มคำทำนายหลัก
    let jyotish: SoulmateJyotish | null = null;
    if (birthChart) {
      try {
        jyotish = soulmateJyotish(birthChart.jd, birthChart.birthUtcMs, birthChart.sign, Date.now(), body.userGender ?? null);
      } catch (e) {
        console.warn("[soulmate] ชั้น Jyotish คำนวณไม่สำเร็จ — ข้าม (คำทำนายหลักไม่กระทบ)", e);
      }
    }
    const ownName = typeof body.name === "string" ? body.name.trim().slice(0, 100) : null;
    const reading = lagna
      ? soulmateReading(lagna, profile.dominant, profile.missing, ownName)
      : soulmateElementReading(profile.dominant, profile.missing, ownName);
    // กลไก 3: ตัวชี้ความสอดคล้องระหว่างศาสตร์ (เฉพาะโหมดลัคนาที่มีชั้น Jyotish)
    const convergence: ConvergenceResult | null =
      jyotish && reading.mode === "lagna" ? soulmateConvergence(reading.chemistry.score.final_score, jyotish) : null;
    // ธาตุของ "คู่" สำหรับโทนภาพ: ชั้นลัคนา = ธาตุราศีที่ 7 · ชั้นธาตุ = ธาตุอันดับ 1 ที่เกื้อหนุน
    const partnerElement: Element5 =
      reading.mode === "lagna" ? reading.partner.element : reading.rankedElements[0].element;

    // =======================================================================
    // โหมดเช็คกับคนที่สนใจ — สิทธิ์/เรทเดียวกับคำทำนาย (ฟรีครั้งแรกร่วม bucket · แล้ว 20 เครดิต)
    // 🔴 ข้อมูลอีกฝ่ายใช้คำนวณชั่วขณะ **ไม่จัดเก็บ** (ไม่ลง DB/ความจำ — PARTNER_PRIVACY_NOTE)
    // =======================================================================
    if (mode === "match") {
      if (!body.partnerBirthDate) {
        return NextResponse.json({ error: "กรุณากรอกวันเกิดของอีกฝ่ายก่อนค่ะ" }, { status: 400 });
      }
      const bucket = logicBucket(SOULMATE_LOGIC_ID);
      const used = await getDbUsage(userId, bucket);
      const quota = checkQuota({ [String(SOULMATE_LOGIC_ID)]: used }, SOULMATE_LOGIC_ID);
      const cost = creditCost("soulmate");
      const balance = await getCreditBalance(userId);
      const charge = decideCharge({ freeRemaining: quota.remaining, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
      if (charge.mode === "denied") {
        return NextResponse.json(
          { quotaExceeded: true, message: `${quotaExhaustedMessage(SOULMATE_LOGIC_ID, cost)}\n\n${chargeDeniedMessage(charge)}`, credits: charge.balance, creditCost: charge.cost },
          { status: 429 }
        );
      }

      const partnerChart =
        body.partnerBirthTime && body.partnerProvince
          ? birthChartFrom(body.partnerBirthDate, body.partnerBirthTime, body.partnerProvince)
          : null;
      const partnerLagna = partnerChart?.sign ?? null;
      // ชั้น Jyotish สองฝ่าย (ชั่วขณะ ไม่จัดเก็บ): จังหวะเรื่องคู่ของแต่ละฝ่าย + ช่วงทับซ้อน
      let matchTiming: {
        userWindows: { fromTh: string; toTh: string }[];
        partnerWindows: { fromTh: string; toTh: string }[];
        overlaps: { fromTh: string; toTh: string }[];
      } | null = null;
      if (jyotish && partnerChart) {
        try {
          const pj = soulmateJyotish(partnerChart.jd, partnerChart.birthUtcMs, partnerChart.sign, Date.now(), null);
          matchTiming = {
            userWindows: jyotish.windows.map((w) => ({ fromTh: w.fromTh, toTh: w.toTh })),
            partnerWindows: pj.windows.map((w) => ({ fromTh: w.fromTh, toTh: w.toTh })),
            overlaps: overlapWindows(jyotish.windows, pj.windows).map((w) => ({ fromTh: w.fromTh, toTh: w.toTh })),
          };
        } catch (e) {
          console.warn("[soulmate] jyotish สองฝ่ายคำนวณไม่สำเร็จ — ข้าม", e);
        }
      }
      const match = partnerMatchReading({
        userDominant: profile.dominant as Element5,
        userMissing: profile.missing as Element5[],
        userBirthDate: body.birthDate!,
        userLagna: lagna,
        partnerBirthDate: body.partnerBirthDate,
        partnerLagna,
        partnerName: body.partnerName ?? null,
      });
      if (!match) {
        return NextResponse.json({ error: "วันเกิดของอีกฝ่ายไม่ถูกต้องค่ะ (กรอกเป็น ค.ศ.)" }, { status: 400 });
      }

      const ctx = JSON.stringify(
        {
          ธาตุของคุณ: THAI_LABEL_5[profile.dominant as Element5],
          ธาตุที่คุณขาด: (profile.missing as Element5[]).map((m) => THAI_LABEL_5[m]),
          ธาตุของเขา: match.partner.dominantTh,
          ธาตุที่เขาขาด: match.partner.missingTh,
          เคมีธาตุ: { คะแนน: match.chemistry.final_score, ความสัมพันธ์: match.chemistry.relation_th },
          ความสอดคล้อง5ด้าน: match.coherence.map((c) => ({
            ด้าน: c.labelTh, เฉลี่ย: c.avg, ต่ำสุด: `${c.weakest.label} (${c.min})`, สูงสุด: `${c.strongest.label} (${c.max})`, tone: c.tone,
          })),
          ภพปัตนิ: match.patni
            ? match.patni.match
              ? `ตรงกันทั้งสองทาง — ลัคนาเขา (ราศี${match.patni.partnerLagna}) อยู่ในภพคู่ครองของคุณ และกลับกันด้วยโดยโครงสร้างราศี`
              : `ไม่ตรง (ภพคู่ครองของคุณคือราศี${match.patni.userSeventh} · ลัคนาเขาคือราศี${match.patni.partnerLagna}) — ไม่ใช่ลางร้าย เป็นชั้นหนึ่งจากหลายชั้น`
            : "ไม่ทราบลัคนาครบทั้งสองฝ่าย — ไม่ตัดสินชั้นนี้",
          ธาตุจากชื่อเขา: match.nameLayer
            ? {
                ธาตุ: match.nameLayer.elementTh,
                ความเข้ากัน: match.nameLayer.fit.relation_th,
                เลขศาสตร์ชื่อ: match.nameLayer.namePower,
                การ์ดพลังชื่อ: match.nameLayer.card,
              }
            : null,
          จุดแข็ง: match.advice.strengths,
          ข้อควรระวัง: match.advice.cautions,
          คำแนะนำ: match.advice.tips,
          ...(matchTiming
            ? {
                จังหวะเวลาสองฝ่าย_ชั้นJyotishเสริม: {
                  ช่วงจังหวะของคุณ: matchTiming.userWindows.map((w) => `${w.fromTh} – ${w.toTh}`),
                  ช่วงจังหวะของเขา: matchTiming.partnerWindows.map((w) => `${w.fromTh} – ${w.toTh}`),
                  ช่วงที่ทับซ้อนกัน: matchTiming.overlaps.length
                    ? matchTiming.overlaps.map((w) => `${w.fromTh} – ${w.toTh}`)
                    : "ช่วง 8 ปีข้างหน้าไม่มีช่วงทับซ้อนเด่นชัด (ไม่ใช่ลางร้าย — เป็นจังหวะพลังงาน)",
                },
              }
            : {}),
          คำเตือนที่ต้องแสดงครบ: match.caveats,
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
          system: LALA_MATCH_SYSTEM,
          input: `${memory ? `${memory}\n\n` : ""}<ผลเช็คความเข้ากัน>\n${ctx}\n</ผลเช็คความเข้ากัน>\n\nเรียบเรียงให้ผู้ใช้`,
          maxTokens: 1600,
        });
        reply = ai2.text;
      } catch (e) {
        console.warn("[soulmate] AI match ล้มเหลว — ใช้ผลคำนวณล้วน", e);
        reply =
          `เคมีธาตุ: ${match.chemistry.relation_th} (${match.chemistry.final_score})\n` +
          [...match.advice.strengths, ...match.advice.cautions, ...match.advice.tips].join("\n") +
          `\n\n${match.caveats.join("\n")}\n\n(ระบบเรียบเรียงอัตโนมัติชั่วคราว — ผู้ช่วย AI ไม่พร้อมใช้งานขณะนี้)`;
      }

      // จำเฉพาะผลรวม — **ไม่เก็บวันเกิด/ชื่อของอีกฝ่าย** (PARTNER_PRIVACY_NOTE)
      void rememberEvent(userId, "soulmate", {
        q: "เช็คความเข้ากันกับคนที่สนใจ",
        a: `เคมี ${match.chemistry.final_score}${match.patni?.match ? " · ตรงภพปัตนิ" : ""}`,
      });

      let creditsLeft: number | null = null;
      if (charge.mode === "credits") {
        const spent = await spendCredits(userId, charge.cost, "soulmate", bucket);
        if (spent.ok) creditsLeft = spent.balance;
        else console.warn("[soulmate] หักเครดิต match ไม่สำเร็จหลังตอบแล้ว", spent.reason);
      } else {
        await bumpDbUsage(userId, bucket);
      }
      return NextResponse.json({
        reply,
        match,
        matchTiming,
        ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
      });
    }

    // =======================================================================
    // โหมดภาพ — 30 เครดิต/ชุด 3 รูป ไม่มีสิทธิ์ฟรี (FLUX มีต้นทุนจริงทุกครั้ง)
    // =======================================================================
    if (mode === "images") {
      if (!isFalAvailable()) {
        return NextResponse.json({ error: "ระบบสร้างภาพยังไม่พร้อมใช้งานค่ะ" }, { status: 503 });
      }
      const cost = creditCost("soulmate_images");
      const balance = await getCreditBalance(userId);
      // ฟรี 1 ครั้ง/บัญชีถาวร (ผู้ใช้เคาะ 23 ส.ค. 2569) — นับแถวจริงใน soulmate_gen_e
      // (แพทเทิร์นเดียวกับ face-card: นับของที่เคยสร้างจริง ไม่รีเซ็ต ล้าง cookie ไม่ช่วย)
      const { count: genCount } = await createServiceClient()
        .from("soulmate_gen_e")
        .select("id", { count: "exact", head: true })
        .eq("auth_uid", userId);
      const freeRemaining = (genCount ?? 0) > 0 ? 0 : 1;
      const charge = decideCharge({ freeRemaining, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
      if (charge.mode === "denied") {
        return NextResponse.json(
          { quotaExceeded: true, message: chargeDeniedMessage(charge), credits: charge.balance, creditCost: charge.cost },
          { status: 429 }
        );
      }

      // คอลลาจรูปเดียว-หลายอิริยาบถ (ผู้ใช้เคาะ 23 ส.ค. 2569) — คนเดียวกันทุกมุม · 1 gen
      const prompts = [
        soulmateCollagePrompt({
          gender: partnerGender,
          element: partnerElement,
          look: body.look ?? null,
          extraTraitsEn: jyotish?.appearance.en ?? [],
        }),
      ];
      const captions = soulmateImageCaptions(reading);
      const images = await falSoulmateImages(prompts);

      // เก็บถาวร + token หน้าแชร์ /sm/<token> (แชร์โซเชียลได้ — ผู้ใช้ขอ)
      let shareUrl: string | null = null;
      const shown: { url: string; caption: string }[] = [];
      try {
        await ensureSoulmateBucket();
        const genId = randomUUID();
        const paths: string[] = [];
        for (let i = 0; i < images.length; i++) {
          paths.push(await storeSoulmateImage(userId, genId, i, images[i].url));
        }
        const token = newShareToken();
        const svc = createServiceClient();
        const { error: insErr } = await svc.from("soulmate_gen_e").insert({
          id: genId,
          auth_uid: userId,
          share_token: token,
          partner_gender: partnerGender,
          partner_element: partnerElement,
          image_paths: paths,
          captions,
        });
        if (insErr) throw new Error(insErr.message);
        shareUrl = `/sm/${token}`;
        for (let i = 0; i < paths.length; i++) {
          const signed = await soulmateSignedUrl(paths[i]);
          shown.push({ url: signed ?? images[i].url, caption: "" });
        }
      } catch (e) {
        // เก็บถาวรพัง = ยังส่งภาพชั่วคราว+คำบรรยายให้ผู้ใช้ได้ (ไม่มีลิงก์แชร์)
        console.warn("[soulmate] เก็บภาพ/สร้างลิงก์แชร์ไม่สำเร็จ — ใช้ URL ชั่วคราว", e);
        shown.length = 0;
        images.forEach((img) => shown.push({ url: img.url, caption: "" }));
      }

      // หักหลังสำเร็จเท่านั้น
      let creditsLeft: number | null = null;
      if (charge.mode === "credits") {
        const spent = await spendCredits(userId, charge.cost, "soulmate_images", logicBucket(SOULMATE_LOGIC_ID));
        if (spent.ok) creditsLeft = spent.balance;
        else console.warn("[soulmate] หักเครดิตภาพไม่สำเร็จหลังสร้างแล้ว", spent.reason);
      }
      images.forEach((img, i) => {
        void logImageGeneration({
          authUid: userId,
          kind: "soulmate_image",
          imageUrl: img.url,
          stored: shareUrl !== null,
          prompt: prompts[i],
          brandElement: partnerElement,
        });
      });
      return NextResponse.json({
        images: shown,
        captions,
        shareUrl,
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
              แนวโน้มรูปลักษณ์ตามนรลักษณ์_ค1: { ใบหน้า: reading.appearance.faceTh, รูปร่าง: reading.appearance.bodyTh },
              เคมีธาตุ: {
                คะแนน: reading.chemistry.score.final_score,
                ความสัมพันธ์: reading.chemistry.score.relation_th,
              },
              ทิศที่เกื้อหนุน: reading.chemistry.supportDirections,
            }
          : {
              อันดับธาตุคู่ที่เกื้อหนุน: reading.rankedElements,
              ทิศที่เกื้อหนุน: reading.supportDirections,
              แนวโน้มรูปลักษณ์ตามนรลักษณ์_ค1: { ใบหน้า: reading.appearance.faceTh, รูปร่าง: reading.appearance.bodyTh },
            }),
        ...(jyotish
          ? {
              ชั้นJyotishสากล_ชั้นเสริม: {
                ภพ7_ราศี: jyotish.seventhSign,
                เจ้าเรือน7: jyotish.seventhLord.grahaTh,
                เจ้าเรือน7อยู่ภพ: `${jyotish.seventhLord.house} (${jyotish.seventhLord.houseMeaningTh})`,
                บริบทที่มักพบคู่: jyotish.seventhLord.arenaTh,
                ดาวในภพ7: jyotish.planetsIn7th,
                รูปลักษณ์เพิ่มจากดาวในภพ7_ชั้นเสริม: jyotish.appearance.th,
                Darakaraka: jyotish.darakaraka,
                Upapada: {
                  ราศี: jyotish.upapada.signTh,
                  ความยั่งยืนชีวิตคู่_ภพ2จากUL: jyotish.upapada.second.toneTh,
                },
                D9: jyotish.d9.noteTh,
                นักษัตรเกิด: jyotish.nakshatra.nameTh,
                ทศาปัจจุบัน: jyotish.currentDasha,
                จังหวะเวลาเรื่องคู่: jyotish.windows.map((w) => ({ ช่วง: `${w.fromTh} – ${w.toTh}`, เหตุผล: w.reasonTh })),
                แนวโน้มฝั่งคู่_BhavatBhavam: {
                  ทรัพย์และครอบครัวฝั่งคู่: `ราศี${jyotish.derived.wealth.signTh} — ${jyotish.derived.wealth.toneTh}`,
                  การงานและบทบาทของคู่: `ราศี${jyotish.derived.career.signTh} (เจ้าเรือน${jyotish.derived.career.lordTh}) — ${jyotish.derived.career.toneTh}`,
                  บ้านและรากฐานพื้นเพของคู่: `ราศี${jyotish.derived.roots.signTh} — ${jyotish.derived.roots.toneTh}`,
                },
                ...(convergence
                  ? { ความสอดคล้องระหว่างศาสตร์: { ป้าย: convergence.label, คำอธิบาย: convergence.detailTh } }
                  : {}),
              },
            }
          : {}),
        ...(reading.nameLayer
          ? {
              ธาตุจากชื่อผู้ใช้_ชั้นเสริม: {
                ธาตุ: reading.nameLayer.elementTh,
                คะแนน: reading.nameLayer.fit.final_score,
                ความสัมพันธ์: reading.nameLayer.fit.relation_th,
                เลขศาสตร์ชื่อ: reading.nameLayer.namePower,
                การ์ดพลังชื่อ: reading.nameLayer.card,
                ...(reading.nameLayer.lens
                  ? {
                      เนื้อคู่มุมธาตุชื่อ: {
                        ธาตุคู่ที่เกื้อหนุนธาตุชื่อ: reading.nameLayer.lens.partnerElementTh,
                        ความสัมพันธ์: reading.nameLayer.lens.relationTh,
                        นิสัยแนวโน้ม: reading.nameLayer.lens.traitsTh,
                        รูปลักษณ์_ค1: {
                          ใบหน้า: reading.nameLayer.lens.appearance.faceTh,
                          รูปร่าง: reading.nameLayer.lens.appearance.bodyTh,
                        },
                        สไตล์การแต่งกายและอารมณ์: reading.nameLayer.lens.styleTh,
                      },
                    }
                  : {}),
              },
            }
          : {}),
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
      // ตัวชี้ความสอดคล้อง: ระบบแนบเองเสมอ (Flash ข้ามบรรทัดบังคับได้ — พิสูจน์จากการทดสอบ 24 ส.ค. 2569)
      if (convergence && !reply.includes("ความสอดคล้องระหว่างศาสตร์")) {
        reply += `

🧭 ความสอดคล้องระหว่างศาสตร์: ${convergence.label}
${convergence.detailTh}`;
      }
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
      jyotish,
      convergence,
      partnerElement,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
    });
  } catch (err) {
    console.error("[soulmate] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
