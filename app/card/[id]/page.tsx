// หน้าแชร์การ์ดสาธารณะ /card/<00-99> (เฟส 2 — 1 ส.ค. 2569)
//
// 🔴 ความเป็นส่วนตัว: หน้านี้มีแค่ข้อมูลการ์ดจากฐานความรู้สาธารณะ (master_energy_cards
//    เปิดอ่านทุกคนตาม migration 017) — URL คือเลขการ์ดล้วน **ไม่ผูกกับบุคคล ไม่มีวันเกิด/ชื่อ**
// เป้าหมาย: ปลายทางของลิงก์แชร์ → ชวนคนที่กดเข้ามาไปหาการ์ดของตัวเอง (viral loop)

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isValidCardId } from "@/lib/share";
import { cardImageUrl } from "@/lib/cards";
import MascotLogo from "@/app/_components/MascotLogo";

interface CardRow {
  energy_id: string;
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
}

// อ่านด้วย anon key — ตารางเปิดสาธารณะอยู่แล้ว ไม่ต้องใช้ service role
async function fetchCard(id: string): Promise<CardRow | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("master_energy_cards")
    .select("energy_id, energy_name, core_essence, archetype_figure")
    .eq("energy_id", id)
    .maybeSingle();
  return (data as CardRow) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isValidCardId(id)) return { title: "LaLa Lucky Chat" };
  const card = await fetchCard(id);
  const name = card?.energy_name ?? `การ์ดพลังงาน ${id}`;
  const title = `การ์ดพลังงาน ${id} — ${name} | LaLa Lucky Chat`;
  const description = card?.core_essence ?? "ค้นหาการ์ดพลังงานประจำตัวของคุณ — คำนวณจริงจากวันเกิด";
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CardSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidCardId(id)) notFound();
  const card = await fetchCard(id);
  if (!card) notFound();

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
      <div className="gold-frame" style={{ width: "100%", maxWidth: 420 }}>
        <div className="gold-frame-inner" style={{ padding: "1.6rem 1.2rem 1.4rem" }}>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", margin: 0 }}>การ์ดพลังงานหมายเลข {card.energy_id}</p>
          {/* รูปการ์ดจากฐานความรู้สาธารณะ (Supabase Storage) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImageUrl(card.energy_id)}
            alt={card.energy_name ?? `การ์ด ${card.energy_id}`}
            style={{ width: 190, maxWidth: "70%", margin: "0.8rem auto 0.4rem", display: "block", filter: "drop-shadow(0 8px 16px rgba(110,82,16,0.25))" }}
          />
          <h1 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.6rem", color: "var(--gold)", margin: "0.3rem 0 0" }}>
            {card.energy_name ?? "การ์ดพลังงาน"}
          </h1>
          {card.archetype_figure && (
            <p style={{ color: "var(--ink-dim)", fontSize: "0.88rem", marginTop: "0.25rem" }}>ต้นแบบ: {card.archetype_figure}</p>
          )}
          {card.core_essence && (
            <p style={{ lineHeight: 1.7, fontSize: "0.95rem", marginTop: "0.7rem" }}>{card.core_essence}</p>
          )}
        </div>
      </div>

      <MascotLogo size={110} />
      <p style={{ fontFamily: "var(--font-sans-thai)", color: "var(--ink-dim)", fontSize: "0.92rem", margin: 0 }}>
        อยากรู้ว่าการ์ดประจำตัวของคุณคือใบไหน?
      </p>
      <Link
        href="/login?next=/onboarding"
        style={{
          fontFamily: "var(--font-sans-thai)",
          color: "#fffdf8",
          background: "linear-gradient(135deg, #c9992a, var(--gold) 60%, #96700a)",
          border: "1px solid var(--gold)",
          padding: "0.75rem 2rem",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        🐾 ค้นหาการ์ดของฉัน (ฟรี)
      </Link>
      <Link href="/" style={{ color: "var(--gold)", fontSize: "0.85rem", textDecoration: "underline" }}>
        LaLa Lucky Chat — ดูดวงที่ &ldquo;คำนวณจริง&rdquo;
      </Link>
    </main>
  );
}
