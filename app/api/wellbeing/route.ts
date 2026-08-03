// แบบประเมินสุขภาวะ "LaLa Wellbeing Check" (สไลซ์ C — CLAUDE.md §15)
//
// ฟรีไม่จำกัด (ผู้ใช้ตัดสิน — ต้นทุน ฿0 ทั้งเส้น: pure engine ไม่มี AI ไม่มีเครดิต)
// guest (anonymous) ทำได้ — retention = ลบพร้อมบัญชี (FK cascade ครอบ ตาม migration 035)
// ⚠️ ข้อมูลอ่อนไหว: เขียนผ่าน service role หลังตรวจ consent เท่านั้น · อ่านผ่าน RLS own-row

import { NextResponse } from "next/server";
import { validateKwiAnswers, scoreKwi } from "@/lib/engine/wellbeing";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { PDPA_VERSION } from "@/lib/consent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { answers?: Record<string, unknown>; consent?: boolean };

    // consent เฉพาะแบบประเมิน — ไม่ติ๊ก = ไม่บันทึกและไม่คำนวณ (ข้อมูลสภาพจิตใจ)
    if (body.consent !== true) {
      return NextResponse.json({ error: "กรุณายอมรับเงื่อนไขการเก็บข้อมูลก่อนเริ่มแบบประเมิน" }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServer();
      userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    } catch (e) {
      console.warn("[wellbeing] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนทำแบบประเมิน (ฟรี — ผลจะถูกเก็บให้ดูย้อนหลังได้)" },
        { status: 401 }
      );
    }

    const answers = body.answers ?? {};
    const invalid = validateKwiAnswers(answers);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const result = scoreKwi(answers as Record<string, number>);

    // บันทึกผ่าน service role (ตารางไม่มี policy เขียน) — คะแนนเก็บค่าตายตัว ณ เวลาทำ
    const service = createServiceClient();
    const { error } = await service.from("kwi_responses_e").insert({
      auth_uid: userId,
      responses: answers,
      vitality: result.dimensions.VITALITY,
      meaning: result.dimensions.MEANING,
      connection: result.dimensions.CONNECTION,
      mastery: result.dimensions.MASTERY,
      resilience: result.dimensions.RESILIENCE,
      kwi_total: result.total,
      pattern: result.pattern.id,
      consent_version: PDPA_VERSION,
    });
    if (error) {
      // บันทึกพัง = แจ้งตรงๆ ไม่เงียบ (ผู้ใช้คาดหวังว่าดูย้อนหลังได้)
      console.error("[wellbeing] insert ล้มเหลว", error);
      return NextResponse.json({ error: "บันทึกผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (e) {
    console.error("[wellbeing] POST พัง", e);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}

/** ผลล่าสุดของตัวเอง — อ่านด้วย session client ผ่าน RLS own-row (ไม่ใช้ service role) */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    if (!userId) return NextResponse.json({ loggedIn: false, latest: null });

    const { data, error } = await supabase
      .from("kwi_responses_e")
      .select("responses, taken_at")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[wellbeing] GET อ่านผลล่าสุดไม่สำเร็จ", error);
      return NextResponse.json({ loggedIn: true, latest: null });
    }
    if (!data) return NextResponse.json({ loggedIn: true, latest: null });

    // คำนวณผลสดจากคำตอบดิบ (สูตรปัจจุบัน) — คะแนนตายตัวในแถวมีไว้เพื่อวิเคราะห์ย้อนหลัง
    const invalid = validateKwiAnswers((data.responses ?? {}) as Record<string, unknown>);
    const result = invalid ? null : scoreKwi(data.responses as Record<string, number>);
    return NextResponse.json({ loggedIn: true, latest: result ? { result, takenAt: data.taken_at } : null });
  } catch (e) {
    console.warn("[wellbeing] GET พัง", e);
    return NextResponse.json({ loggedIn: false, latest: null });
  }
}
