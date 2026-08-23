// สตอรี่ IG 1080×1920 ของภาพเนื้อคู่ (ผู้ใช้ขอ 23 ส.ค. 2569) — ดาวน์โหลดไปโพสต์เอง
// (IG ไม่มี web intent สำหรับ story — แพทเทิร์นเดียวกับ face-card /s/<token>/story)
// ป้าย "ภาพจินตนาการจาก AI" ต้องอยู่ในภาพเสมอ (นโยบายโหมดเนื้อคู่)

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { thaiSoftWrap } from "@/lib/share";
import { readSoulmateImage } from "@/lib/soulmate/store";
import { fetchSoulmateShare, imageBufferToDataUri, stripCjkForSatori } from "../shared";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await fetchSoulmateShare(token);
    if (!data) return new Response(null, { status: 404 });

    const [fontData, artBuf] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
      readSoulmateImage(data.image_paths[0]),
    ]);
    if (!artBuf) return new Response(null, { status: 404 });
    const artUri = imageBufferToDataUri(artBuf);
    const caption = thaiSoftWrap(stripCjkForSatori(data.captions[0] ?? "คำนวณจากลัคนาและธาตุจริง").slice(0, 130));

    const img = new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(160deg, #0a0e28 0%, #101733 45%, #0a0e28 100%)",
            padding: 48,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              border: "3px solid #b8860b",
              borderRadius: 36,
              background: "#f6f1e7",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", width: "100%", height: 1230 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUri} width={984} height={1230} style={{ objectFit: "cover", width: "100%", height: "100%" }} alt="" />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                padding: "26px 48px",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 58, color: "#96700a", fontWeight: 700, lineHeight: 1.2 }}>
                เนื้อคู่ตามดวงของฉัน ✨
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#2b2620", marginTop: 12, lineHeight: 1.5 }}>
                {caption}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: "#6b6255", marginTop: 12 }}>
                🎨 ภาพจินตนาการจาก AI — ไม่ใช่บุคคลจริง
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#b8860b", marginTop: 10 }}>
                🐾 lalaluckychat.com
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }] }
    );

    const headers = new Headers(img.headers);
    headers.set("Content-Disposition", `attachment; filename="lala-soulmate-story.png"`);
    headers.set("Cache-Control", "public, max-age=86400");
    return new Response(img.body, { status: 200, headers });
  } catch (e) {
    console.error("[soulmate-story]", e);
    return new Response(null, { status: 500 });
  }
}
