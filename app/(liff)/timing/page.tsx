"use client";

// โหมดฤกษ์ (Logic 3) — เลือกงาน + ช่วงวัน → จัดอันดับวันดี/เลี่ยง + ฤกษ์รายชั่วโมง
// คำนวณฝั่ง client ล้วน (กาลโยค+อุบากอง) — ฟรี ฿0 ไม่ใช้ AI · โทนสว่างหินอ่อน (§2)
// 🔴 caveat กาลโยคแสดงทุกครั้ง (§3.6)

import { useEffect, useMemo, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import Link from "next/link";
import { rankAuspiciousDays, ACTIVITIES, ACTIVITY_FIELDS, type DayRanking, type Verdict } from "@/lib/engine/timing";
import { useStoredProfile } from "../_components/useStoredProfile";

const TH_MONTH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function thDate(iso: string, dayTh: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${dayTh} ${d} ${TH_MONTH[m]} ${y + 543}`;
}
const addDays = (base: Date, n: number) => {
  const dt = new Date(base);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};
const VERDICT: Record<Verdict, { label: string; color: string }> = {
  excellent: { label: "ฤกษ์ดีมาก", color: "var(--good,#2f6b3f)" },
  good: { label: "วันดี", color: "var(--gold)" },
  neutral: { label: "กลาง", color: "var(--text-dim,#6b6255)" },
  avoid: { label: "ควรเลี่ยง", color: "var(--bad,#a83a1e)" },
};

export default function TimingPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { profile } = useStoredProfile();
  const [activityKey, setActivityKey] = useState("open_company");
  const [fromISO, setFromISO] = useState(today);
  const [toISO, setToISO] = useState(() => addDays(new Date(), 30));

  // ช่องเสริมรายหมวด (ผู้ใช้สั่ง 22 ส.ค. 2569) — ทุกช่องไม่บังคับ ใส่แล้วแม่นขึ้น
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [businessName, setBusinessName] = useState("");

  // เติมวันเกิดจากบัญชี (กรอกในโหมดอื่นแล้วไม่ต้องกรอกซ้ำ) — เฉพาะช่องที่ยังว่าง
  useEffect(() => {
    if (profile?.birth_date && !birthDate) {
      setBirthDate(profile.birth_date);
      setPrefilled(true);
    }
    if (profile?.birth_time && !birthTime) setBirthTime(profile.birth_time.slice(0, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const activity = ACTIVITIES.find((a) => a.key === activityKey)!;
  const fields = ACTIVITY_FIELDS[activityKey] ?? {};
  const { days, caveat } = useMemo(
    () =>
      rankAuspiciousDays({
        fromISO,
        toISO,
        emphasis: activity.emphasis,
        birthDate: birthDate || null,
        partnerBirthDate: fields.partnerBirthDate ? partnerBirthDate || null : null,
        refNumber: fields.refLabel ? refNumber || null : null,
        refLabel: activityKey === "housewarming" ? "บ้าน" : "รถ",
        activityKey,
        birthTime: birthTime || null,
        businessName: fields.businessName ? businessName || null : null,
      }),
    [fromISO, toISO, activity.emphasis, birthDate, birthTime, partnerBirthDate, refNumber, businessName, fields.partnerBirthDate, fields.refLabel, fields.businessName, activityKey]
  );

  const recommended = days.filter((d) => d.score > 0).slice(0, 12);
  const avoid = days.filter((d) => d.verdict === "avoid").slice(0, 8);

  const S = styles;
  return (
    <main className="tone-marble" style={S.page}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1 style={S.h1}>หาฤกษ์ดี</h1>
        <p style={S.sub}>เลือกงานที่จะทำ + ช่วงวันที่ — ระบบจัดอันดับวันดีและฤกษ์รายชั่วโมงให้ (คำนวณจากกาลโยค + อุบากอง)</p>
      </header>

      <div style={S.form}>
        <div>
          <span style={S.label}>ทำอะไร</span>
          <div style={S.chips}>
            {ACTIVITIES.map((a) => (
              <button key={a.key} type="button" onClick={() => setActivityKey(a.key)} style={{ ...S.chip, ...(a.key === activityKey ? S.chipActive : {}) }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <label style={S.field}><span style={S.label}>ตั้งแต่</span><input type="date" value={fromISO} min={today} onChange={(e) => setFromISO(e.target.value)} style={S.input} /></label>
          <label style={S.field}><span style={S.label}>ถึง</span><input type="date" value={toISO} min={fromISO} onChange={(e) => setToISO(e.target.value)} style={S.input} /></label>
        </div>

        {/* ช่องเสริมรายหมวด — ใส่แล้วรวมชั้นดวงส่วนตัว (กาลกิณี+ธาตุประจำวัน) และธาตุของสิ่งที่เกี่ยวข้อง */}
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <label style={S.field}>
            <span style={S.label}>วันเกิดของคุณ ไม่บังคับ — ใส่แล้วเช็คกาลกิณี+ธาตุให้ด้วย{prefilled ? " · ✓ จากบัญชี" : ""}</span>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>เวลาเกิด ไม่บังคับ — ใส่แล้วเช็ครอยต่อยุคชีวิตให้ด้วย</span>
            <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} style={S.input} />
          </label>
          {fields.partnerBirthDate && (
            <label style={S.field}>
              <span style={S.label}>วันเกิดคู่เจรจา (ถ้าทราบ)</span>
              <input type="date" value={partnerBirthDate} onChange={(e) => setPartnerBirthDate(e.target.value)} style={S.input} />
            </label>
          )}
          {fields.refLabel && (
            <label style={S.field}>
              <span style={S.label}>{fields.refLabel} — ไม่บังคับ</span>
              <input type="text" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="เช่น 47 / จง 6266" style={S.input} />
            </label>
          )}
          {fields.businessName && (
            <label style={S.field}>
              <span style={S.label}>ชื่อบริษัท/ร้าน (ถ้าตั้งแล้ว) — เช็คธาตุชื่อกับธาตุวัน</span>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="เช่น รุ่งเรืองการค้า" style={S.input} />
            </label>
          )}
        </div>
      </div>

      <section>
        <h2 style={S.h2}>วันแนะนำสำหรับ &ldquo;{activity.label}&rdquo;</h2>
        {recommended.length === 0 ? (
          <p style={S.note}>ช่วงที่เลือกไม่มีวันที่เด่นชัด — ลองขยายช่วงวัน หรือดูวันที่ควรเลี่ยงด้านล่างประกอบ</p>
        ) : (
          <div style={S.list}>{recommended.map((d) => <DayCard key={d.dateISO} d={d} />)}</div>
        )}
      </section>

      {avoid.length > 0 && (
        <details>
          <summary style={{ ...S.h2, cursor: "pointer" }}>วันที่ควรเลี่ยง ({avoid.length})</summary>
          <div style={{ ...S.list, marginTop: "0.6rem" }}>{avoid.map((d) => <DayCard key={d.dateISO} d={d} />)}</div>
        </details>
      )}

      <p style={S.caveat}>⚠️ {caveat}</p>
      <Link href="/chat" style={{ ...S.note, color: "var(--gold)" }}>← กลับไปแชท</Link>
    </main>
  );
}

function DayCard({ d }: { d: DayRanking }) {
  const v = VERDICT[d.verdict];
  return (
    <div style={{ ...styles.card, borderLeft: `3px solid ${v.color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
        <strong style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1rem" }}>{thDate(d.dateISO, d.dayOfWeekTh)}</strong>
        <span style={{ fontSize: "0.78rem", color: v.color, fontWeight: 600 }}>{v.label}</span>
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", margin: "0.35rem 0" }}>
        {d.goodTypes.map((t) => <span key={t} style={{ ...styles.badge, color: "var(--good,#2f6b3f)", borderColor: "var(--good,#2f6b3f)" }}>✦ {t}</span>)}
        {d.badTypes.map((t) => <span key={t} style={{ ...styles.badge, color: "var(--bad,#a83a1e)", borderColor: "var(--bad,#a83a1e)" }}>⚠ {t}</span>)}
        {d.goodTypes.length === 0 && d.badTypes.length === 0 && <span style={styles.note}>ไม่มีกาลโยคเด่นในวันนี้</span>}
      </div>
      <span style={styles.note}>🕐 ฤกษ์รายชั่วโมง (อุบากอง): {d.bestHour.range} — {d.bestHour.yam} ({d.bestHour.meaning})</span>
      {d.rerk && (
        <span
          style={{
            ...styles.note,
            color: d.rerk.fit === "avoid" ? "var(--bad,#a83a1e)" : d.rerk.fit === "good" ? "#4a6b3f" : undefined,
          }}
        >
          🌙 ฤกษ์บน: ฤกษ์ที่ {d.rerk.no} ({d.rerk.nakTh}) — {d.rerk.groupTh} · {d.rerk.fitNoteTh}
        </span>
      )}
      {d.personalNotes && d.personalNotes.length > 0 && (
        <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
          {d.personalNotes.map((n, i) => (
            <span key={i} style={{ ...styles.note, color: n.startsWith("⚠️") ? "var(--bad,#a83a1e)" : "#4a6b3f" }}>{n}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", color: "var(--text,var(--ink))", maxWidth: 620, margin: "0 auto", padding: "2.5rem 1.2rem 4rem", display: "flex", flexDirection: "column", gap: "1.1rem" },
  h1: { fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)", margin: 0 },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.1rem", color: "var(--gold)", margin: "0 0 0.6rem" },
  sub: { fontSize: "0.9rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "0.9rem", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.1rem", background: "var(--card-bg,#fffdf8)", color: "#2b2620" },
  label: { fontSize: "0.8rem", color: "#6b6255", display: "block", marginBottom: "0.35rem" },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  chip: { fontFamily: "var(--font-sans-thai)", fontSize: "0.82rem", padding: "0.45rem 0.9rem", borderRadius: 999, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "#2b2620", cursor: "pointer" },
  chipActive: { background: "var(--gold)", color: "var(--marble-bg,#f4f0e6)", borderColor: "var(--gold)", fontWeight: 600 },
  field: { display: "flex", flexDirection: "column", flex: 1, minWidth: 130 },
  input: { fontFamily: "var(--font-mono)", fontSize: "0.9rem", padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "#fffdf8", color: "#2b2620" },
  list: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  card: { padding: "0.8rem 1rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--card-bg,#fffdf8)", color: "#2b2620", display: "flex", flexDirection: "column" },
  badge: { fontSize: "0.72rem", padding: "0.1rem 0.5rem", borderRadius: 999, border: "1px solid" },
  note: { fontSize: "0.77rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  caveat: { fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.6, borderTop: "1px solid color-mix(in srgb,var(--ink) 10%,transparent)", paddingTop: "0.8rem" },
};
