// หน้าแชร์ภาพเนื้อคู่ /sm/<token> (ผู้ใช้ขอ 23 ส.ค. 2569) — แสดงจริงทุกคน (แบบ /s ของ face-card)
// เนื้อหา: ชุดภาพจินตนาการ 3 รูป + คำบรรยายจาก engine + CTA — ไม่มีข้อมูลส่วนตัวเจ้าของ

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MascotLogo from "@/app/_components/MascotLogo";
import { SOULMATE_IMAGE_DISCLAIMER } from "@/lib/engine/soulmate";
import { soulmateSignedUrl } from "@/lib/soulmate/store";
import { fetchSoulmateShare } from "./shared";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchSoulmateShare(token);
  const title = "เนื้อคู่ในจินตนาการของฉัน ✨ | LaLa Lucky Chat";
  const description = data
    ? `${data.captions[0] ?? "คำนวณจากลัคนาและธาตุจริง"} — เปิดดวงเนื้อคู่ของคุณบ้างสิ`
    : "เปิดดวงเนื้อคู่จากลัคนาและธาตุจริง";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/sm/${token}` },
    openGraph: { title, description, url: `/sm/${token}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SoulmateSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchSoulmateShare(token);
  if (!data) notFound();

  const urls = await Promise.all(data.image_paths.map((p) => soulmateSignedUrl(p, 86400)));

  return (
    <main
      className="tone-marble"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        padding: "2rem 1rem 3rem",
        color: "var(--ink)",
        textAlign: "center",
      }}
    >
      <div className="gold-frame" style={{ width: "100%", maxWidth: 480 }}>
        <div className="gold-frame-inner" style={{ padding: "1.6rem 1.2rem 1.4rem" }}>
          <div style={{ textAlign: "center" }}>
            <MascotLogo size={64} />
          </div>
          <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.5rem", color: "var(--gold)", margin: "0.4rem 0 0" }}>
            เนื้อคู่ในจินตนาการของฉัน ✨
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.82rem", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            คำนวณจากลัคนา ราศีคู่ครอง และธาตุจริง — {SOULMATE_IMAGE_DISCLAIMER}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {data.image_paths.map((p, i) =>
              urls[i] ? (
                <figure key={p} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls[i]!}
                    alt={`ภาพจินตนาการเนื้อคู่ ${i + 1}`}
                    style={{ width: "100%", maxWidth: 340, borderRadius: 10, boxShadow: "0 8px 20px rgba(110,82,16,0.25)" }}
                  />
                  {data.captions[i] && (
                    <figcaption style={{ fontSize: "0.85rem", marginTop: "0.4rem", lineHeight: 1.6 }}>
                      {data.captions[i]}
                    </figcaption>
                  )}
                  <p style={{ color: "var(--ink-dim)", fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
                    🎨 {SOULMATE_IMAGE_DISCLAIMER}
                  </p>
                </figure>
              ) : null
            )}
          </div>
          <Link
            href="/soulmate"
            style={{
              display: "inline-block",
              marginTop: "1.2rem",
              padding: "0.7rem 1.4rem",
              background: "var(--gold)",
              color: "var(--card-bg)",
              borderRadius: 4,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            💞 เปิดดวงเนื้อคู่ของคุณบ้าง — ฟรีครั้งแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
