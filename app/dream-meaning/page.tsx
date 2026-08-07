// หน้ารวม "ทำนายฝัน" (hub) — เป้าคีย์เวิร์ดหลัก "ทำนายฝัน" (274k/เดือน KD 23)
// static ล้วน ฿0 · ลิงก์ไปหน้าสัญลักษณ์รายตัวทั้งหมด (internal linking ให้ crawler ไต่ครบ)

import type { Metadata } from "next";
import Link from "next/link";
import MascotLogo from "@/app/_components/MascotLogo";
import { dreamSeoByCategory, dreamSeoEntries } from "@/lib/dream/seo";

export const metadata: Metadata = {
  title: "ทำนายฝัน ตามตำราธาตุ — ค้นความหมายความฝันรายสัญลักษณ์",
  description:
    "ทำนายฝันจากฐานสัญลักษณ์ความฝันพร้อมธาตุประจำสัญลักษณ์ อักษรจีนคังซี และแนวทางคลี่คลายตามตำรา " +
    "เลือกสิ่งที่ฝันเห็นเพื่อดูความหมาย หรือเล่าฝันทั้งฉากให้ระบบอ่านให้ทีเดียว",
  alternates: { canonical: "/dream-meaning" },
};

export default function DreamMeaningHub() {
  const groups = dreamSeoByCategory();
  const total = dreamSeoEntries().length;

  return (
    <main className="tone-marble" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1.2rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "1rem" }}>
          <MascotLogo size={90} />
          <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.55rem", margin: "0.4rem 0 0.3rem" }}>
            ทำนายฝัน ตามตำราธาตุ
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-dim)", lineHeight: 1.6 }}>
            ค้นความหมายความฝันได้ {total} สัญลักษณ์ — แต่ละสัญลักษณ์มีธาตุประจำตัว อักษรจีนคังซี
            และแนวทางคลี่คลายตามหลักธาตุ
          </p>
        </header>

        <section style={{ ...card, background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}>
          <h2 style={h2}>ฝันเป็นเรื่องยาว ไม่ใช่คำเดียว?</h2>
          <p style={p}>
            ความฝันจริงมักมีหลายอย่างในฉากเดียว — คนหนึ่งคน สัตว์หนึ่งตัว สถานที่หนึ่งแห่ง
            และเหตุการณ์ที่เปลี่ยนไประหว่างเรื่อง เล่าทั้งฉากให้อาจารย์ลาลาอ่านให้ ระบบจะจับทุกสัญลักษณ์
            ที่อยู่ในเรื่อง เทียบกับธาตุประจำวันที่ฝัน แล้วสรุปเป็นคำทำนายเดียว
          </p>
          <Link href="/dream" style={cta}>
            🌙 เล่าฝันของคุณ (ทดลองฟรี)
          </Link>
        </section>

        <article style={{ fontSize: "0.88rem", lineHeight: 1.8, color: "#1d1812" }}>
          <h2 style={h2}>ทำนายฝันตามหลักธาตุ อ่านอย่างไร</h2>
          <p style={p}>
            ระบบนี้ไม่ได้ตีความฝันด้วยความรู้สึก แต่ให้ทุกสัญลักษณ์มี <b>ธาตุประจำตัว</b> (ไฟ ดิน ทอง น้ำ ไม้)
            แล้วดูว่าธาตุนั้นไปพบกับ <b>ธาตุประจำวันที่ฝัน</b> อย่างไร — ถ้าธาตุตรงกัน ความหมายจะเข้มข้นขึ้น
            ถ้าเป็นธาตุที่ก่อเกิดกัน แปลว่ามีแรงหนุน ถ้าเป็นธาตุที่พิฆาตกัน แปลว่ามีแรงต้านให้ระวัง
          </p>
          <h2 style={h2}>ทำไมถึงมีอักษรจีนและจำนวนขีด</h2>
          <p style={p}>
            แต่ละสัญลักษณ์ผูกกับอักษรจีนตามระบบคังซี จำนวนขีดของอักษรถูกใช้เป็นรหัสเชิงสัญลักษณ์
            สำหรับเชื่อมโยงความหมาย — เป็นเลขจากการนับจริงในตำรา ไม่ใช่คำแนะนำการเสี่ยงโชค
          </p>
          <h2 style={h2}>แนวทางคลี่คลายคืออะไร</h2>
          <p style={p}>
            หลักที่ตำราใช้คือไม่ปะทะกลับ แต่ผ่อนพลังของสิ่งที่ฝันให้ไหลไปเป็นการเติบโต ผ่าน
            &ldquo;ธาตุเชื่อม&rdquo; คือธาตุที่สัญลักษณ์นั้นให้กำเนิด บางสัญลักษณ์มีพิธีระบุไว้ในตำราโดยตรง
            ทั้งฝั่งไทย จีน และฮินดู — ทั้งหมดเป็นความเชื่อสำหรับการตั้งสติ ไม่ใช่คำรับประกันผล
          </p>
        </article>

        {groups.map((g) => (
          <section key={g.category} style={card}>
            <h2 style={h2}>
              {g.category} <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>({g.entries.length})</span>
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
              {g.entries.map((e) => (
                <Link key={e.slug} href={`/dream-meaning/${encodeURIComponent(e.slug)}`} style={chipLink}>
                  ฝันเห็น{e.name}
                </Link>
              ))}
            </div>
          </section>
        ))}
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
  margin: "0.9rem 0 0.35rem",
};
const p: React.CSSProperties = { fontSize: "0.88rem", lineHeight: 1.75, margin: "0.3rem 0" };
const chipLink: React.CSSProperties = {
  fontSize: "0.8rem",
  padding: "0.25rem 0.65rem",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--gold) 14%, transparent)",
  textDecoration: "none",
  color: "#1d1812",
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
