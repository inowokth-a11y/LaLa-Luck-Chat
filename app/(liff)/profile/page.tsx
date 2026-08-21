"use client";

// Logic 1 — โปรไฟล์พลังงานส่วนบุคคล
// พอร์ตจาก legacy-artifacts/intake_form.html
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้านี้เป็น "ข้อมูล/ผลลัพธ์ถาวร"

import { useEffect, useRef, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import { computeCardIdString, thaiDayOfWeek } from "@/lib/engine/card-id";
import { calculateElementSeed, THAI_LABEL_4, type ElementSeedResult } from "@/lib/engine/element";
import { cardImageUrl } from "@/lib/cards";
import { supabase } from "@/lib/supabase/client";
import styles from "./profile.module.css";
import FunctionChat from "../_components/FunctionChat";
import ShareCard from "../_components/ShareCard";
import FaceCardStudio from "../_components/FaceCardStudio";
import { useStoredProfile } from "../_components/useStoredProfile";

interface CardRow {
  energy_id: string;
  energy_name: string;
  core_essence: string | null;
  archetype_figure: string | null;
  figure_bio: string | null;
  figure_category: string | null;
  figure_bio_verified: boolean | null;
}

const ZODIAC_ANIMALS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];

/** ปีนักษัตรจากปี ค.ศ. (พ.ศ. 2563 = ชวด → ค.ศ. 2020 % 12 === 4) */
function zodiacAnimalFromYear(yearAd: number): string {
  return ZODIAC_ANIMALS[(((yearAd - 2020) % 12) + 12) % 12];
}

