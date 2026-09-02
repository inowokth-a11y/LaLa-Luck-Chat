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
import { ashtakoota, type AshtakootaResult } from "@/lib/engine/ashtakoota";
import { preferenceOverlap, BODY_PREF, FACE_PREF, PERSONA_PREF, ELEMENT_APPEARANCE_STRONG_EN, type PreferenceOverlap } from "@/lib/engine/preference-match";
import { soulmateDualPath, soulmatePathImageCaptions, type SoulmateDualPath } from "@/lib/engine/soulmate";
import { moonEclipticLongitude } from "@/lib/engine/daily";
import { dualAdvicePaths, dualAdviceContextTh } from "@/lib/engine/dual-advice";
import { lahiriAyanamsa } from "@/lib/engine/ascendant";
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
2. 🔴 **ห้ามเอ่ยชื่อศาสตร์/ชื่อระบบ/ชื่อตำราทุกชนิด** (เช่น Jyotish, BPHS, Vimshottari, Ashtakoota,
   นรลักษณ์ ค.1, ชื่อตำรา) และ**ห้ามใช้วลี "หลักการคำนวณ"** — เมื่อจำเป็นต้องอ้างที่มา ให้พูดสั้นๆ
   เป็นภาษาชาวบ้านในเนื้อความ เช่น "จากตำแหน่งดาว ณ เวลาเกิดของคุณ" · "จากธาตุประจำตัวของคุณ" ·
   "จากตำแหน่งดวงจันทร์ของทั้งสองฝ่าย" — ไม่ต้องอธิบายวิธีคำนวณ
3. 🔴 ห้ามทำนาย "อายุของคู่" (บอกได้เพียงวุฒิภาวะจากข้อมูลที่ให้) · รูปลักษณ์ต้องเรียกว่า "แนวโน้ม"
   ห้ามฟันธง · พื้นเพ/ฐานะ/การงานฝั่งคู่พูดได้เฉพาะจากข้อมูลที่ให้เป็นแนวโน้มกว้างๆ ห้ามระบุตัวเลข
   ทรัพย์/อาชีพเจาะจง · จังหวะเวลา = "ช่วงที่เรื่องคู่มีน้ำหนัก" ห้ามการันตีว่าจะพบคู่
4. โครงคำตอบ:
   **กรณีมี "สองเส้นทางเนื้อคู่" — ใช้โครงกระจก (Mirror) ให้สองแนวทางเท่ากันเป๊ะ:**
   ① ทักทายสั้น 1-2 ประโยค: ดวงคุณมีเส้นทางเนื้อคู่ที่เป็นบวกสองแบบ แล้วเข้าเรื่องทันที —
   🔴 ห้ามใช้วลี "หลักการคำนวณ" และห้ามอธิบายที่มาของการคำนวณ (หน้าจอแสดงอยู่แล้ว)
   ② **แนวทาง ก** และ ③ **แนวทาง ข** — หัวข้อใช้แค่ "แนวทาง ก (ธาตุX)" / "แนวทาง ข (ธาตุY)"
   🔴 ห้ามใส่ป้ายลำดับชั้นในหัวข้อ (เช่น "ทางหลัก/ทางจากตำรา/ทางรอง") — treatment เท่ากัน ·
   หัวข้อย่อย**ชุดเดียวกันทุกหัวข้อ** เรียงเหมือนกัน:
   · นิสัยและตัวตนของเขา · แนวโน้มรูปลักษณ์ · เคมีกับคุณและความยั่งยืน · ชีวิตคู่แบบนี้เป็นอย่างไร
   และสิ่งที่ต้องดูแล — 🔴 **ความยาวสองแนวทางต้องใกล้เคียงกัน (ต่างไม่เกิน ~2 ประโยค)** ·
   🔴 **ห้ามคำเชียร์เชิงเปรียบเทียบ** (ดีกว่า/เหมาะกว่า/แนะนำทาง/ควรเลือก) — ทุกจุดต่างเล่าเป็น
   ข้อเท็จจริงจากข้อมูล ไม่ใช่คำตัดสิน · ห้ามยกแนวทางใดเหนือกว่า
   ④ **จุดร่วมและจุดต่าง**: 2-3 ประโยคจากบรรทัดเปรียบเทียบที่ให้
   ⑤ **คำแนะนำ**: ทางปฏิบัติที่ใช้ได้กับทั้งสองทาง (ทิศ/จังหวะ/การดูแลใจ) 2-3 ข้อ ·
   ถ้ามี "แนวคำแนะนำสองแบบ" ให้ปิดส่วนนี้ด้วยสองแนวสั้นๆ ให้ผู้ใช้เลือกจุดเน้นเอง
   (แนวเสริมส่วนที่ขาด / แนวส่งเสริมจุดแข็ง — สี/เทคนิคจากข้อมูลเท่านั้น ห้ามเชียร์ข้าง
   บอกว่าสองแนวใช้ร่วมกันได้) →
   ปิดด้วย caveat ทุกข้อที่ให้มา (ห้ามตัดทิ้ง) + ชวนถามต่อ 1 ประโยค
   **กรณีไม่มีสองเส้นทาง — พอร์เทรตเดียวเต็มรูปแบบ:** นิสัยคู่ (ถักทุกชั้นเป็นคนเดียว) →
   แนวโน้มรูปลักษณ์ → เคมีธาตุ (ตัวเลขตามที่ให้ สเกล −2..+2 ห้ามแปลงสเกล) + ความยั่งยืน →
   บริบทที่มักพบคู่ + จังหวะเวลา (ช่วง พ.ศ. ตามข้อมูล) → (ถ้ามี) พลังจากชื่อ → คำแนะนำ
   (ถ้ามี "แนวคำแนะนำสองแบบ" เสนอเป็นสองแนวสั้นๆ ให้ผู้ใช้เลือกจุดเน้นเอง — ห้ามเชียร์ข้าง
   บอกว่าใช้ร่วมกันได้) + caveat ครบ + ชวนถามต่อ
