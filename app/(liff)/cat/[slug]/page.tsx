// หน้า SEO รายชนิด "แมวมงคล" 18 หน้า (/cat/<ชื่อไทย>) — 9 ก.ย. 2569 ผู้ใช้สั่ง "ทำ SEO เรื่องดูดวงแมว"
//
// static ทั้งหมด (generateStaticParams) ฿0 ไม่เรียก AI/DB · ทุกบรรทัดมาจาก CAT_TAMRA (cross-check แล้ว)
// + ตารางวันเกิด↔ธาตุแมว คำนวณจาก wuXingScore ตัวจริง (ชั้นเสริม ประกาศ caveat)
// 🔴 กติกาโหมดแมว: เล่าเฉพาะด้านมงคล · ไม่ตัดสินแมวตัวใด · ไม่แตะสุขภาพสัตว์

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MascotLogo from "@/app/_components/MascotLogo";
import {
  catSeoEntries,
  catSeoEntry,
  catBreedFaq,
  breedDayRows,
  relatedBreeds,
  CAT_DAY_COLOR_CAVEAT,
  CAT_TAMRA_CAVEAT,
  CAT_ELEMENT_NOTE,
} from "@/lib/cat/seo";
import { THAI_LABEL_5 } from "@/lib/engine/element";

export const dynamicParams = false;

export function generateStaticParams() {
  return catSeoEntries().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = catSeoEntry(decodeURIComponent(slug));
  if (!e) return { title: "ไม่พบชนิดแมว" };
  const alias = e.aliasTh ? ` (${e.aliasTh})` : "";
  return {
    title: `แมว${e.nameTh}${alias} ลักษณะ ความหมาย ให้คุณด้านใด — แมวมงคลตามตำรา`,
    description:
      `แมว${e.nameTh}${alias}: ${e.traitsTh} ตา${e.eyeTh} ตำราแมวศุภลักษณ์ว่า ${e.boonTh} ` +
      `พร้อมตารางว่าเหมาะกับคนเกิดวันไหนตามหลักธาตุ และเช็คว่าแมวของคุณตรงชนิดนี้ไหม ฟรี`,
    alternates: { canonical: `/cat/${encodeURIComponent(e.slug)}` },
  };
}