const CATEGORY_NOTE: Record<string, string> = {
  role_title: "⚠️ เป็น “ตำแหน่ง/บทบาท” ไม่ใช่บุคคลคนเดียว",
  fictional: "⚠️ เป็นตัวละครในวรรณกรรม ไม่ใช่บุคคลจริง",
  mythological: "เป็นบุคคลในเทพปกรณัม",
  legendary: "เป็นบุคคลกึ่งตำนาน",
  religious: "เป็นศาสดา/บุคคลสำคัญทางศาสนา",
  historical: "เป็นบุคคลในประวัติศาสตร์",
};

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [autoInvite, setAutoInvite] = useState(false);
  const autoRan = useRef(false);

  // เติมข้อมูลจากโปรไฟล์ที่ผู้ใช้กรอกไว้ (ไม่ทับค่าที่ผู้ใช้พิมพ์เองแล้ว)
  const { profile } = useStoredProfile();
  // guest (anonymous) ไหม — ใช้โชว์ CTA ผูกบัญชีหลังได้คำทำนาย
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    import("@/lib/supabase/auth-browser").then(({ createSupabaseBrowser }) =>
      createSupabaseBrowser().auth.getUser().then(({ data }) => setIsGuest(Boolean(data.user?.is_anonymous)))
    ).catch(() => {});
  }, []);
  useEffect(() => {
    if (!profile) return;
    let did = false;
    if (profile.first_name) setFirstName((v) => (v ? v : ((did = true), profile.first_name!)));
    if (profile.last_name) setLastName((v) => (v ? v : ((did = true), profile.last_name!)));
    if (profile.birth_date) setBirthDate((v) => (v ? v : ((did = true), profile.birth_date!)));
    if (profile.birth_time) setBirthTime((v) => (v ? v : ((did = true), profile.birth_time!)));
    if (did) setPrefilled(true);
  }, [profile]);

  // แยกจาก onSubmit เพื่อให้ flow อัตโนมัติหลัง onboarding เรียกได้ (ผู้ใช้ตัดสิน 1 ส.ค. 2569)
  async function runCompute(f = firstName, l = lastName, bd = birthDate, bt = birthTime) {
    setError(null);
    setLoading(true);
    try {
      const year = Number(bd.slice(0, 4));
      const month = Number(bd.slice(5, 7));
      const day = Number(bd.slice(8, 10));

      // ป้องกันข้อมูลเสีย (บทเรียนจาก data-quality report: พ.ศ. ปนเข้ามา)
      if (year > 2400) throw new Error(`ปีเกิดดูเป็น พ.ศ. (${year}) — กรุณากรอกเป็น ค.ศ. เช่น ${year - 543}`);
      const nowYear = new Date().getUTCFullYear();
      if (year < 1900 || year > nowYear) throw new Error(`ปีเกิด ${year} อยู่นอกช่วงที่รองรับ (1900-${nowYear})`);

      const id = computeCardIdString({ firstName: f, lastName: l, birthDate: bd, birthTime: bt });
      setCardId(id);

      // Element Seed (Logic 1) — ใช้ 5 แหล่ง; ส่ง birth_day ไปด้วยเพื่อขอบเขตลี่ชุน
      setSeed(
        calculateElementSeed({
          day_of_week: thaiDayOfWeek(bd),
          birth_month: month,
          birth_year_ad: year,
          birth_day: day,
          zodiac_year_animal: zodiacAnimalFromYear(year),
        })
      );

      const { data, error: dbErr } = await supabase
        .from("master_energy_cards")
        .select("energy_id, energy_name, core_essence, archetype_figure, figure_bio, figure_category, figure_bio_verified")
        .eq("energy_id", id)
        .single();
      if (dbErr) throw new Error(`ดึงข้อมูลการ์ดไม่สำเร็จ: ${dbErr.message}`);
      setCard(data as CardRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setCard(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runCompute();
  }

  // flow หลัง onboarding: /profile?auto=1 → คำนวณการ์ดให้เลยจากโปรไฟล์ที่เพิ่งกรอก
  // (อ่าน query จาก window ตรงๆ — เลี่ยง useSearchParams ที่ต้องห่อ Suspense ตามบทเรียน §15)
  useEffect(() => {
    if (autoRan.current || !profile?.birth_date) return;
    if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("auto")) return;
    autoRan.current = true;
    setAutoInvite(true);
    void runCompute(profile.first_name ?? "", profile.last_name ?? "", profile.birth_date, profile.birth_time ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <main className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1>โปรไฟล์พลังงาน</h1>
        <p className={styles.sub}>กรอกข้อมูลเพื่อคำนวณการ์ดพลังงานและธาตุประจำตัว</p>
      </header>

      <form onSubmit={onSubmit} className={styles.panel}>
        {prefilled && (
          <p className={styles.hint} style={{ color: "var(--gold)" }}>
            ✓ เติมข้อมูลจากบัญชีของคุณให้แล้ว — แก้ไขได้ตามต้องการ
          </p>
        )}
        <div className={styles.row}>
          <label className={styles.field}>
            <span>ชื่อ</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>นามสกุล</span>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
        </div>

        <label className={styles.field}>
          <span>วันเกิด (ค.ศ.)</span>
          <input type="date" className="num" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </label>

        <label className={styles.field}>
          <span>เวลาเกิด (ถ้าทราบ)</span>
          <input type="time" className="num" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
          <small className={styles.hint}>ไม่ทราบก็เว้นว่างได้ — จะคำนวณโดยไม่รวมค่าเวลา</small>
        </label>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "กำลังคำนวณ…" : "🔮 คำนวณพลังงาน"}
        </button>

        {error && <p className={styles.error}>⚠️ {error}</p>}
      </form>

      {card && cardId && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>การ์ดพลังงานของคุณ</h2>
          <div className={styles.cardWrap}>
            {/* URL คำนวณจาก env var เสมอ — ห้าม hardcode (CLAUDE.md §1.5) */}
            {/* ใช้ <img> ตั้งใจ ไม่ใช้ next/image เพราะ sharp (ที่ next/image ต้องใช้ตอน production)
                ถูก npm allow-scripts บล็อก postinstall ไว้ — ถ้าอนาคตเปิด sharp ได้ค่อยเปลี่ยน */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardImageUrl(cardId)} alt={card.energy_name} className={styles.cardImg} />
            <div className={styles.cardId}>{cardId}</div>
            <div className={styles.cardName}>{card.energy_name}</div>
            {card.archetype_figure && (
              <div className={styles.figure}>มีลักษณะคล้าย: {card.archetype_figure}</div>
            )}
            {card.core_essence && <p className={styles.essence}>{card.core_essence}</p>}

            {card.figure_bio && (
              <div className={styles.bio}>
                <p>{card.figure_bio}</p>
                <small className={styles.bioNote}>
                  {card.figure_category && CATEGORY_NOTE[card.figure_category]}
                  {card.figure_bio_verified === false && " · ประวัติยังไม่ผ่านการตรวจสอบเชิงลึก"}
                </small>
              </div>
            )}
          </div>
        </section>
      )}

      {seed && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>ธาตุประจำตัว (Element Seed)</h2>
          <p className={styles.seedLead}>
            ธาตุเด่น: <strong>{seed.dominant_th}</strong>
            {seed.missing_th.length > 0 && <> · ธาตุที่ขาด: <strong>{seed.missing_th.join(", ")}</strong></>}
          </p>

          <div className={styles.bars}>
            {(Object.keys(seed.scores) as Array<keyof typeof seed.scores>).map((k) => {
              const v = seed.scores[k];
              return (
                <div key={k} className={styles.barRow}>
                  <span className={styles.barLabel}>{THAI_LABEL_4[k]}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(v / 5) * 100}%`, background: `var(--${k.toLowerCase()})` }}
                    />
                  </div>
                  <span className={`num ${styles.barVal}`}>{v}/5</span>
                </div>
              );
            })}
          </div>

          <details className={styles.trace}>
            <summary>ที่มาของคะแนน ({seed.sources_used.length} แหล่ง)</summary>
            <ul>
              {seed.sources_used.map((s, i) => (
                <li key={i}>
                  <code>{s[0]}</code>: {String(s[1])} → {s[2]}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    
      {/* แชท AI ประจำฟังก์ชัน — ช่วงทดลองถามได้ 2 คำถาม (lib/chat/quota.ts) */}
      {card && cardId && <ShareCard cardId={cardId} cardName={card.energy_name} figure={card.archetype_figure} />}
      {/* face-card เฟส 1: ภาพผู้ใช้ในบทบาทการ์ด (ฟรี 1 ครั้ง/บัญชีถาวร · เจนซ้ำ 40 เครดิต) */}
      {card && cardId && <FaceCardStudio cardId={cardId} cardName={card.energy_name} />}
      {/* guest ได้คำทำนายแล้ว → ชวนผูกบัญชีรับสิทธิ์ฟรีเพิ่ม (ผู้ใช้สั่ง 10 ส.ค. 2569:
          "ทำนายฟรีก่อน แล้วค่อยล็อกอินเพื่อรับสิทธิ์เพิ่ม") — linkIdentity เก็บข้อมูลเดิมไว้ครบ */}
      {card && isGuest && (
        <div
          style={{
            marginTop: "1rem", padding: "0.9rem 1rem", borderRadius: 12,
            background: "color-mix(in srgb, var(--gold) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--gold) 45%, transparent)",
            fontSize: "0.9rem", lineHeight: 1.65,
          }}
        >
          <b>🎁 อยากได้สิทธิ์ฟรีเพิ่มไหมคะ?</b> ผูกบัญชี (ฟรี ไม่กี่วินาที) แล้วรับเพิ่มทันที:
          ทำนายฝันฟรี 1 ครั้ง · เสี่ยงทายฟรี 2 ครั้ง · รางวัลแชร์การ์ด +2 คำถาม — ข้อมูลและการ์ดของคุณไม่หาย
          <div style={{ marginTop: "0.6rem" }}>
            <a
              href="/login?next=/profile"
              style={{
                display: "inline-block", padding: "0.6rem 1.2rem", borderRadius: 10,
                background: "linear-gradient(135deg, #d4a52f, var(--gold) 55%, #8a6608)",
                color: "#fffdf8", fontWeight: 700, textDecoration: "none",
                boxShadow: "0 3px 10px rgba(150, 112, 10, 0.3)",
              }}
            >
              🔗 ผูกบัญชี รับสิทธิ์ฟรีเพิ่ม
            </a>
          </div>
        </div>
      )}

      <FunctionChat
        logicId={1}
        context={card && seed ? { การ์ด: card, ธาตุ: seed, เลขการ์ด: cardId } : null}
        placeholder="เช่น ธาตุที่ขาดควรทำยังไงดี"
        invite={autoInvite ? "ลาลา~ ได้การ์ดประจำตัวของคุณแล้ว! ถามแม่หมอเกี่ยวกับการ์ด/ธาตุของคุณได้ 3 คำถามฟรีเลยค่ะ" : undefined}
        firstReading={autoInvite}
      />

    </main>
  );
}