5. ถ้าโหมดเป็น "element" (ไม่มีเวลาเกิด) — บอกชัดตั้งแต่ต้นว่าคำนวณจากชั้นธาตุ (ยังไม่มีชั้นลัคนา)
6. เพศของคู่: ใช้คำตามที่ผู้ใช้ระบุใน "เพศคู่ที่สนใจ" เท่านั้น — "ไม่ระบุ" ใช้คำกลางๆ ("เขาคนนั้น")`;

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
4.4 ถ้ามี "คะแนนคู่36_เกณฑ์ดวงจันทร์สองฝ่าย_ชั้นเสริม" — เล่าหัวข้อสั้น "คะแนนคู่ตามเกณฑ์ดวงจันทร์ (ชั้นเสริมสากล)":
   รายงานคะแนนรวม x/36 ตามที่ให้ + จุดเด่น 2-3 กูฏ + จุดต้องดูแล (ธงโทษ) แบบนุ่มนวลพร้อมทางดูแล ·
   ห้ามเฉลี่ยรวมกับคะแนน 5 ด้าน/เคมีธาตุ (คนละระบบ) · นาฑี = "พลังชีวิต" ห้ามคำแพทย์ ·
   ห้ามใช้คะแนนนี้ฟันธงรับ/ปฏิเสธความสัมพันธ์
4.5 ถ้ามี "จังหวะเวลาสองฝ่าย_ชั้นเสริม" — เล่าเป็นหัวข้อสั้น "จังหวะเวลาของทั้งคู่"
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
  /** แท็กความชอบ (preset enum — ค่านอก enum ถูกเพิกเฉย) · ใช้ทั้ง overlap ในคำทำนายและ prompt ภาพ */
  prefBody?: string;
  prefFace?: string;
  prefPersona?: string[];
  /** เลือกเส้นทางภาพ "a" (ทางตำรา) | "b" (ทางที่ใจเลือก — ใช้ได้เมื่อสเปกทำให้เกิดทางแยกจริง) */
  pathChoice?: string;
  /** โทนผิวของภาพ (key ของ SKIN_TONES — ตัวเลือกการวาดตามความชอบ ไม่ใช่คำทำนาย) */
  prefSkin?: string;
  /** สไตล์ภาพ (key ของ ART_STYLES — default สเก็ตช์สีน้ำ ผู้ใช้เคาะ 2 ก.ย. 2569) */
  artStyle?: string;
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
    // เพศคู่: เลือกเอง = ตามนั้น · ไม่เลือก = อนุมานตรงข้ามจากเพศผู้ใช้ · ไม่มีข้อมูล = "any"
    // (แบบรวม/ให้โมเดลเลือก — มติผู้ใช้ 2 ก.ย. 2569 ลดขั้นตอน ทับมติ "ห้ามเดา ไม่เลือก=400" 21 ส.ค.)
    const partnerGender: PartnerGender =
      body.partnerGender && ["male", "female", "any"].includes(body.partnerGender)
        ? (body.partnerGender as PartnerGender)
        : body.userGender === "male" ? "female"
        : body.userGender === "female" ? "male"
        : "any";
    if (mode !== "match" && body.partnerGender && !["male", "female", "any"].includes(body.partnerGender)) {
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
      ? soulmateReading(lagna, profile.dominant, profile.missing, ownName, { birthDate: body.birthDate!, birthTime: body.birthTime ?? null })
      : soulmateElementReading(profile.dominant, profile.missing, ownName, { birthDate: body.birthDate!, birthTime: body.birthTime ?? null });
    // กลไก 3: ตัวชี้ความสอดคล้องระหว่างศาสตร์ (เฉพาะโหมดลัคนาที่มีชั้น Jyotish)
    const convergence: ConvergenceResult | null =
      jyotish && reading.mode === "lagna" ? soulmateConvergence(reading.chemistry.score.final_score, jyotish) : null;
    // ชั้นความชอบของผู้ใช้ ↔ แนวโน้มดวง (Preference Overlap — ฿0 · แท็ก enum เท่านั้น)
    const grahaFromTh = (th: string) =>
      (Object.entries({ sun: "อาทิตย์", moon: "จันทร์", mars: "อังคาร", mercury: "พุธ", jupiter: "พฤหัสบดี", venus: "ศุกร์", saturn: "เสาร์", rahu: "ราหู", ketu: "เกตุ" }).find(([, v]) => v === th)?.[0] ?? null) as
        | "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn" | "rahu" | "ketu" | null;
    const partnerElForPref: Element5 = reading.mode === "lagna" ? reading.partner.element : reading.rankedElements[0].element;
    const preference: PreferenceOverlap | null =
      body.prefBody || body.prefFace || (body.prefPersona && body.prefPersona.length)
        ? preferenceOverlap(
            { body: body.prefBody ?? null, face: body.prefFace ?? null, persona: body.prefPersona ?? null },
            {
              partnerElement: partnerElForPref,
              seventhLord: jyotish ? grahaFromTh(jyotish.seventhLord.grahaTh) : null,
              planetsIn7th: jyotish ? jyotish.planetsIn7th.map((x) => grahaFromTh(x.grahaTh)).filter((g): g is NonNullable<typeof g> => g !== null) : [],
              darakaraka: jyotish ? grahaFromTh(jyotish.darakaraka.grahaTh) : null,
              userDominant: profile.dominant as Element5,
              userMissing: profile.missing as Element5[],
            }
          )
        : null;

    // สองเส้นทางเนื้อคู่ (Dual Path — 25 ส.ค. 2569): ธาตุจากสเปกที่เลือก (body ก่อน face)
    // ต่างจากทางตำรา → เล่าสองทางเทียบกัน + ให้เลือกสร้างภาพแบบ ก/ข
    const prefElement =
      (body.prefBody && body.prefBody in BODY_PREF ? BODY_PREF[body.prefBody].element : null) ??
      (body.prefFace && body.prefFace in FACE_PREF ? FACE_PREF[body.prefFace].element : null) ??
      null;
    // ทางแยกอัตโนมัติ (25 ส.ค. 2569 — ผู้ใช้ทัก "ยังไม่มีให้เลือก"): ไม่กรอกสเปกก็ชี้ทางแยกให้
    // เมื่อมีธาตุอื่นที่เคมีเสมอ/สูงกว่าทางตำรา (จาก rankedElements ของ engine — ไม่ใช่การเดา)
    const rankedForAlt =
      reading.mode === "lagna" ? reading.chemistry.rankedElements : reading.rankedElements;
    const tamraScore =
      reading.mode === "lagna"
        ? reading.chemistry.score.final_score
        : rankedForAlt.find((r) => r.element === partnerElForPref)?.score ?? 0;
    const autoAlt = !prefElement
      ? rankedForAlt.find((r) => r.element !== partnerElForPref && r.score >= tamraScore)?.element ?? null
      : null;
    const dualPath: SoulmateDualPath | null = soulmateDualPath(
      profile.dominant as Element5,
      profile.missing as Element5[],
      partnerElForPref,
      prefElement ?? autoAlt,
      prefElement ? undefined : "อีกเส้นทางบวกที่ดวงคุณรองรับ (เคมีเสมอหรือสูงกว่า — ระบบชี้ให้เห็นทางเลือก)"
    );

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
      // รอบ 3: คะแนนคู่ 36 (Ashtakoota) จากดวงจันทร์สองฝ่าย — ต้องมีเวลาเกิดทั้งคู่
      let matchKoota: AshtakootaResult | null = null;
      if (birthChart && partnerChart) {
        try {
          const moonOf = (jd: number) => {
            const lon = moonEclipticLongitude(jd) - lahiriAyanamsa(jd);
            return ((lon % 360) + 360) % 360;
          };
          const aIsGroom =
            body.userGender === "male" && partnerGender === "female" ? true
              : body.userGender === "female" && partnerGender === "male" ? false : null;
          matchKoota = ashtakoota(moonOf(birthChart.jd), moonOf(partnerChart.jd), { aIsGroom });
        } catch (e) {
          console.warn("[soulmate] ashtakoota คำนวณไม่สำเร็จ — ข้าม", e);
        }
      }
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
        userBirthTime: body.birthTime ?? null,
        userName: body.name ?? null,
        userLagna: lagna,
        partnerBirthDate: body.partnerBirthDate,
        partnerBirthTime: body.partnerBirthTime ?? null,
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
                การ์ดพลังงานของเขา_สูตรรวม: match.nameLayer.card,
              }
            : null,
          จุดแข็ง: match.advice.strengths,
          ข้อควรระวัง: match.advice.cautions,
          คำแนะนำ: match.advice.tips,
          ...(matchKoota
            ? {
                คะแนนคู่36_เกณฑ์ดวงจันทร์สองฝ่าย_ชั้นเสริม: {
                  รวม: `${matchKoota.total}/36`,
                  เกณฑ์: matchKoota.bandTh,
                  นักษัตร: `${matchKoota.aNakshatraTh} × ${matchKoota.bNakshatraTh}`,
                  รายกูฏ: matchKoota.kootas.map((k) => `${k.nameTh} ${k.got}/${k.max} — ${k.noteTh}`),
                  จุดต้องดูแล: matchKoota.doshaFlags.length ? matchKoota.doshaFlags : "ไม่มีธงโทษ",
                },
              }
            : {}),
          ...(matchTiming
            ? {
                จังหวะเวลาสองฝ่าย_ชั้นเสริม: {
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
        matchKoota,
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
      // แบบ ข = สลับธาตุทั้งใบ (หน้า/รูปร่าง/ชุด/โทนสี ตามธาตุของทางที่เลือก — ภาพสอดคล้องในตัว)
      const imageElement: Element5 =
        body.pathChoice === "b" && dualPath ? dualPath.b.element : partnerElement;
      const prefForImage =
        body.prefBody || body.prefFace || (body.prefPersona && body.prefPersona.length)
          ? [
              ...(body.prefBody && body.prefBody in BODY_PREF ? [BODY_PREF[body.prefBody].promptEn] : []),
              ...(body.prefFace && body.prefFace in FACE_PREF ? [FACE_PREF[body.prefFace].promptEn] : []),
              ...(body.prefPersona ?? []).filter((k) => k in PERSONA_PREF).slice(0, 2).map((k) => PERSONA_PREF[k].promptEn),
            ]
          : [];
      const prompts = [
        soulmateCollagePrompt({
          gender: partnerGender,
          element: imageElement,
          look: body.look ?? null,
          extraTraitsEn: jyotish?.appearance.en ?? [],
          // เลือกเส้นทางแล้ว = วลีรูปลักษณ์แบบเข้มของธาตุทางนั้น (แก้ภาพ drift — ผู้ใช้รายงาน 25 ส.ค. 2569)
          preferenceEn: body.pathChoice && dualPath ? [ELEMENT_APPEARANCE_STRONG_EN[imageElement]] : prefForImage,
          // ⚠️ บรรทัด skin เคยหลุดตอน rewrite call นี้ (084a8df) — prefSkin ไม่ถึง prompt · คืนแล้ว 2 ก.ย. 2569
          skin: body.prefSkin ?? null,
          style: body.artStyle ?? null,
        }),
      ];
      // เลือกเส้นทาง ก/ข แล้ว → คำบรรยายต้องเป็นของเส้นทางนั้น (ตรงกับภาพ) ไม่ใช่ reading หลัก
      const chosenPath =
        dualPath && (body.pathChoice === "a" || body.pathChoice === "b")
          ? (body.pathChoice === "b" ? dualPath.b : dualPath.a)
          : null;
      const captions = chosenPath ? soulmatePathImageCaptions(chosenPath) : soulmateImageCaptions(reading);
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
          brandElement: imageElement,
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
              ชั้นคำนวณตำแหน่งดาว_ชั้นเสริม: {
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
        ...(dualPath
          ? {
              สองเส้นทางเนื้อคู่: {
                ทาง_ก: {
                  ที่มา: dualPath.a.sourceTh, ธาตุ: dualPath.a.elementTh,
                  นิสัยแนวโน้ม: dualPath.a.traitsTh,
                  รูปลักษณ์_ค1: `ใบหน้า${dualPath.a.appearance.faceTh} · รูปร่าง${dualPath.a.appearance.bodyTh}`,
                  เคมี: `${dualPath.a.chemistry.final_score >= 0 ? "+" : ""}${dualPath.a.chemistry.final_score} (${dualPath.a.chemistry.relation_th})`,
                },
                ทาง_ข: {
                  ที่มา: dualPath.b.sourceTh, ธาตุ: dualPath.b.elementTh,
                  นิสัยแนวโน้ม: dualPath.b.traitsTh,
                  รูปลักษณ์_ค1: `ใบหน้า${dualPath.b.appearance.faceTh} · รูปร่าง${dualPath.b.appearance.bodyTh}`,
                  เคมี: `${dualPath.b.chemistry.final_score >= 0 ? "+" : ""}${dualPath.b.chemistry.final_score} (${dualPath.b.chemistry.relation_th})`,
                },
                เปรียบเทียบ: dualPath.comparisonTh,
                หมายเหตุ: dualPath.caveats[0],
              },
            }
          : {}),
        ...(preference
          ? {
              มุมความชอบของผู้ใช้_เทียบแนวโน้มดวง: {
                สรุป: preference.summaryTh,
                รายข้อ: preference.items.map((it) => ({
                  ความชอบ: it.tagTh,
                  ชั้นดวงที่ชี้ตรง: it.matchedByTh.length ? it.matchedByTh : "ไม่ตรงชั้นไหน (จุดต่าง)",
                  เคมีของทางที่ชอบ: it.chemistryTh,
                })),
                หมายเหตุ: preference.caveats[0],
              },
            }
          : {}),
        แนวคำแนะนำสองแบบ: dualAdviceContextTh(
          dualAdvicePaths(profile.dominant as Element5, profile.missing as Element5[])
        ),
        ...(reading.nameLayer
          ? {
              ธาตุจากชื่อผู้ใช้_ชั้นเสริม: {
                ธาตุ: reading.nameLayer.elementTh,
                คะแนน: reading.nameLayer.fit.final_score,
                ความสัมพันธ์: reading.nameLayer.fit.relation_th,
                เลขศาสตร์ชื่อ: reading.nameLayer.namePower,
                การ์ดพลังงานของคุณ_สูตรรวม: reading.nameLayer.card,
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
      // บรรทัดปิดสองเส้นทาง: แนบ deterministic (แพทเทิร์นเดียว convergence — Flash เรียบเรียงหลุดได้)
      if (dualPath && !reply.includes("การเลือกเป็นของคุณ")) {
        reply += "\n\n🔀 สองเส้นทางนี้คือการอ่านดวงเดียวกันคนละมุม — การเลือกเป็นของคุณค่ะ (เลือกแบบ ก หรือ ข เพื่อสร้างภาพได้เลย)";
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
      preference,
      dualPath,
      partnerElement,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : {}),
    });
  } catch (err) {
    console.error("[soulmate] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
