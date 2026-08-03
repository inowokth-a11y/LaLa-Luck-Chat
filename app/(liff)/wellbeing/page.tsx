"use client";

// แบบประเมินสุขภาวะ "LaLa Wellbeing Check" (สไลซ์ C — CLAUDE.md §15)
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม §2 — หน้าข้อมูล/ผลลัพธ์
//
// ฟรีไม่จำกัด (ต้นทุน ฿0 — pure engine) · ต้องล็อกอิน (guest ได้) เพราะผลถูกเก็บดูย้อนหลัง
// ⚠️ ห้ามคำคลินิกทุกข้อความ · คะแนนดิบไม่โชว์ (แสดง % / badge) — display_rules ต้นฉบับ
// consent แยกเฉพาะแบบประเมิน (checkbox ก่อนเริ่ม) — ไม่ติ๊ก = ไม่เริ่ม ไม่บันทึก

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MascotLogo from "@/app/_components/MascotLogo";
import ChartPanel from "../_components/ChartPanel";
import FunctionChat from "../_components/FunctionChat";
import {
  KWI_QUESTIONS,
  KWI_DIMENSIONS,
  KWI_DIMENSION_TH,
  WELLBEING_CAVEAT,
  type KwiDimension,
  type KwiResult,
} from "@/lib/engine/wellbeing";
import styles from "./wellbeing.module.css";

type Stage = "intro" | "form" | "result";

/** แปลงคะแนน 1-5 เป็น % สำหรับแสดงผล (display_rules: ไม่โชว์คะแนนดิบ) */
const pct = (score: number) => Math.round((score / 5) * 100);

