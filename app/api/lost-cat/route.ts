// /api/lost-cat — วางแผนตามหาแมวหาย + calibration (เฟส 1 · 8 ก.ย. 2569)
// ฟรี ฿0 ไม่ต้องล็อกอิน (คนกำลังร้อนใจ ไม่ควรเจอกำแพง) — engine ล้วน ไม่ใช้ AI
//
// POST { mode:"plan", ...LostCatInput }        → คำนวณแผน + บันทึกเคส (calibration) → { caseId, plan }
// POST { mode:"outcome", caseId, found, direction?, ring?, place?, days? } → บันทึกผลจริง
// 🔴 ไม่มีข้อมูลส่วนตัวในเคส (enum/ทิศ/จำนวนวัน + auth_uid ถ้าล็อกอิน)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { lostCatPlan, DIRS8, RINGS, CAT_TYPES, TEMPERAMENTS } from "@/lib/engine/lost-cat";
import { thaiDayOfWeek } from "@/lib/engine/card-id";

export const runtime = "nodejs";

const PLACES = ["own_yard", "neighbor_yard", "vegetation", "under_house", "neighbor_house", "other"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function todayThaiDay(): string {
  // วันไทย = UTC+7 (บทเรียน 4 ส.ค. 2569: ห้ามใช้ toISOString ตรงๆ)
  const d = new Date(Date.now() + 7 * 3600000);
  return thaiDayOfWeek(d.toISOString().slice(0, 10));
}

async function currentUid(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServer();
    return (await supabase.auth.getUser()).data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const svc = createServiceClient();

    if (body.mode === "outcome") {
      const caseId = String(body.caseId ?? "");
      if (!UUID_RE.test(caseId)) return NextResponse.json({ error: "caseId ไม่ถูกต้อง" }, { status: 400 });
      const found = body.found === true;
      const direction = typeof body.direction === "string" && (DIRS8 as readonly string[]).includes(body.direction) ? body.direction : null;
      const ring = typeof body.ring === "string" && RINGS.some((r) => r.key === body.ring) ? body.ring : null;
      const place = typeof body.place === "string" && PLACES.includes(body.place) ? body.place : null;
      const days = Number.isInteger(Number(body.days)) && Number(body.days) >= 0 ? Math.min(Number(body.days), 3650) : null;
      const { data: exists } = await svc.from("lost_cat_cases_e").select("id").eq("id", caseId).maybeSingle();
      if (!exists) return NextResponse.json({ error: "ไม่พบเคสนี้" }, { status: 404 });
      const { error } = await svc.from("lost_cat_outcomes_e").insert({ case_id: caseId, found, direction, ring, place, days });
      if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
      return NextResponse.json({ ok: true, message: found ? "ดีใจด้วยนะคะ 🐾 ขอบคุณที่บอกจุดที่เจอ — ข้อมูลนี้ช่วยแมวตัวต่อไปค่ะ" : "ขอบคุณค่ะ 🙏 ขอให้เจอน้องเร็วๆ นะคะ" });
    }

    // ---- mode plan ----
    const catType = typeof body.catType === "string" && body.catType in CAT_TYPES ? body.catType : null;
    if (!catType) return NextResponse.json({ error: "กรุณาเลือกประเภทแมวก่อนค่ะ" }, { status: 400 });
    const input = {
      catType,
      temperament: typeof body.temperament === "string" && body.temperament in TEMPERAMENTS ? body.temperament : "unknown",
      daysMissing: Math.min(Math.max(0, Math.floor(Number(body.daysMissing) || 0)), 3650),
      exitDir: typeof body.exitDir === "string" ? body.exitDir : null,
      coverDirs: Array.isArray(body.coverDirs) ? body.coverDirs.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
      noiseDirs: Array.isArray(body.noiseDirs) ? body.noiseDirs.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
      seenDirs: Array.isArray(body.seenDirs) ? body.seenDirs.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
      oldHomeDir: typeof body.oldHomeDir === "string" ? body.oldHomeDir : null,
      coat: typeof body.coat === "string" ? body.coat.slice(0, 32) : null,
      todayDayTh: todayThaiDay(),
    };
    const plan = lostCatPlan(input);

    // calibration: เก็บอินพุต + top cells (ไม่มีข้อมูลส่วนตัว)
    let caseId: string | null = null;
    try {
      const uid = await currentUid();
      const { data } = await svc
        .from("lost_cat_cases_e")
        .insert({
          auth_uid: uid,
          inputs: input,
          predicted: { top: plan.cells.slice(0, 5).map((c) => ({ dir: c.dir, ring: c.ring, score: Number(c.score.toFixed(4)) })), topDirs: plan.topDirs.map((d) => d.dir) },
        })
        .select("id")
        .single();
      caseId = data?.id ?? null;
    } catch {
      caseId = null; // บันทึกไม่ได้ก็ยังคืนแผน (แผนสำคัญกว่าสถิติ)
    }

    return NextResponse.json({ ok: true, caseId, plan });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
