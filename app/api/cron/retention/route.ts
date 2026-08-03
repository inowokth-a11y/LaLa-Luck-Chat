// /api/cron/retention — ลบความจำแม่หมอที่เกินระยะเก็บ (ผู้ใช้ตัดสิน 3 ส.ค. 2569: 12 เดือน)
//
// เรียกโดย Vercel Cron รายวัน (ดู vercel.json) — Vercel แนบ Authorization: Bearer ${CRON_SECRET}
// ให้อัตโนมัติเมื่อตั้ง env CRON_SECRET ไว้ · เรียกเองไม่ได้ถ้าไม่มี secret (กัน DoS ลบข้อมูล)
//
// ลบอะไร:
//   user_history_e  เหตุการณ์เก่ากว่า 12 เดือน (append-only — ลบตามอายุรายแถว)
//   user_memory_e   สรุปของผู้ใช้ที่ไม่มีความเคลื่อนไหวเกิน 12 เดือน (ลบทั้งแถว —
//                   summary กลั่นจากเหตุการณ์ที่หมดอายุไปแล้ว เก็บต่อ = เก็บข้อมูลเกินประกาศ)
//
// หมายเหตุ: การลบบัญชี (cascade) ยังเป็นทางลบหลักตามเดิม — งานนี้เป็นเพดานอายุข้อมูลเพิ่มเติม
// ตามที่ประกาศใน /privacy §3 (PDPA_VERSION 2026-08-03.1)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { MEMORY_RETENTION_MONTHS } from "@/lib/memory";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MEMORY_RETENTION_MONTHS);
  const cutoffIso = cutoff.toISOString();

  try {
    const svc = createServiceClient();
    const [hist, mem] = await Promise.all([
      svc.from("user_history_e").delete({ count: "exact" }).lt("created_at", cutoffIso),
      svc.from("user_memory_e").delete({ count: "exact" }).lt("updated_at", cutoffIso),
    ]);
    if (hist.error || mem.error) {
      console.error("[cron/retention] ลบไม่สำเร็จ", hist.error?.message, mem.error?.message);
      return NextResponse.json({ error: "delete failed" }, { status: 500 });
    }
    const result = { historyDeleted: hist.count ?? 0, memoryDeleted: mem.count ?? 0, cutoff: cutoffIso };
    console.log("[cron/retention]", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/retention]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
