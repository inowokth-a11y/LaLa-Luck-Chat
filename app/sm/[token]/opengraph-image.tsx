// รูป OG หน้าแชร์เนื้อคู่ — ซ้ายข้อความ (หัวเรื่อง/คำบรรยายคู่/CTA + ป้าย AI บังคับ) ขวาภาพเต็มครึ่ง
// (เลย์เอาต์ตระกูลเดียวกับ face-card /s) · ภาพจาก bucket private อ่านฝั่ง server

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { thaiSoftWrap } from "@/lib/share";
import { readSoulmateImage } from "@/lib/soulmate/store";
import { fetchSoulmateShare, imageBufferToDataUri } from "./shared";

export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "เนื้อคู่ในจินตนาการ — LaLa Lucky Chat";
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

export default async function OgImage({ params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await fetchSoulmateShare(token);
    if (!data) return new Response(null, { status: 404 });

    const [fontData, artBuf] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
      readSoulmateImage(data.image_paths[0]),
    ]);
    const artUri = artBuf ? imageBufferToDataUri(artBuf) : null;
    const caption = thaiSoftWrap(truncateAtWord(data.captions[0] ?? "คำนวณจากลัคนาและธาตุจริง", 120));

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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                flex: 1,
                minWidth: 0,
                padding: "40px 44px",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", fontSize: 50, color: "#96700a", fontWeight: 700, lineHeight: 1.25 }}>
                เนื้อคู่ในจินตนาการของฉัน ✨
              </div>
              <div style={{ display: "flex", fontSize: 26, color: "#2b2620", lineHeight: 1.55 }}>{caption}</div>
              <div
                style={{
                  display: "flex",
                  fontSize: 25,
                  color: "#8a5a00",
                  fontWeight: 700,
                  padding: "12px 18px",
                  background: "rgba(184,134,11,0.14)",
                  borderRadius: 12,
                }}
              >
                💞 เปิดดวงเนื้อคู่ของคุณบ้าง — ฟรีครั้งแรก
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 19, color: "#6b6255" }}>
                  🎨 ภาพจินตนาการจาก AI — ไม่ใช่บุคคลจริง
                </div>
                <div style={{ display: "flex", fontSize: 21, color: "#b8860b" }}>🐾 LaLa Lucky Chat</div>
              </div>
            </div>
            {artUri && (
              <div style={{ display: "flex", width: 500, height: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artUri} width={500} height={582} style={{ objectFit: "cover", width: "100%", height: "100%" }} alt="" />
              </div>
            )}
          </div>
        </div>
      ),
      { ...size, fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }] }
    );
  } catch (e) {
    console.error("[soulmate-og]", e);
    return new Response(null, { status: 500 });
  }
}
