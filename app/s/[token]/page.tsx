// หน้าแชร์ face-card ส่วนบุคคล /s/<token> (face-card เฟส 1)
//
// ต่างจาก /card/<id> (redirect คนจริง): หน้านี้**แสดงจริงให้ทุกคน** — จุดขายคือภาพผลงาน
// ของคนที่แชร์ ซึ่งเล่าไม่จบในรูป OG อย่างเดียว · เนื้อหา: ภาพศิลปะ + ข้อมูลการ์ดสาธารณะ + CTA
// ไม่มีชื่อ/ข้อมูลส่วนตัวของเจ้าของ (นโยบายเดียวกับ lib/share.ts)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MascotLogo from "@/app/_components/MascotLogo";
import { figureCategoryLabel } from "@/lib/share";
import { faceCardSignedUrl } from "@/lib/face-card/store";
import { fetchShareData } from "./shared";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await fetchShareData(token);
  const name = data?.card?.energy_name ?? "การ์ดพลังงาน";
  const title = `ฉันในบทบาท "${name}" | LaLa Lucky Chat`;
  const description = data?.card?.archetype_figure
    ? `ภาพศิลปะประจำการ์ดพลังงาน — ต้นแบบเดียวกับ ${data.card.archetype_figure} · มาเปิดการ์ดของคุณดูสิ`
    : "ภาพศิลปะประจำการ์ดพลังงานของฉัน — มาเปิดการ์ดของคุณดูสิ";
  return {
    title,
    description,
    // หน้าแชร์ส่วนบุคคล — ไม่ให้ search engine index (เนื้อหาบาง + เป็นของส่วนตัวที่ผู้ใช้แชร์เอง)
    robots: { index: false, follow: false },
    alternates: { canonical: `/s/${token}` },
    openGraph: { title, description, url: `/s/${token}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FaceCardSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchShareData(token);
  if (!data) notFound();

  const { gen, card } = data;
  // ภาพจาก bucket private — signed URL อายุยาวพอสำหรับการเปิดดูหน้า (24 ชม. · หน้าเป็น dynamic)
  const imageUrl = await faceCardSignedUrl(gen.image_path, 86400);
  const catLabel = figureCategoryLabel(card?.figure_category);

  return (
    <main
      className="tone-marble"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem 1rem 3rem",
        color: "var(--ink)",
        textAlign: "center",
      }}
    >
      <div className="gold-frame" style={{ width: "100%", maxWidth: 440 }}>
        <div className="gold-frame-inner" style={{ padding: "1.6rem 1.2rem 1.4rem" }}>
          <div style={{ textAlign: "center" }}>
            <MascotLogo size={64} />
          </div>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", margin: "0.4rem 0 0" }}>
            ภาพศิลปะประจำการ์ดพลังงานหมายเลข {gen.card_id}
          </p>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`ภาพศิลปะประจำการ์ด ${card?.energy_name ?? gen.card_id}`}
              style={{
                width: "100%",
                maxWidth: 330,
                margin: "0.9rem auto 0.4rem",
                display: "block",
                borderRadius: 10,
                boxShadow: "0 10px 24px rgba(110,82,16,0.3)",
              }}
            />
          )}
          <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.5rem", color: "var(--gold)", margin: "0.5rem 0 0" }}>
            {card?.energy_name ?? "การ์ดพลังงาน"}
          </h1>
          {card?.archetype_figure && (
            <p style={{ fontSize: "0.92rem", margin: "0.5rem 0 0" }}>
              ✨ ต้นแบบเดียวกับ {card.archetype_figure}
              {catLabel ? <span style={{ color: "var(--ink-dim)", fontSize: "0.8rem" }}> · {catLabel}</span> : null}
            </p>
          )}
          <p style={{ color: "var(--ink-dim)", fontSize: "0.78rem", margin: "0.7rem 0 0", lineHeight: 1.6 }}>
            ภาพวาดด้วย AI ในสไตล์ศิลปะของการ์ด — จากรูปที่เจ้าของการ์ดสร้างเอง
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              padding: "0.7rem 1.4rem",
              background: "var(--gold)",
              color: "var(--card-bg)",
              borderRadius: 4,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🔮 เปิดการ์ดของคุณบ้าง — ฟรี
          </Link>
        </div>
      </div>
    </main>
  );
}