export default function WellbeingPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<KwiResult | null>(null);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  // ผลล่าสุด (ผู้ล็อกอิน — อ่านผ่าน RLS own-row) ให้เปิดดูซ้ำได้โดยไม่ต้องทำใหม่
  const [latest, setLatest] = useState<KwiResult | null>(null);
  useEffect(() => {
    fetch("/api/wellbeing")
      .then((r) => r.json())
      .then((d) => {
        if (d?.latest?.result) {
          setLatest(d.latest.result as KwiResult);
          setLatestAt(d.latest.takenAt ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const answeredCount = useMemo(
    () => KWI_QUESTIONS.filter((q) => typeof answers[q.id] === "number").length,
    [answers]
  );
  const allAnswered = answeredCount === KWI_QUESTIONS.length;

  const grouped = useMemo(() => {
    const g = new Map<KwiDimension, typeof KWI_QUESTIONS>();
    for (const d of KWI_DIMENSIONS) g.set(d, KWI_QUESTIONS.filter((q) => q.dimension === d));
    return g;
  }, []);

  const submit = async () => {
    if (!allAnswered || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/wellbeing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, consent: true }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setNeedsLogin(true);
        setError(data.error ?? "กรุณาเข้าสู่ระบบก่อนทำแบบประเมิน");
        return;
      }
      if (!res.ok || !data.result) {
        setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }
      setResult(data.result as KwiResult);
      setStage("result");
      window.scrollTo({ top: 0 });
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  const shown = stage === "result" ? result : null;

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}>
          <MascotLogo size={84} />
        </div>
        <h1>💙 LaLa Wellbeing Check</h1>
        <p className={styles.sub}>แบบสำรวจสุขภาวะ 25 ข้อ · ฟรี · ใช้เวลาประมาณ 5 นาที</p>
      </header>

      {stage === "intro" && (
        <>
          <section className={styles.panel}>
            <h2 className={styles.h2}>เรื่องราวของชื่อ &quot;LaLa Lucky&quot;</h2>
            <p className={styles.brandStory}>
              <b>LaLa</b> คือ <b>สุขภาพใจที่มีความสุข</b> — เสียงฮัมเพลงเบาๆ ของวันที่ใจเราเบาสบาย
              ส่วน <b>Lucky</b> คือ <b>โหราศาสตร์</b> — การคำนวณพลังงานตามศาสตร์ที่แม่หมอลาลาถนัด
              สองอย่างนี้เดินไปด้วยกันค่ะ: ดวงจะดีแค่ไหน ถ้าใจไม่พร้อม ความโชคดีก็เดินเข้ามาไม่ถึง
              แบบสำรวจชุดนี้จึงชวนคุณหยุดเช็คใจตัวเองใน 5 มิติ — พลังชีวิต · ความหมาย ·
              ความสัมพันธ์ · ความเชี่ยวชาญ · ความยืดหยุ่น 🐾
            </p>
            <p className={styles.caveat}>{WELLBEING_CAVEAT}</p>
            <label className={styles.consentBox}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                ฉันยินยอมให้เก็บ<b>คำตอบแบบประเมินและผลคะแนน</b>ไว้กับบัญชีของฉัน
                เพื่อดูย้อนหลังและติดตามการเปลี่ยนแปลง · ข้อมูลนี้<b>ลบพร้อมบัญชี</b>เมื่อฉันลบบัญชี ·
                แบบสำรวจนี้<b>ไม่ใช่เครื่องมือวินิจฉัยทางการแพทย์</b> (
                <Link href="/privacy" style={{ textDecoration: "underline" }}>นโยบายความเป็นส่วนตัว</Link>)
              </span>
            </label>
            <button className={styles.primaryBtn} disabled={!consent} onClick={() => setStage("form")}>
              เริ่มทำแบบประเมิน →
            </button>
            {latest && (
              <button
                className={styles.secondaryBtn}
                onClick={() => {
                  setResult(latest);
                  setStage("result");
                }}
              >
                ดูผลครั้งล่าสุดของฉัน{latestAt ? ` (${new Date(latestAt).toLocaleDateString("th-TH")})` : ""}
              </button>
            )}
          </section>
        </>
      )}

      {stage === "form" && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>ตอบตามความรู้สึกจริงในช่วงนี้ — ไม่มีคำตอบถูกหรือผิดค่ะ</h2>
          {KWI_DIMENSIONS.map((dim) => (
            <div key={dim}>
              <h3 className={styles.dimHead}>{KWI_DIMENSION_TH[dim]}</h3>
              {(grouped.get(dim) ?? []).map((q, qi) => (
                <div key={q.id} className={styles.question}>
                  <p className={styles.qText}>
                    <span className={styles.qNum}>{qi + 1}.</span>
                    {q.text}
                  </p>
                  <div className={styles.options}>
                    {q.options.map((opt, oi) => (
                      <label key={oi} className={styles.option}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === oi}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button className={styles.primaryBtn} disabled={!allAnswered || busy} onClick={submit}>
            {busy ? "กำลังประมวลผล…" : allAnswered ? "ดูผลของฉัน ✨" : `ตอบแล้ว ${answeredCount}/${KWI_QUESTIONS.length} ข้อ`}
          </button>
          {error && (
            <p className={styles.error}>
              {error}
              {needsLogin && (
                <>
                  {" "}
                  <Link className={styles.loginCta} href="/login?next=/wellbeing">
                    เข้าสู่ระบบ / สมัครฟรี →
                  </Link>
                </>
              )}
            </p>
          )}
          <div className={styles.progress}>ตอบแล้ว {answeredCount}/{KWI_QUESTIONS.length} ข้อ</div>
        </section>
      )}

      {stage === "result" && shown && (
        <>
          <section className={styles.panel}>
            <div className={styles.badge}>
              <div className={styles.badgeEmoji}>{shown.badge.emoji}</div>
              <div className={styles.badgeLabel}>{shown.badge.label}</div>
              <div className={styles.totalPct}>สุขภาวะรวม {pct(shown.total)}%</div>
            </div>
            <ChartPanel
              chart={{
                type: "radar",
                label: "สุขภาวะ 5 มิติของคุณ",
                series: "kwi",
                scale: [1, 5],
                points: KWI_DIMENSIONS.map((d) => ({ label: KWI_DIMENSION_TH[d], value: shown.dimensions[d] })),
              }}
            />
            <div className={styles.dimList}>
              {KWI_DIMENSIONS.map((d) => (
                <div key={d} className={styles.dimRow}>
                  <span>
                    {KWI_DIMENSION_TH[d]}
                    {d === shown.highest && " ⭐ จุดแข็ง"}
                    {d === shown.lowest && " 💛 น่าดูแลเพิ่ม"}
                  </span>
                  <b>{pct(shown.dimensions[d])}%</b>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.patternName}>รูปแบบของคุณ: {shown.pattern.nameTh}</div>
            <p className={styles.note}>{shown.pattern.description}</p>
            <div className={styles.opening}>{shown.pattern.opening}</div>
            <p className={styles.kv}>
              <b>จุดแข็ง:</b> {shown.pattern.strength}
            </p>
            <p className={styles.kv}>
              <b>สิ่งที่ชวนสังเกต:</b> {shown.pattern.challenge}
            </p>
            <p className={styles.kv}>
              <b>ก้าวเล็กๆ ช่วงนี้:</b> {shown.pattern.shortTermAction}
            </p>
            <p className={styles.kv}>
              <b>ระยะยาว:</b> {shown.pattern.longTerm}
            </p>
            {shown.showReferral && (
              <div className={styles.referral}>
                💙 ช่วงนี้อาจเป็นช่วงที่หนักสำหรับคุณ — การคุยกับผู้เชี่ยวชาญโดยตรงช่วยได้จริงค่ะ
                <br />
                <b>สายด่วนสุขภาพจิต 1323</b> (ฟรี ตลอด 24 ชั่วโมง)
              </div>
            )}
            <p className={styles.caveat}>{shown.caveat}</p>
            <button
              className={styles.secondaryBtn}
              onClick={() => {
                setAnswers({});
                setResult(null);
                setStage("intro");
                window.scrollTo({ top: 0 });
              }}
            >
              ทำแบบประเมินอีกครั้ง
            </button>
          </section>

          {/* publish ผลเข้าแชทลอย — ถามแม่หมอต่อได้ (ใช้ถังคำถาม/เครดิตเดิม) */}
          <FunctionChat
            logicId={16}
            context={{
              แบบประเมิน: "LaLa Wellbeing Check (แบบสำรวจดูแลตัวเอง ไม่ใช่การวินิจฉัย)",
              ระดับ: shown.badge.label,
              สุขภาวะรวมเปอร์เซ็นต์: pct(shown.total),
              มิติเปอร์เซ็นต์: Object.fromEntries(
                KWI_DIMENSIONS.map((d) => [KWI_DIMENSION_TH[d], pct(shown.dimensions[d])])
              ),
              จุดแข็ง: KWI_DIMENSION_TH[shown.highest],
              มิติที่น่าดูแลเพิ่ม: KWI_DIMENSION_TH[shown.lowest],
              รูปแบบ: shown.pattern.nameTh,
              คำอธิบายรูปแบบ: shown.pattern.description,
              ก้าวเล็กๆ: shown.pattern.shortTermAction,
              หมายเหตุ: shown.caveat,
            }}
            placeholder="ถามแม่หมอต่อจากผลสุขภาวะของคุณ…"
          />
        </>
      )}
    </div>
  );
}
