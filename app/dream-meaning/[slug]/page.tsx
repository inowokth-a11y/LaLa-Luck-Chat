// หน้า SEO รายสัญลักษณ์ "ทำนายฝัน" (เฟส 2 — 7 ส.ค. 2569)
//
// static ทั้งหมด (generateStaticParams) · ต้นทุน ฿0 ไม่เรียก AI ไม่เรียก DB
// เนื้อหาทุกบรรทัดมาจากฐานสัญลักษณ์จริง + ตำราแก้เคล็ด + สูตรธาตุที่ผ่าน golden test
// (ตารางรายวันคำนวณจากวงจรกำเนิด/พิฆาตชุดเดียวกับที่ใช้ในคำทำนายจริง — ไม่ได้เขียนบรรยายลอยๆ)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MascotLogo from "@/app/_components/MascotLogo";
import {
  dreamSeoEntries,
  dreamSeoEntry,
  relatedEntries,
  DREAM_SEO_NUMBER_NOTE,
  dayRelationText,
  type DreamSeoEntry,
} from "@/lib/dream/seo";
import { elementKeyFromThai, KAEKLED_CAVEAT } from "@/lib/engine/kaekled";
import { DAY_ELEMENT, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { DAY_STAR_NUMBER } from "@/lib/engine/dream-energy";

export const dynamicParams = false;

export function generateStaticParams() {
  return dreamSeoEntries().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = dreamSeoEntry(decodeURIComponent(slug));
  if (!e) return { title: "ไม่พบสัญลักษณ์" };
  const alias = e.aliases.length ? ` (${e.aliases.join(" / ")})` : "";
  return {
    title: `ฝันเห็น${e.name} หมายถึงอะไร — ทำนายฝัน${e.name} ตามตำราธาตุ`,
    description:
      `ฝันเห็น${e.name} ฝันว่า${e.name} ฝันถึง${e.name}${alias} หมายถึงอะไร — ตามฐานสัญลักษณ์ความฝัน: ธาตุ${e.element} ` +
      `${e.kangxiChar ? `อักษรจีน ${e.kangxiChar} ${e.kangxiStrokes} ขีด ` : ""}` +
      `ความหมาย ${e.meaning} พร้อมหลักการอ่านตามวันที่ฝันและแนวทางคลี่คลายตามหลักธาตุ`,
    alternates: { canonical: `/dream-meaning/${encodeURIComponent(e.slug)}` },
  };
}

/** ความสัมพันธ์ระหว่างธาตุประจำวันกับธาตุของสัญลักษณ์ — คำนวณด้วย engine ตัวจริง */
function dayRows(symbolEl: Element5 | null) {
  return Object.entries(DAY_STAR_NUMBER).map(([day, star]) => {
    const dayEl = DAY_ELEMENT[day] as Element5 | undefined;
    if (!dayEl || !symbolEl) return { day, star, dayEl: dayEl ?? null, note: "—" };
    return { day, star, dayEl, note: dayRelationText(dayEl, symbolEl) };
  });
}

export default async function DreamMeaningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = dreamSeoEntry(decodeURIComponent(slug));
  if (!entry) notFound();
  const symbolEl = elementKeyFromThai(entry.element);
  const rows = dayRows(symbolEl);
  const related = relatedEntries(entry);
  const keywords = entry.meaning.split(",").map((s) => s.trim()).filter(Boolean);

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `ฝันเห็น${entry.name} หมายถึงอะไร`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `ตามฐานสัญลักษณ์ความฝัน ${entry.name} จัดอยู่ในหมวด${entry.category} ธาตุ${entry.element} มีความหมายเชื่อมโยงกับ ${entry.meaning}`,
        },
      },
      {
        "@type": "Question",
        name: `ฝันว่า${entry.name} กับ ฝันถึง${entry.name} ต่างกันไหม`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `ทั้งสองแบบใช้สัญลักษณ์เดียวกันคือ ${entry.name} (ธาตุ${entry.element}) สิ่งที่ทำให้ความหมายต่างกันคือรายละเอียดของฉากในฝันและวันที่ฝัน ไม่ใช่คำที่ใช้เล่า`,
        },
      },
      {
        "@type": "Question",
        name: `ฝันเห็น${entry.name} ควรทำอย่างไร`,
        acceptedAnswer: {
          "@type": "Answer",
          text: entry.remedy
            ? `หลักการคือผ่อนพลังของสัญลักษณ์ให้ไหลไปเป็นการเติบโต ด้วยธาตุ${entry.remedy.ธาตุเชื่อม} เช่น ${entry.remedy.แนวทางไทย ?? entry.remedy.กิจกรรมเปลี่ยนพลัง} (เป็นความเชื่อตามตำรา ไม่ใช่คำรับประกันผล)`
            : `พิจารณาความหมายร่วมกับบริบทของฉากในฝันและวันที่ฝัน`,
        },
      },
    ],
  };

  return (
    <main className="tone-marble" style={{ minHeight: "100vh", padding: "1.2rem 1rem 4rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "1rem" }}>
          <MascotLogo size={80} />
          <p style={{ fontSize: "0.78rem", opacity: 0.7, margin: "0.3rem 0 0" }}>
            <Link href="/dream-meaning" style={{ color: "var(--gold)" }}>
              ทำนายฝัน
            </Link>{" "}
            › {entry.category}
          </p>
          <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.5rem", margin: "0.3rem 0" }}>
            ฝันเห็น{entry.name} หมายถึงอะไร
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-dim)" }}>
            ฝันว่า{entry.name} · ฝันถึง{entry.name}
            {entry.aliases.length > 0 ? ` · เรียกอีกอย่างว่า ${entry.aliases.join(" · ")}` : ""}
          </p>
        </header>

        <section style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.7rem" }}>
            <span style={chip}>หมวด {entry.category}</span>
            <span style={chip}>ธาตุ{entry.element}</span>
            {entry.kangxiChar && (
              <span style={chip}>
                {entry.kangxiChar} · {entry.kangxiStrokes} ขีด
              </span>
            )}
          </div>
          <h2 style={h2}>ความหมายตามฐานสัญลักษณ์</h2>
          <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.9 }}>
            {keywords.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>

        {entry.shapeMeaning && (
          <section style={card}>
            <h2 style={h2}>อ่านจากรูปลักษณ์ของ{entry.name}</h2>
            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.9 }}>
              {entry.shapeMeaning
                .split(";")
                .map((x) => x.trim())
                .filter(Boolean)
                .map((x) => (
                  <li key={x}>{x}</li>
                ))}
            </ul>
          </section>
        )}

        <section style={card}>
          <h2 style={h2}>ฝันวันไหน ให้ผลต่างกันอย่างไร</h2>
          <p style={p}>
            ตำราไทยถือว่าแต่ละวันมีธาตุประจำวันของตัวเอง เมื่อธาตุของสัญลักษณ์ไปพบกับธาตุประจำวันที่ฝัน
            ความหมายจะถูกขับให้เข้มขึ้นหรือผ่อนลงต่างกัน ตารางนี้คำนวณจากหลักเบญจธาตุชุดเดียวกับที่ระบบใช้ทำนายจริง
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", minWidth: 360 }}>
              <thead>
                <tr>
                  <th style={th}>วันที่ฝัน</th>
                  <th style={th}>ธาตุประจำวัน</th>
                  <th style={th}>ผลต่อสัญลักษณ์นี้</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day}>
                    <td style={td}>
                      วัน{r.day} <span style={{ opacity: 0.6 }}>(ดาว {r.star})</span>
                    </td>
                    <td style={td}>{r.dayEl ? THAI_LABEL_5[r.dayEl] : "—"}</td>
                    <td style={td}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {entry.kangxiStrokes || entry.numbers ? (
          <section style={card}>
            <h2 style={h2}>รหัสเชิงสัญลักษณ์</h2>
            {entry.kangxiStrokes ? (
              <p style={p}>
                สัญลักษณ์นี้ผูกกับอักษรจีน <b>{entry.kangxiChar}</b> ซึ่งมี <b>{entry.kangxiStrokes} ขีด</b> ตามระบบคังซี
              </p>
            ) : null}
            {/* 🔴 แสดงเฉพาะตัวเลข ตัดศัพท์ใบ้หวย ("เด่น/วิ่ง") ออกตามที่ผู้ใช้ตัดสิน 7 ส.ค. 2569 */}
            {entry.numbers && entry.numbers.คู่.length > 0 && (
              <p style={p}>
                เลขคู่ที่ตำราผูกไว้กับสัญลักษณ์นี้: <b style={{ fontFamily: "var(--font-mono)" }}>{entry.numbers.คู่.join(" · ")}</b>
              </p>
            )}
            {entry.numbers && entry.numbers.หลักเดี่ยว.length > 0 && (
              <p style={p}>
                เลขหลักเดี่ยวที่เกี่ยวข้อง: <b style={{ fontFamily: "var(--font-mono)" }}>{entry.numbers.หลักเดี่ยว.join(" · ")}</b>
              </p>
            )}
            <p style={{ ...p, fontSize: "0.78rem", opacity: 0.7 }}>{DREAM_SEO_NUMBER_NOTE}</p>
          </section>
        ) : null}

        {entry.remedy && (
          <section style={card}>
            <h2 style={h2}>แนวทางคลี่คลาย</h2>
            <p style={p}>
              หลักที่ตำราใช้คือ <b>ไม่ปะทะกลับ แต่ผ่อนพลังให้ไหลต่อ</b> — ธาตุ{entry.element}ของสัญลักษณ์นี้
              ผ่อนออกได้ด้วยธาตุ<b>{entry.remedy.ธาตุเชื่อม}</b>
            </p>
            {entry.remedy.source === "ตำราแก้เคล็ด" ? (
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.9 }}>
                {entry.remedy.แนวทางไทย && <li>แนวทางไทย: {entry.remedy.แนวทางไทย}</li>}
                {entry.remedy.แนวทางจีน && <li>แนวทางจีน: {entry.remedy.แนวทางจีน}</li>}
                {entry.remedy.แนวทางฮินดู && <li>แนวทางฮินดู: {entry.remedy.แนวทางฮินดู}</li>}
                {entry.remedy.บทสวด && <li>บทสวดที่ตำราระบุ: {entry.remedy.บทสวด.ชื่อ}</li>}
              </ul>
            ) : (
              <p style={p}>
                แนวทางตามหลักธาตุ: {entry.remedy.กิจกรรมเปลี่ยนพลัง} · เสริมด้วยสี
                {entry.remedy.สีเสริมธาตุเชื่อม.join(" / ")}
                <br />
                <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>
                  (สัญลักษณ์นี้ยังไม่มีพิธีเฉพาะระบุไว้ในตำราแก้เคล็ด จึงใช้หลักธาตุเดียวกับที่ตำราใช้)
                </span>
              </p>
            )}
            <p style={{ ...p, fontSize: "0.78rem", opacity: 0.7 }}>{KAEKLED_CAVEAT}</p>
          </section>
        )}

        <section style={{ ...card, background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}>
          <h2 style={h2}>อยากรู้ว่าฝันของคุณหมายถึงอะไรกันแน่?</h2>
          <p style={p}>
            หน้านี้บอกความหมายของสัญลักษณ์เดี่ยว แต่ความฝันจริงมักมีหลายอย่างในฉากเดียว —
            เล่าฝันทั้งฉากให้อาจารย์ลาลาอ่านให้ ระบบจะจับทุกสัญลักษณ์ที่อยู่ในเรื่อง
            เทียบกับธาตุประจำวันที่ฝัน แล้วสรุปให้เป็นคำทำนายเดียว
          </p>
          <Link href="/dream" style={cta}>
            🌙 เล่าฝันของคุณ (ทดลองฟรี)
          </Link>
        </section>

        <section style={card}>
          <h2 style={h2}>สัญลักษณ์ใกล้เคียง</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.4rem" }}>
            {related.map((r: DreamSeoEntry) => (
              <Link key={r.slug} href={`/dream-meaning/${encodeURIComponent(r.slug)}`} style={chipLink}>
                ฝันเห็น{r.name}
              </Link>
            ))}
          </div>
          <p style={{ marginTop: "0.8rem" }}>
            <Link href="/dream-meaning" style={{ color: "var(--gold)", fontWeight: 700 }}>
              ดูสัญลักษณ์ทั้งหมด →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)",
  borderRadius: 12,
  padding: "0.9rem 1rem",
  marginBottom: "0.9rem",
  color: "#1d1812",
};
const h2: React.CSSProperties = {
  fontFamily: "var(--font-serif-thai)",
  fontSize: "1.05rem",
  color: "var(--gold)",
  margin: "0 0 0.35rem",
};
const p: React.CSSProperties = { fontSize: "0.88rem", lineHeight: 1.75, margin: "0.3rem 0" };
const chip: React.CSSProperties = {
  fontSize: "0.78rem",
  padding: "0.2rem 0.6rem",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--gold) 14%, transparent)",
};
const chipLink: React.CSSProperties = { ...chip, textDecoration: "none", color: "#1d1812" };
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "0.35rem 0.4rem",
  borderBottom: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)",
  fontWeight: 700,
};
const td: React.CSSProperties = {
  padding: "0.35rem 0.4rem",
  borderBottom: "1px solid color-mix(in srgb, var(--gold) 18%, transparent)",
  verticalAlign: "top",
};
const cta: React.CSSProperties = {
  display: "inline-block",
  marginTop: "0.4rem",
  padding: "0.6rem 1.1rem",
  borderRadius: 10,
  background: "var(--gold)",
  color: "#faf7f0",
  fontWeight: 700,
  textDecoration: "none",
};