const card: React.CSSProperties = {
  background: "#fffdf8",
  color: "#1d1812",
  border: "1px solid rgba(184,134,11,0.35)",
  borderRadius: 12,
  padding: "1rem 1.1rem",
  marginBottom: "0.9rem",
};
const h2: React.CSSProperties = { fontFamily: "var(--font-serif-thai)", color: "#96700a", fontSize: "1.1rem", margin: "0 0 0.4rem" };
const p: React.CSSProperties = { margin: "0.3rem 0", lineHeight: 1.75, fontSize: "0.92rem" };
const chip: React.CSSProperties = {
  display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.8rem",
  background: "rgba(184,134,11,0.12)", border: "1px solid rgba(184,134,11,0.4)",
};
const th: React.CSSProperties = { textAlign: "left", padding: "0.4rem 0.5rem", borderBottom: "1px solid rgba(184,134,11,0.4)", fontSize: "0.82rem" };
const td: React.CSSProperties = { padding: "0.4rem 0.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "top" };
const cta: React.CSSProperties = {
  display: "inline-block", padding: "0.6rem 1.1rem", borderRadius: 8, background: "#b8860b", color: "#faf7f0",
  fontWeight: 700, textDecoration: "none", border: "1.5px solid #8a6508",
};

export default async function CatBreedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = catSeoEntry(decodeURIComponent(slug));
  if (!entry) notFound();
  const faq = catBreedFaq(entry);
  const dayRows = breedDayRows(entry);
  const related = relatedBreeds(entry);
  const alias = entry.aliasTh ? ` (${entry.aliasTh})` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ดูดวงแมว", item: "https://lalaluckychat.com/cat" },
      { "@type": "ListItem", position: 2, name: `แมว${entry.nameTh}`, item: `https://lalaluckychat.com/cat/${encodeURIComponent(entry.slug)}` },
    ],
  };

  return (
    <main className="tone-marble" style={{ minHeight: "100vh", padding: "1.2rem 1rem 4rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "1rem" }}>
          <MascotLogo size={80} />
          <p style={{ fontSize: "0.78rem", opacity: 0.75, margin: "0.3rem 0 0", color: "var(--outer-ink-dim, #e9dcb8)" }}>
            <Link href="/cat" style={{ color: "var(--outer-gold, #e2c25e)" }}>ดูดวงแมว</Link> › แมวมงคลตามตำรา
          </p>
          <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--outer-gold, #e2c25e)", fontSize: "1.5rem", margin: "0.3rem 0" }}>
            แมว{entry.nameTh}{alias}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--outer-ink-dim, #e9dcb8)" }}>
            {entry.inTamra ? "1 ใน 17 แมวมงคลตามสมุดข่อยตำราแมวโบราณ" : "แมวไทยยุคหลังที่นิยมนับเป็นแมวมงคล (ไม่อยู่ในสมุดข่อย 17 ชนิด)"}
          </p>
        </header>

        <section style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.7rem" }}>
            <span style={chip}>ตา{entry.eyeTh}</span>
            {entry.element && <span style={chip}>ธาตุ{THAI_LABEL_5[entry.element]} (จากสีขน{entry.colorTh})</span>}
            <span style={chip}>{entry.inTamra ? "อยู่ในสมุดข่อย" : "นอกสมุดข่อย"}</span>
          </div>
          <h2 style={h2}>ลักษณะตามตำรา</h2>
          <p style={p}>{entry.traitsTh}</p>
          <h2 style={h2}>ให้คุณด้านใด</h2>
          <p style={p}>{entry.boonTh}</p>
          <p style={{ ...p, fontSize: "0.78rem", opacity: 0.75 }}>⚠️ {CAT_TAMRA_CAVEAT}</p>
        </section>

        <section style={card}>
          <h2 style={h2}>แมวของคุณใช่{entry.nameTh}ไหม เช็คได้ทันที</h2>
          <p style={p}>
            เลือกสีขน ลาย และสีตาของแมวที่บ้าน ระบบจะเทียบกับตำราทั้ง 17 ชนิดให้ทันที พร้อมอ่านความเข้ากันของธาตุแมวกับธาตุประจำตัวของคุณ
            (คำนวณจากวันเดือนปีเกิดจริง) ฟรี ไม่ต้องสมัคร
          </p>
          <Link href="/cat" style={cta}>🐱 เช็คแมวของฉัน →</Link>
        </section>

        {entry.element && dayRows.length > 0 && (
          <section style={card}>
            <h2 style={h2}>แมว{entry.nameTh}เหมาะกับคนเกิดวันไหน</h2>
            <p style={p}>
              สีขน{entry.colorTh}ของ{entry.nameTh}จัดเป็นธาตุ{THAI_LABEL_5[entry.element]} ตารางนี้เทียบกับธาตุประจำวันเกิดของเจ้าของด้วยหลักเบญจธาตุ
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem", minWidth: 340 }}>
                <thead>
                  <tr><th style={th}>วันเกิดเจ้าของ</th><th style={th}>ธาตุประจำวัน</th><th style={th}>ความสัมพันธ์กับแมว{entry.nameTh}</th></tr>
                </thead>
                <tbody>
                  {dayRows.map((r) => (
                    <tr key={r.day}>
                      <td style={td}>วัน{r.day}</td>
                      <td style={td}>{THAI_LABEL_5[r.dayEl]}</td>
                      <td style={td}>{r.score > 0 ? "✅ " : "💛 "}{r.relationTh} ({r.score > 0 ? "+" : ""}{r.score})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ ...p, fontSize: "0.78rem", opacity: 0.75 }}>⚠️ {CAT_DAY_COLOR_CAVEAT}</p>
            <p style={{ ...p, fontSize: "0.78rem", opacity: 0.75 }}>{CAT_ELEMENT_NOTE}</p>
          </section>
        )}

        <section style={card}>
          <h2 style={h2}>คำถามที่พบบ่อย</h2>
          {faq.map((f) => (
            <div key={f.q} style={{ marginBottom: "0.6rem" }}>
              <p style={{ ...p, fontWeight: 700, margin: "0.2rem 0" }}>{f.q}</p>
              <p style={{ ...p, margin: "0.1rem 0" }}>{f.a}</p>
            </div>
          ))}
        </section>

        <section style={card}>
          <h2 style={h2}>แมวมงคลชนิดอื่น</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {related.map((r) => (
              <Link key={r.slug} href={`/cat/${encodeURIComponent(r.slug)}`} style={{ ...chip, textDecoration: "none", color: "#1d1812" }}>
                {r.nameTh}{r.aliasTh ? ` (${r.aliasTh.split(" / ")[0]})` : ""}
              </Link>
            ))}
          </div>
          <p style={{ ...p, marginTop: "0.7rem" }}>
            <Link href="/cat" style={{ color: "#96700a" }}>← ดูดวงแมวทั้ง 17 ชนิด</Link>
            {" · "}
            <Link href="/cat/lost" style={{ color: "#96700a" }}>แมวหาย? วางแผนตามหา →</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
