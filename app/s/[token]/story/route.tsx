// สตอรี่ IG 1080×1920 ของ face-card — ผู้ใช้ดาวน์โหลดไปโพสต์เอง (แชร์ story ตรงจากเว็บไม่ได้
// — IG ไม่มี web intent สำหรับ story) · เนื้อหา: ภาพผลงานใหญ่ + ชื่อการ์ด + แบรนด์
// วาดด้วย next/og ฿0 — เส้นทางนี้ dynamic (ต่อ token) แคชด้วย Cache-Control ธรรมดา

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { thaiSoftWrap } from "@/lib/share";
import { readFaceCardImage } from "@/lib/face-card/store";
import { fetchShareData, imageBufferToDataUri } from "../shared";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const data = await fetchShareData(token);
    if (!data) return new Response(null, { status: 404 });

    const [fontData, artBuf] = await Promise.all([
      readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
      readFaceCardImage(data.gen.image_path),
    ]);
    if (!artBuf) return new Response(null, { status: 404 });
    const artUri = imageBufferToDataUri(artBuf);
    const name = thaiSoftWrap(data.card?.energy_name ?? "การ์ดพลังงาน");
    const figure = data.card?.archetype_figure ?? null;

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
            {/* ภาพผลงานเต็มความกว้าง */}
            <div style={{ display: "flex", width: "100%", height: 1280 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUri} width={984} height={1280} style={{ objectFit: "cover", width: "100%", height: "100%" }} alt="" />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                padding: "28px 48px",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", fontSize: 34, color: "#6b6255" }}>
                {`ฉันในบทบาทการ์ดพลังงานหมายเลข ${data.gen.card_id}`}
              </div>
              <div style={{ display: "flex", fontSize: 64, color: "#96700a", fontWeight: 700, marginTop: 10, lineHeight: 1.2 }}>
                {name}
              </div>
              {figure && (
                <div style={{ display: "flex", fontSize: 34, color: "#a8541e", marginTop: 12 }}>
                  {thaiSoftWrap(`✨ ต้นแบบเดียวกับ ${figure}`)}
                </div>
              )}
              <div style={{ display: "flex", fontSize: 32, color: "#b8860b", marginTop: 18 }}>
                🐾 lalaluckychat.com
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1920, fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }] }
    );

    // ส่งเป็นไฟล์ดาวน์โหลด (ผู้ใช้เอาไปโพสต์สตอรี่เอง) + แคช 1 วัน
    const headers = new Headers(img.headers);
    headers.set("Content-Disposition", `attachment; filename="lala-face-card-story.png"`);
    headers.set("Cache-Control", "public, max-age=86400");
    return new Response(img.body, { status: 200, headers });
  } catch (e) {
    console.error("[face-card-story]", e);
    return new Response(null, { status: 500 });
  }
}
