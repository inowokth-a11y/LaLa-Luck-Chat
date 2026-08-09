// /api/cron/warm-og — อุ่นรูป OG ทุกใบให้แคชร้อนเสมอ (7 ส.ค. 2569)
//
// 🔴 ปัญหาจริงที่เจอ: URL รูป OG ของ Next มี ?hash ต่อ deploy — deploy ใหม่ = แคชหลุดทั้งชุด
// รูปการ์ดตอน MISS ใช้เวลา ~3-7 วินาที (ดึงรูปจาก Storage + ฟอนต์ + วาดสด) ซึ่ง**นานเกินที่
// crawler ของ Messenger/Facebook จะรอ** → พรีวิวไม่มีรูป (ผู้ใช้เจอจริง 2 รอบ: 4 ส.ค. + 7 ส.ค.)
// revalidate=86400 ที่ตั้งไว้ช่วยเฉพาะ "หลังมีคนโหลดครั้งแรก" — cron นี้เป็นคนโหลดครั้งแรกแทน
// crawler เสมอ (รายชั่วโมง → ช่องโหว่หลัง deploy สั้นสุด ~1 ชม. และแคชไม่หมดอายุกลางวัน)
//
// ต้นทุน: 101 requests/ชม. ต่อรูปที่ HIT = แทบศูนย์ · ตอน MISS ก็แค่ render ที่ต้องเกิดอยู่แล้ว

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // อุ่นตอนเย็นทั้งชุดอาจใช้ ~1-2 นาที

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const origin = new URL(req.url).origin;

  // ดึง URL รูปจริง (มี ?hash ปัจจุบัน) จาก meta ของหน้า — ไม่ hardcode hash ที่เปลี่ยนทุก deploy
  async function ogUrlOf(pagePath: string): Promise<string | null> {
    try {
      const res = await fetch(`${origin}${pagePath}`, {
        // ใช้ UA crawler เพื่อให้ /card/[id] เสิร์ฟหน้า OG เต็ม (คนจริงโดน redirect)
        headers: { "user-agent": "facebookexternalhit/1.1 (warm-og cron)" },
        cache: "no-store",
      });
      const html = await res.text();
      const m = html.match(/property="og:image" content="([^"]+)"/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  // hash เป็นค่าเดียวกันทั้ง route (ตรวจแล้ว: card/08 กับ card/88 ใช้ hash เดียวกัน)
  // จึงอ่านจากการ์ดตัวแทนใบเดียวแล้วประกอบ URL ของทั้ง 100 ใบได้
  const [homeOg, cardOgSample] = await Promise.all([ogUrlOf("/"), ogUrlOf("/card/00")]);

  const targets: string[] = [];
  if (homeOg) targets.push(homeOg);
  if (cardOgSample) {
    const suffix = cardOgSample.split("/card/00/")[1] ?? "opengraph-image";
    for (let i = 0; i < 100; i++) {
      targets.push(`${origin}/card/${String(i).padStart(2, "0")}/${suffix}`);
    }
  }

  let warmed = 0;
  let failed = 0;
  const CONCURRENCY = 10;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    await Promise.all(
      targets.slice(i, i + CONCURRENCY).map(async (u) => {
        try {
          const r = await fetch(u);
          await r.arrayBuffer();
          if (r.ok) warmed++;
          else failed++;
        } catch {
          failed++;
        }
      })
    );
  }

  return NextResponse.json({ ok: true, warmed, failed, total: targets.length });
}
