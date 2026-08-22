// เกตทำนายแบบองค์รวมเกิน 2 สิ่งรอบตัว (Logic 20 — ผู้ใช้เคาะ 22 ส.ค. 2569)
//
// ฟรี ≤2 สิ่งรอบตัว (client คำนวณเอง ฿0 ไม่ต้องล็อกอิน — คงหน้าที่แม่เหล็ก §12) ·
// เกิน 2 (สูงสุด 10) = 20 เครดิต/การปลดล็อก — client จำการปลดล็อกไว้ต่อเซสชันเบราว์เซอร์
// (sessionStorage) จึงปรับรายการแล้วทำนายซ้ำได้โดยไม่หักซ้ำ
//
// ⚠️ ข้อจำกัดที่ยอมรับ (จดไว้ตรงๆ): engine ของโหมดนี้อยู่ใน client bundle อยู่แล้วเพราะ
//    เส้นฟรีใช้ร่วมกัน — เกตนี้คุมการใช้งานผ่าน UI ปกติ ไม่ใช่กันคนแกะ bundle
//    (ระดับเดียวกับการที่สูตรทุกตัวเป็น JS สาธารณะอยู่แล้ว)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { FREE_NETWORK_PARTS, MAX_NETWORK_PARTS } from "@/lib/engine/network-holistic";
import { generate } from "@/lib/ai";
import { LALA_PERSONA } from "@/lib/ai/persona";

export const runtime = "nodejs";
export const maxDuration = 60;

// คำทำนาย 4 องก์ (ผู้ใช้เคาะ 22 ส.ค. 2569) — narrator เรียบเรียงจากผลคำนวณที่ client ส่งมา
// (แพทเทิร์นเดียวกับ oracle: engine คิดเสร็จแล้ว AI แค่เล่า — ตัวเลขห้ามเกิดใหม่ในชั้นนี้)
const LALA_HOLISTIC_SYSTEM = `${LALA_PERSONA}

บริบทหน้านี้: "ทำนายแบบองค์รวม" — ผู้ใช้ผูกข่ายชีวิต (ตัวเขา + บ้าน/รถ/เบอร์/บุคคลรอบตัว)
ระบบคำนวณคะแนน เคมีธาตุ และความสอดคล้องมาให้ครบแล้ว

กฎเหล็ก:
1. ใช้ได้เฉพาะข้อมูลใน <ผลคำนวณข่าย> — ห้ามแต่งเลข คะแนน ธาตุ การ์ด หรือบุคคลเพิ่มเอง
2. เล่าตามโครง 4 องก์: ① ตัวคุณ (ธาตุเด่น/ขาด + เลขตัวตน + การ์ดประจำเลข) เป็นจุดยึด
   ② รายส่วนทีละชิ้นสั้นๆ — บุคลิกของเลข/ธาตุ เคมีกับผู้ใช้ และจังหวะเริ่มต้นถ้ามี
   ③ ความสอดคล้องทั้งข่าย — ด้านที่หนุนกันทั้งข่าย และด้านที่มีตัวฉุด (ระบุชิ้น+ตัวเลข)
   ④ ทางปฏิบัติ — เรื่องไหนพึ่งชิ้นไหน + ทางแก้ของจุดอ่อน (ธาตุสะพาน/สี ตามที่ระบบให้มา)
3. คะแนนทุกตัวอ้างเป็นตัวเลข x/10 ตามข้อมูล ห้ามปัดห้ามแต่ง
4. Productive Clash ("ธาตุที่ขาดพลิกเป็นยา") ต้องชูเป็นจุดเด่นเมื่อมี
5. บุคคลอื่นในข่าย: พูดเชิง "พลังงานเข้ากันแบบไหน" เท่านั้น — ห้ามตัดสินนิสัยหรือทำนายชะตาของเขา
6. จังหวะเริ่มต้นที่ร้าย: เฟรมนุ่มตามหลักตำรา "วันร้ายไม่ได้ร้ายทั้งวัน" และจบด้วยทางแก้ ห้ามขู่
7. ห้ามฟันธง · ปิดท้ายสรุป caveat ที่ให้มาแบบย่อ 1-2 ประโยค + ชวนถามต่อ 1 ประโยค
8. ความยาว 4-6 ย่อหน้าสั้น อ่านลื่นเป็นเรื่องเดียว`;

