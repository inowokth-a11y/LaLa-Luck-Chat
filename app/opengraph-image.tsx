// รูป OG ของทั้งเว็บ (default ทุกหน้า — หน้า /card/[id] มีของตัวเองทับ) — วาดสดด้วย next/og ฿0
// โทนหินอ่อน+ทองตามแบรนด์ + มาสคอตแม่หมอ · ใช้ตอนแชร์ลิงก์ lalaluckychat.com ขึ้นโซเชียล
// ฟอนต์ไทย: ฝัง Noto Sans Thai TTF (pattern เดียวกับ app/card/[id]/opengraph-image.tsx)

import { ImageResponse } from "next/og";
import { thaiSoftWrap } from "@/lib/share";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
// 🔴 cache 1 วัน — เดิมเรนเดอร์สดทุกครั้ง (การ์ด ~3.4s) ช้าจน **Messenger ตัดรูปทิ้ง** ทั้งที่
// FB feed ขึ้น (crawler คนละความอดทน — เจอจริง 4 ส.ค. 2569) · เนื้อหาคงที่ต่อ deploy
export const revalidate = 86400;
export const alt = "LaLa Lucky Chat — คำนวณทุกมิติที่ส่งผลต่อกัน";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  // อ่านด้วย fs pattern process.cwd()+literal — Vercel trace ไฟล์เข้า bundle ให้ (ดู card OG)
  const [fontData, mascot] = await Promise.all([
    readFile(path.join(process.cwd(), "assets", "NotoSansThai-SemiBold.ttf")),
    readFile(path.join(process.cwd(), "public", "mascot.png")).then(
      (b) => `data:image/png;base64,${b.toString("base64")}`
    ),
  ]);

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
            padding: "40px 60px",
            alignItems: "center",
            gap: 52,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascot} width={380} height={339} style={{ objectFit: "contain" }} alt="" />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", fontSize: 76, color: "#96700a", fontWeight: 700, lineHeight: 1.15 }}>
              LaLa Lucky Chat
            </div>
            <div style={{ display: "flex", fontSize: 33, color: "#2b2620", marginTop: 20, lineHeight: 1.45 }}>
              {thaiSoftWrap("คำนวณทุกมิติที่ส่งผลต่อกัน")}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#6b6255", marginTop: 10, lineHeight: 1.5 }}>
              {thaiSoftWrap("แพลตฟอร์มดูดวงที่ครอบคลุมที่สุด เชื่อมโยงมากที่สุด")}
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 28,
                color: "#8a5a00",
                fontWeight: 700,
                background: "rgba(184,134,11,0.14)",
                borderRadius: 12,
                padding: "10px 20px",
                marginTop: 26,
              }}
            >
              👉 กดเพื่อดู — คุณเหมือนใครในตำนาน/ประวัติศาสตร์?
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 25,
                color: "#f6f1e7",
                background: "#b8860b",
                borderRadius: 999,
                padding: "10px 26px",
                marginTop: 14,
              }}
            >
              🐾 เปิดการ์ดพลังงานประจำตัวของคุณ — ฟรี
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSansThai", data: fontData, weight: 600, style: "normal" }],
    }
  );
}
