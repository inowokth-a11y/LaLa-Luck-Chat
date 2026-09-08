"use client";

// 🔍 ตามหาแมวหาย — แผนลำดับการค้น (เฟส 1 · 8 ก.ย. 2569) · ฟรี ฿0 ไม่ต้องล็อกอิน
// ตำราให้ทิศเริ่มต้น (น้ำหนักต่ำ) · สถิติจริงให้ระยะ · ภูมิประเทศจากผู้ใช้ให้ทิศ · checklist สำคัญกว่าทิศ
// 🔴 ห้ามแสดงเป็นตำแหน่งแมว — เป็น "ลำดับการค้น" เท่านั้น (LOST_CAT_CAVEAT)

import { useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import { DIRS8, RINGS, CAT_TYPES, TEMPERAMENTS, type LostCatPlan } from "@/lib/engine/lost-cat";
import { CAT_COATS } from "@/lib/engine/cat-tamra";
import styles from "../cat.module.css";

const PLACE_OPTIONS: { key: string; th: string }[] = [
  { key: "own_yard", th: "รอบบ้านตัวเอง" },
  { key: "neighbor_yard", th: "สวน/ลานบ้านคนอื่น" },
  { key: "vegetation", th: "ใต้พุ่มไม้/ที่รก" },
  { key: "under_house", th: "ใต้บ้าน/ระเบียง/ใต้รถ" },
  { key: "neighbor_house", th: "ในบ้านคนอื่น" },
  { key: "other", th: "อื่นๆ" },
];

function DirPicker({ value, onChange, multi }: { value: string[]; onChange: (v: string[]) => void; multi: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
      {DIRS8.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== d) : [...value, d]) : on ? [] : [d])}
            style={{
              fontFamily: "var(--font-sans-thai)", fontSize: "0.8rem", padding: "0.3rem 0.6rem", borderRadius: 999,
              border: "1px solid var(--gold-dim, #a89870)", cursor: "pointer",
              background: on ? "var(--gold, #b8860b)" : "var(--surface, #fff)", color: on ? "#faf7f0" : "var(--text, #1d1812)",
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export default function LostCatPage() {
  const [catType, setCatType] = useState("indoor");
  const [temperament, setTemperament] = useState("unknown");
  const [days, setDays] = useState("0");
  const [exitDir, setExitDir] = useState<string[]>([]);
  const [coverDirs, setCoverDirs] = useState<string[]>([]);
  const [noiseDirs, setNoiseDirs] = useState<string[]>([]);
  const [seenDirs, setSeenDirs] = useState<string[]>([]);
  const [oldHomeDir, setOldHomeDir] = useState<string[]>([]);
  const [coat, setCoat] = useState("");
  // มุมตำรา 梅花易数 — วัน/เวลาที่หาย (ไม่บังคับ · ไม่รู้เวลา = ไม่แสดงมุมตำรา ไม่เดา)
  const [lostDate, setLostDate] = useState("");
  const [lostTime, setLostTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<LostCatPlan | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // outcome
  const [foundDir, setFoundDir] = useState<string[]>([]);
  const [foundRing, setFoundRing] = useState("");
  const [foundPlace, setFoundPlace] = useState("");
  const [outcomeMsg, setOutcomeMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null); setPlan(null); setOutcomeMsg(null);
    try {
      const res = await fetch("/api/lost-cat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "plan", catType, temperament, daysMissing: Number(days) || 0,
          exitDir: exitDir[0] ?? null, coverDirs, noiseDirs, seenDirs, oldHomeDir: oldHomeDir[0] ?? null, coat: coat || null,
          lostDate: lostDate || null, lostTime: lostTime || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) setErr(d.error ?? "ไม่สำเร็จ");
      else { setPlan(d.plan); setCaseId(d.caseId ?? null); }
    } catch { setErr("เชื่อมต่อไม่สำเร็จ ลองอีกครั้งนะคะ"); }
    finally { setBusy(false); }
  }

  async function report(found: boolean) {
    if (!caseId) { setOutcomeMsg("ขอบคุณค่ะ 🙏"); return; }
    const res = await fetch("/api/lost-cat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "outcome", caseId, found, direction: foundDir[0] ?? null, ring: foundRing || null, place: foundPlace || null, days: Number(days) || 0 }),
    });
    const d = await res.json();
    setOutcomeMsg(d.message ?? d.error ?? "ขอบคุณค่ะ");
  }

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <MascotLogo size={64} />
        <h1 className={styles.h2} style={{ fontSize: "1.45rem" }}>🔍 ตามหาแมวหาย — วางแผนค้นตามลำดับ</h1>
        <p className={styles.sub}>
          ตอบไม่กี่ข้อ ระบบจะจัดลำดับ &quot;ควรค้นตรงไหนก่อน&quot; จากสถิติงานวิจัยแมวหาย 1,210 ตัว + ภูมิประเทศรอบบ้านคุณ
          + จังหวะออกค้น — ฟรี ไม่ต้องสมัคร · <b>ใจเย็นๆ นะคะ แมวส่วนใหญ่อยู่ใกล้กว่าที่คิด</b>
        </p>
      </header>

      <section className={styles.panel}>
        <h2 className={styles.h2}>1. เล่าเรื่องแมวและรอบบ้าน</h2>
        <form onSubmit={submit}>
          <label className={styles.field}>
            <span>ประเภทแมว</span>
            <select className={styles.input} value={catType} onChange={(e) => setCatType(e.target.value)}>
              {Object.entries(CAT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>นิสัย</span>
            <select className={styles.input} value={temperament} onChange={(e) => setTemperament(e.target.value)}>
              {Object.entries(TEMPERAMENTS).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>หายมากี่วันแล้ว</span>
            <input className={styles.input} type="number" min={0} max={3650} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <div className={styles.field}><span>ทางที่แมวออกไป (ประตู/หน้าต่าง/รูรั้ว) — เลือก 1 ทิศ ถ้ารู้</span><DirPicker value={exitDir} onChange={setExitDir} multi={false} /></div>
          <div className={styles.field}><span>ทิศที่มีที่กำบัง (พุ่มไม้ ที่รก ใต้ถุน โรงรถ กองของ) — เลือกได้หลายทิศ</span><DirPicker value={coverDirs} onChange={setCoverDirs} multi /></div>
          <div className={styles.field}><span>ทิศที่มีถนนใหญ่/เสียงดัง/หมา — เลือกได้หลายทิศ</span><DirPicker value={noiseDirs} onChange={setNoiseDirs} multi /></div>
          <div className={styles.field}><span>ทิศที่เคยเห็นแมวไป / มีแมวจร / มีคนให้อาหารแมว</span><DirPicker value={seenDirs} onChange={setSeenDirs} multi /></div>
          <div className={styles.field}><span>เพิ่งย้ายบ้าน? ทิศบ้านเก่า (ถ้ามี)</span><DirPicker value={oldHomeDir} onChange={setOldHomeDir} multi={false} /></div>
          <label className={styles.field}>
            <span>สีขนแมว (ไม่บังคับ — ทิศธาตุตามตำรา ชั้นเสริม)</span>
            <select className={styles.input} value={coat} onChange={(e) => setCoat(e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              {Object.entries(CAT_COATS).map(([k, v]) => <option key={k} value={k}>{v.th}</option>)}
            </select>
          </label>
          <div className={styles.field}>
            <span>วันและเวลาที่แมวหาย (ไม่บังคับ — มุมตำราจีนโบราณ ตั้งกัวจากเวลาที่หาย · ไม่รู้เวลาแน่ให้เว้นว่าง)</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input className={styles.input} type="date" value={lostDate} onChange={(e) => setLostDate(e.target.value)} style={{ maxWidth: 180 }} />
              <input className={styles.input} type="time" value={lostTime} onChange={(e) => setLostTime(e.target.value)} style={{ maxWidth: 140 }} />
            </div>
          </div>
          <button type="submit" className={styles.btn} disabled={busy}>{busy ? "กำลังวางแผน…" : "วางแผนตามหา 🐾"}</button>
          {err && <p className={styles.error}>{err}</p>}
        </form>
      </section>

      {plan && (
        <>
          <section className={styles.panel}>
            <h2 className={styles.h2}>2. ค้นตรงไหนก่อน — 5 ลำดับแรก</h2>
            <p className={styles.note}>💛 {plan.hopeTh}</p>
            <ol style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0" }}>
              {plan.cells.slice(0, 5).map((c, i) => (
                <li key={`${c.dir}-${c.ring}`} style={{ marginBottom: "0.7rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  <b>{i + 1}. ทิศ{c.dir} · {c.ringTh}</b> <span style={{ opacity: 0.7 }}>({(c.score * 100).toFixed(0)}%)</span>
                  <div style={{ fontSize: "0.82rem" }}>จุดที่ควรดู: {c.placesTh.join(" · ")}</div>
                  <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>เหตุผล: {c.whyTh.join(" · ")}</div>
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              น้ำหนักวงระยะ: {plan.ringWeights.map((r) => `${r.labelTh.split(" (")[0]} ${(r.weight * 100).toFixed(0)}%`).join(" · ")}
            </p>
            {plan.lureTh && <p className={styles.kv}>🎀 {plan.lureTh}</p>}
          </section>

          {plan.meihua && (
            <section className={styles.panel}>
              <h2 className={styles.h2}>🀄 มุมตำรา — ตั้งกัวจากเวลาที่หาย (ชั้นเสริม ไม่เข้าลำดับข้างบน)</h2>
              <p className={styles.kv}>
                <span>ตัวเลขตั้งกัว</span>
                <b>ปี{plan.meihua.numbers.animalTh} {plan.meihua.numbers.yearBranch}={plan.meihua.numbers.year} · เดือน{plan.meihua.numbers.lunarLeap ? "อธิกมาส" : ""}จีน {plan.meihua.numbers.lunarMonth} · วันจันทรคติ {plan.meihua.numbers.lunarDay} · ยาม{plan.meihua.numbers.shichen}={plan.meihua.numbers.hour}</b>
              </p>
              <p className={styles.kv}><span>กัว</span><b>{plan.meihua.hexagram} (เส้นเคลื่อนที่ {plan.meihua.movingLine}) → {plan.meihua.changedHexagram}</b></p>
              <p className={styles.kv}>
                <span>ตำราชี้ทิศ</span>
                <b>{plan.meihua.dirTh} ({plan.meihua.changed.hanzi} {plan.meihua.changed.natureTh}) · รอง: {plan.meihua.secondaryDirTh}</b>
              </p>
              <p className={styles.kv}><span>ลักษณะที่ตามตำรา</span><b>{plan.meihua.terrainTh}</b></p>
              <p className={styles.kv}><span>ลางการได้คืน</span><b>{plan.meihua.omen.labelTh} — {plan.meihua.omen.adviceTh}</b></p>
              <p className={styles.note}>
                {plan.meihuaAgreesTop3
                  ? "✅ ทิศตำราตรงกับทิศอันดับต้นของแผนสถิติ/ภูมิประเทศ — เริ่มทิศนี้ได้เลย"
                  : "ℹ️ ทิศตำราต่างจากแผนสถิติ/ภูมิประเทศ — ให้ยึดลำดับข้างบนเป็นหลัก (มีหลักฐานเชิงพฤติกรรม) แล้วเพิ่มทิศตำราเป็นจุดค้นเสริม ไม่ต้องเลือกข้าง"}
              </p>
            </section>
          )}

          <section className={styles.panel}>
            <h2 className={styles.h2}>3. ออกค้นช่วงไหน</h2>
            <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.88rem", lineHeight: 1.7 }}>
              {plan.windows.map((w) => <li key={w.labelTh}><b>{w.labelTh}</b>: {w.timeTh} <span style={{ opacity: 0.65 }}>— {w.sourceTh}</span></li>)}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>4. รายการปฏิบัติ (สำคัญกว่าทิศ)</h2>
            <ul style={{ paddingLeft: "1.2rem", margin: 0, fontSize: "0.88rem", lineHeight: 1.7 }}>
              {plan.checklistTh.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className={styles.note} style={{ marginTop: "0.7rem" }}>
              {plan.caveats.map((c) => <span key={c}>⚠️ {c}<br /></span>)}
            </p>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>5. เจอแล้ว? บอกเราหน่อย</h2>
            <p className={styles.note}>ข้อมูลว่าเจอทิศไหน ระยะเท่าไร ช่วยปรับน้ำหนักให้แมวตัวต่อไปในบริบทไทย (ไม่เก็บข้อมูลส่วนตัว)</p>
            {outcomeMsg ? (
              <p className={styles.kv}>{outcomeMsg}</p>
            ) : (
              <>
                <div className={styles.field}><span>เจอทิศไหน</span><DirPicker value={foundDir} onChange={setFoundDir} multi={false} /></div>
                <label className={styles.field}>
                  <span>ระยะจากบ้าน</span>
                  <select className={styles.input} value={foundRing} onChange={(e) => setFoundRing(e.target.value)}>
                    <option value="">— เลือก —</option>
                    {RINGS.map((r) => <option key={r.key} value={r.key}>{r.labelTh}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>เจอที่ไหน</span>
                  <select className={styles.input} value={foundPlace} onChange={(e) => setFoundPlace(e.target.value)}>
                    <option value="">— เลือก —</option>
                    {PLACE_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.th}</option>)}
                  </select>
                </label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button type="button" className={styles.btn} onClick={() => report(true)}>🎉 เจอแล้ว</button>
                  <button type="button" className={styles.btn} style={{ opacity: 0.75 }} onClick={() => report(false)}>ยังไม่เจอ — ขอกำลังใจ</button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
