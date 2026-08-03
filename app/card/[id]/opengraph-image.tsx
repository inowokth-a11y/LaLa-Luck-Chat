// รูป OG ของหน้าแชร์การ์ด — วาดสดด้วย next/og (฿0 ไม่มีค่า gen ภาพ)
// โทนหินอ่อน+ทองตามแบรนด์ · 🔴 มีแค่ข้อมูลการ์ดสาธารณะ ไม่มีข้อมูลส่วนตัว (นโยบายเฟส 2)
// ฟอนต์ไทย: ImageResponse ไม่มีฟอนต์ไทยในตัว (สระ/วรรณยุกต์เพี้ยน) → ฝัง Noto Sans Thai TTF

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isValidCardId, thaiSoftWrap } from "@/lib/share";
import { cardImageUrl } from "@/lib/cards";

export const runtime = "nodejs";
export const alt = "การ์ดพลังงาน — LaLa Lucky Chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  try {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    let out = "";
    for (const w of seg.segment(text)) {
      if (out.length + w.segment.length > max) break;
      out += w.segment;
    }
    return (out || text.slice(0, max)) + "…";
  } catch {
    return text.slice(0, max) + "…";
  }
}

async function fetchCard(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("master_energy_cards")
    .select("energy_id, energy_name, core_essence, archetype_figure, figure_bio")
    .eq("energy_id", id)
    .maybeSingle();
  return data as {
    energy_id: string;
    energy_name: string | null;
    core_essence: string | null;
    archetype_figure: string | null;
    figure_bio: string | null;
  } | null;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = isValidCardId(id) ? await fetchCard(id) : null;

  const [fontData, cardImg] = await Promise.all([
    // อ่านด้วย fs — pattern process.cwd()+literal ที่ Vercel trace ไฟล์เข้า bundle ให้
    // (new URL(..., import.meta.url) บน runtime nodejs ได้ path เปล่าที่ fetch ไม่รับ)
    readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
    // ดึงรูปการ์ดเป็น data URI — กัน renderer มีปัญหากับ remote fetch ระหว่างวาด
    card
      ? fetch(cardImageUrl(card.energy_id))
          .then(async (r) => (r.ok ? `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` : null))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  // 🔴 thaiSoftWrap ทุกข้อความไทย — satori ตัดบรรทัดตามช่องว่างเท่านั้น ข้อความไทยยาว
  //    (ไม่มีช่องว่าง) จะทะลุขอบ/มุดใต้รูปการ์ด (บั๊กที่เจอจริงตอนแชร์ขึ้น Facebook)
  const name = thaiSoftWrap(card?.energy_name ?? "การ์ดพลังงาน");
  // สตอรี่บุคคลต้นแบบเป็นเนื้อหลักของภาพแชร์ (ผู้ใช้สั่ง 3 ส.ค. 2569) — ไม่มี bio ค่อยตกไป essence
  // ตัดที่ขอบคำ (ไม่ตัดกลางคำ) แล้วเติม … — ไทยไม่มีช่องว่าง ต้องใช้ Segmenter หาขอบ
  const story = thaiSoftWrap(truncateAtWord((card?.figure_bio ?? card?.core_essence) ?? "ค้นหาการ์ดพลังงานประจำตัวของคุณ", 145));
  // ชื่อบุคคลไม่ soft-wrap — สั้นพอไม่ล้น และ ZWSP จะทำให้วงเล็บปิดตกบรรทัดเดี่ยว
  const figure = card?.archetype_figure ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #e7c96a 0%, #b8860b 30%, #f3dc8e 52%, #a87908 76%, #e2c25e 100%)",
          padding: 26,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            background: "#f6f1e7",
            borderRadius: 22,
            padding: "40px 56px",
            alignItems: "center",
            gap: 48,
          }}
        >
          {/* minWidth:0 บังคับคอลัมน์ข้อความหดในกรอบ flex — ไม่ดันทับรูปการ์ดฝั่งขวา */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", fontSize: 28, color: "#6b6255" }}>{`การ์ดพลังงานหมายเลข ${card?.energy_id ?? "??"}`}</div>
            <div style={{ display: "flex", fontSize: 56, color: "#96700a", fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{name}</div>
            {figure && (
              <div style={{ display: "flex", fontSize: 30, color: "#a8541e", marginTop: 16, lineHeight: 1.4 }}>
                {`✨ คุณมีต้นแบบเดียวกับ ${figure}`}
              </div>
            )}
            <div style={{ display: "flex", fontSize: 24, color: "#2b2620", marginTop: 14, lineHeight: 1.5 }}>{story}</div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#8a5a00",
                fontWeight: 700,
                marginTop: 22,
                padding: "10px 18px",
                background: "rgba(184,134,11,0.14)",
                borderRadius: 12,
              }}
            >
              👉 กดเพื่อดู — คุณเหมือนใครในตำนาน/ประวัติศาสตร์?
            </div>
            <div style={{ fontSize: 22, color: "#b8860b", marginTop: 14, display: "flex", alignItems: "center" }}>
              🐾 LaLa Lucky Chat
            </div>
          </div>
          {cardImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cardImg} width={330} height={470} style={{ objectFit: "contain" }} alt="" />
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }],
    }
  );
}
