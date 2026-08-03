// หน้าแชร์การ์ดสาธารณะ /card/<00-99> (เฟส 2 — 1 ส.ค. 2569)
//
// 🔴 ความเป็นส่วนตัว: หน้านี้มีแค่ข้อมูลการ์ดจากฐานความรู้สาธารณะ (master_energy_cards
//    เปิดอ่านทุกคนตาม migration 017) — URL คือเลขการ์ดล้วน **ไม่ผูกกับบุคคล ไม่มีวันเกิด/ชื่อ**
// เป้าหมาย: ปลายทางของลิงก์แชร์ → ชวนคนที่กดเข้ามาไปหาการ์ดของตัวเอง (viral loop)

import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { isValidCardId, figureCategoryLabel } from "@/lib/share";
import { isValidCode } from "@/lib/affiliate/code";
import { cardImageUrl } from "@/lib/cards";
import MascotLogo from "@/app/_components/MascotLogo";

interface CardRow {
  energy_id: string;
  energy_name: string | null;
  core_essence: string | null;
  archetype_figure: string | null;
  figure_bio: string | null;
  figure_category: string | null;
}

// อ่านด้วย anon key — ตารางเปิดสาธารณะอยู่แล้ว ไม่ต้องใช้ service role
async function fetchCard(id: string): Promise<CardRow | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("master_energy_cards")
    .select("energy_id, energy_name, core_essence, archetype_figure, figure_bio, figure_category")
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
  // ชูบุคคลต้นแบบใน description — จุดดึงความสนใจตอนลิงก์ถูกแชร์ (ข้อมูลการ์ดสาธารณะล้วน)
  const description = card?.archetype_figure
    ? `คุณมีต้นแบบเดียวกับ ${card.archetype_figure} — ${card.core_essence ?? "ค้นหาการ์ดพลังงานประจำตัวของคุณ"}`
    : card?.core_essence ?? "ค้นหาการ์ดพลังงานประจำตัวของคุณ — คำนวณจริงจากวันเกิด";
  return {
    title,
    description,
    // 🔴 noindex โดยเจตนา (SEO 3 ส.ค. 2569): หน้านี้ redirect คนจริงไปหน้าแรก เสิร์ฟเนื้อหา
    // เฉพาะ social crawler — ถ้าให้ Google index จะเป็น cloaking (bot เห็นเนื้อหา คนเห็น redirect)
    // เสี่ยงโทษทั้งโดเมน · ถ้าจะใช้การ์ด 100 ใบเป็นหน้า SEO ต้องเลิก redirect ก่อน (ถามผู้ใช้)
    robots: { index: false, follow: false },
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

// crawler ของโซเชียล (มาเก็บ OG) — คนจริงถูกส่งไปหน้าแรกเพื่อเริ่มคำทำนาย (ผู้ใช้สั่ง 3 ส.ค. 2569:
// "กดการ์ดที่แชร์แล้วเข้าหน้าแรก" — เรื่องราวการ์ดเล่าจบในภาพ OG แล้ว)
// ⚠️ ห้ามใส่ "line" เดี่ยวๆ — เบราว์เซอร์ในแอป LINE ของคนจริงมี "Line/" ใน UA
//    ตัวเก็บพรีวิวของ LINE จริงๆ ใช้ "line-poker" (และบางทีมาในนาม facebookexternalhit)
const CRAWLER_RE = /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|line-poker|pinterest|vkshare|quora|embedly|preview/i;

export default async function CardSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isValidCardId(id)) notFound();

  const ua = (await headers()).get("user-agent") ?? "";
  if (!CRAWLER_RE.test(ua)) {
    // การ์ดที่แชร์โดยผู้ใช้ที่มาจากลิงก์พันธมิตรพก ?ref=CODE มาด้วย — ส่งต่อไปหน้าแรก
    // พร้อมธง via=share ให้ RefTracker นับเป็น "เปิดจากแชร์ต่อ" (เลเยอร์การแชร์ 3 ส.ค. 2569)
    const sp = await searchParams;
    const ref = typeof sp.ref === "string" ? sp.ref : undefined;
    redirect(ref && isValidCode(ref) ? `/?ref=${encodeURIComponent(ref)}&via=share` : "/");
  }
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
          {card.core_essence && (
            <p style={{ lineHeight: 1.7, fontSize: "0.95rem", marginTop: "0.7rem" }}>{card.core_essence}</p>
          )}
        </div>
      </div>

      {/* บุคคลต้นแบบ + เรื่องราวสั้น (figure_bio จาก §3.7) — จุดดึงความสนใจของหน้าแชร์ */}
      {card.archetype_figure && (
        <div className="gold-frame" style={{ width: "100%", maxWidth: 420 }}>
          <div className="gold-frame-inner" style={{ padding: "1.2rem 1.2rem 1.1rem", textAlign: "left" }}>
            <p style={{ color: "var(--ink-dim)", fontSize: "0.8rem", margin: 0 }}>✨ ผู้ถือการ์ดใบนี้มีต้นแบบเดียวกับ</p>
            <p style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.15rem", color: "var(--gold)", margin: "0.25rem 0 0", fontWeight: 700 }}>
              {card.archetype_figure}
            </p>
            {figureCategoryLabel(card.figure_category) && (
              <p style={{ display: "inline-block", fontSize: "0.72rem", color: "var(--ink-dim)", border: "1px solid var(--gold-dim, #cbb98f)", borderRadius: 999, padding: "0.12rem 0.6rem", margin: "0.45rem 0 0" }}>
                {figureCategoryLabel(card.figure_category)}
              </p>
            )}
            {card.figure_bio && (
              <p style={{ lineHeight: 1.75, fontSize: "0.9rem", marginTop: "0.6rem", marginBottom: 0 }}>{card.figure_bio}</p>
            )}
          </div>
        </div>
      )}

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
