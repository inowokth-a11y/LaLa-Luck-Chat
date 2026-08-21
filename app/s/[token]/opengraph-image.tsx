// รูป OG หน้าแชร์ face-card — เลย์เอาต์ใหม่ตามที่ผู้ใช้เคาะ (คิว §15):
// **ซ้าย 3 บรรทัด (เลข+ชื่อการ์ด / ต้นแบบ / CTA) · ขวา = ภาพหน้าเต็มครึ่งกรอบ**
// ภาพมาจาก bucket private อ่านฝั่ง server (service role) — ไม่มี URL สาธารณะหลุดในภาพ

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { thaiSoftWrap } from "@/lib/share";
import { readFaceCardImage } from "@/lib/face-card/store";
import { fetchShareData, imageBufferToDataUri } from "./shared";

export const runtime = "nodejs";
// cache 1 วัน — บทเรียนเดิม: เรนเดอร์สดช้าจน Messenger ตัดรูปทิ้ง (CLAUDE.md §15)
export const revalidate = 86400;
export const alt = "ภาพศิลปะประจำการ์ดพลังงาน — LaLa Lucky Chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await fetchShareData(token);
    // token ไม่มีจริง = ไม่มีหน้า — อย่าเสิร์ฟภาพ placeholder (ลิงก์ปลอมจะดูเหมือนของจริง)
    if (!data) return new Response(null, { status: 404 });

    const [fontData, artBuf] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
      readFaceCardImage(data.gen.image_path),
    ]);
    const artUri = artBuf ? imageBufferToDataUri(artBuf) : null;

    // หัวเรื่องใช้เฉพาะชื่อไทย (ตัดวงเล็บอังกฤษ) — ชื่อเต็มยาวเกินคอลัมน์ซ้ายจนดัน CTA ล้นกรอบ
    // (เจอจริงกับ "จักรพรรดิแห่งความมั่งคั่ง (The Emperor of Wealth)") · ชื่อเต็มอยู่บนหน้าแชร์เอง
    const rawName = (data?.card?.energy_name ?? "การ์ดพลังงาน").replace(/\s*\(.*\)\s*$/, "");
    const name = thaiSoftWrap(rawName);
    const nameSize = rawName.length > 18 ? 42 : 54;
    const figure = data?.card?.archetype_figure ?? null;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "linear-gradient(135deg, #e7c96a 0%, #b8860b 30%, #f3dc8e 52%, #a87908 76%, #e2c25e 100%)",
            padding: 24,
          }}
        >
          <div style={{ flex: 1, display: "flex", background: "#f6f1e7", borderRadius: 20, overflow: "hidden" }}>
            {/* ซ้าย: 3 บรรทัดตามสเปก */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                minWidth: 0,
                padding: "36px 44px",
                gap: 18,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 25, color: "#6b6255" }}>
                  {`ฉันในบทบาทการ์ดพลังงานหมายเลข ${data.gen.card_id}`}
                </div>
                <div style={{ display: "flex", fontSize: nameSize, color: "#96700a", fontWeight: 700, lineHeight: 1.25, marginTop: 6 }}>
                  {name}
                </div>
              </div>
              {figure && (
                <div style={{ display: "flex", fontSize: 27, color: "#a8541e", lineHeight: 1.4 }}>
                  {thaiSoftWrap(`✨ ต้นแบบเดียวกับ ${figure}`)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#8a5a00",
                  fontWeight: 700,
                  padding: "12px 18px",
                  background: "rgba(184,134,11,0.14)",
                  borderRadius: 12,
                }}
              >
                👉 เปิดการ์ดของคุณ — คุณจะเป็นใครในตำนาน?
              </div>
              <div style={{ display: "flex", fontSize: 22, color: "#b8860b" }}>🐾 LaLa Lucky Chat</div>
            </div>
            {/* ขวา: ภาพหน้าเต็มครึ่งกรอบ (cover เต็มความสูง) */}
            {artUri && (
              <div style={{ display: "flex", width: 560, height: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artUri} width={560} height={582} style={{ objectFit: "cover", width: "100%", height: "100%" }} alt="" />
              </div>
            )}
          </div>
        </div>
      ),
      { ...size, fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }] }
    );
  } catch (e) {
    console.error("[face-card-og]", e);
    return new Response(null, { status: 500 });
  }
}