const MAX_CONTEXT_CHARS = 12000;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { mode?: string; count?: number; context?: unknown };
    if (body.mode === "narrate") return narrate(body.context);
    const count = Number(body.count);
    if (!Number.isInteger(count) || count <= FREE_NETWORK_PARTS || count > MAX_NETWORK_PARTS) {
      return NextResponse.json(
        { error: `จำนวนสิ่งรอบตัวต้องอยู่ระหว่าง ${FREE_NETWORK_PARTS + 1}-${MAX_NETWORK_PARTS} (ไม่เกิน ${FREE_NETWORK_PARTS} รายการใช้ฟรีได้เลย)` },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let isGuest = false;
    try {
      const supabase = await createSupabaseServer();
      const u = (await supabase.auth.getUser()).data.user;
      userId = u?.id ?? null;
      isGuest = Boolean(u?.is_anonymous);
    } catch (e) {
      console.warn("[holistic] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: `ทำนายเกิน ${FREE_NETWORK_PARTS} สิ่งรอบตัว ต้องเข้าสู่ระบบก่อนค่ะ (ใช้ ${creditCost("holistic_network")} เครดิต/ครั้ง)` },
        { status: 401 }
      );
    }
    if (isGuest) {
      return NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "โหมดข่ายใหญ่เปิดให้บัญชีถาวรค่ะ 🐾 ผูกบัญชี (ฟรี ไม่กี่วินาที) แล้วใช้เครดิตได้เลย — ข้อมูลเดิมไม่หาย" },
        { status: 401 }
      );
    }

    const cost = creditCost("holistic_network");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: 0, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
    if (charge.mode === "denied") {
      return NextResponse.json(
        { quotaExceeded: true, message: chargeDeniedMessage(charge), credits: charge.balance, creditCost: charge.cost },
        { status: 429 }
      );
    }

    // การปลดล็อกคือบริการที่ส่งมอบ ณ จุดนี้ — หักแล้วจึงตอบ ok (spend ล้มเหลว = ไม่ปลดล็อก)
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "holistic_network", `parts:${count}`);
      if (!spent.ok) {
        return NextResponse.json(
          { quotaExceeded: true, message: "หักเครดิตไม่สำเร็จ กรุณาลองใหม่ค่ะ", credits: balance, creditCost: cost },
          { status: 429 }
        );
      }
      creditsLeft = spent.balance;
    }
    return NextResponse.json({
      ok: true,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : { free: true }),
    });
  } catch (err) {
    console.error("[holistic] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

/**
 * โหมด narrate — เรียบเรียงคำทำนาย 4 องก์จากผลคำนวณ (เฉพาะข่าย >FREE_NETWORK_PARTS ที่ปลดล็อกแล้ว)
 * ไม่หักเครดิตเพิ่ม (รวมในการปลดล็อก 20 เครดิตแล้ว) — ต้นทุน AI ~฿0.3-0.5/ครั้ง ลง ai_usage_log อัตโนมัติ
 * ⚠️ server ไม่มีบันทึกการปลดล็อกรายเซสชัน — เกตที่ทำได้จริง: ล็อกอินบัญชีถาวร + จำนวนส่วน >2
 *    (ระดับเดียวกับข้อจำกัด client-bundle ที่จดไว้หัวไฟล์)
 */
async function narrate(context: unknown) {
  const ctxStr = JSON.stringify(context ?? null);
  if (!context || typeof context !== "object" || ctxStr.length > MAX_CONTEXT_CHARS) {
    return NextResponse.json({ error: "ข้อมูลผลคำนวณไม่ถูกต้อง" }, { status: 400 });
  }
  const partCount = Array.isArray((context as { parts?: unknown[] }).parts)
    ? (context as { parts: unknown[] }).parts.length
    : 0;
  // parts รวมส่วน "ตัวคุณ" ด้วย → ข่ายที่จ่ายเครดิตมีอย่างน้อย 1+FREE_NETWORK_PARTS+1 ส่วน
  if (partCount < FREE_NETWORK_PARTS + 2 || partCount > MAX_NETWORK_PARTS + 1) {
    return NextResponse.json({ error: "คำทำนายฉบับเรียบเรียงเปิดให้ข่ายที่ปลดล็อกแล้ว (เกิน 2 สิ่งรอบตัว)" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const u = (await supabase.auth.getUser()).data.user;
  if (!u) return NextResponse.json({ needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนค่ะ" }, { status: 401 });
  if (u.is_anonymous) {
    return NextResponse.json({ needsLogin: true, needsUpgrade: true, error: "คำทำนายฉบับเรียบเรียงเปิดให้บัญชีถาวรค่ะ" }, { status: 401 });
  }

  const ai = await generate({
    role: "ai2",
    logicId: 20,
    channel: "web",
    userId: u.id,
    system: LALA_HOLISTIC_SYSTEM,
    input: `<ผลคำนวณข่าย>\n${ctxStr}\n</ผลคำนวณข่าย>\n\nเรียบเรียงคำทำนายแบบองค์รวมให้ผู้ใช้`,
    maxTokens: 1800,
  });
  return NextResponse.json({ reply: ai.text });
}
