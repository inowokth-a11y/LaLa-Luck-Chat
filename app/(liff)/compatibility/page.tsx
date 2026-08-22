"use client";

// Logic 20 — "ทำนายแบบองค์รวม" (ยกเครื่อง 22 ส.ค. 2569 ตามคำสั่งผู้ใช้ + เปลี่ยนชื่อโหมด)
// เพิ่มหลายส่วนพร้อมกัน (ตนเอง · บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน ฯลฯ)
// → คะแนน 5 ด้านของแต่ละส่วน → ความสอดคล้องทั้งข่าย → จุดแข็ง/ข้อควรระวัง/คำแนะนำ (฿0 ล้วน)
//
// ⚠️ HTML ต้นฉบับมีสำเนาสูตรของตัวเองที่ล้าสมัย (DAY_ELEMENT บั๊ก B2, ไม่มีลี่ชุน B1)
//    หน้านี้เรียก calculateElementSeed() ตัวจริงจาก lib/engine/element.ts เท่านั้น
//    **ห้ามลอกสูตรจาก HTML กลับมา** (CLAUDE.md §5.1)
// 🔴 ตัวเลขทุกตัวมาจาก engine (numberAspects / wuXingScore / network-holistic) — หน้าห้ามคำนวณเอง

import { useMemo, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import {
  calculateElementSeed,
  THAI_LABEL_4,
  THAI_LABEL_5,
  type Element4,
  type Element5,
  type ElementSeedResult,
} from "@/lib/engine/element";
import {
  aggregateScore,
  entityElementFromNumber,
  scoreEntities,
  relationColorVar,
  ENTITY_ICONS,
  ENTITY_LABELS,
  type Entity,
  type EntityType,
} from "@/lib/engine/compatibility";
import {
  birthPowerNumber,
  parseRefInput,
  partAspects,
  analyzeCoherence,
  holisticAdvice,
  type HolisticPart,
} from "@/lib/engine/network-holistic";
import type { NumberAspectsResult } from "@/lib/engine/number-aspects";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import styles from "./compatibility.module.css";
import FunctionChat from "../_components/FunctionChat";

const ZODIAC_ANIMALS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];

function zodiacAnimalFromYear(yearAd: number): string {
  return ZODIAC_ANIMALS[(((yearAd - 2020) % 12) + 12) % 12];
}

const CX = 160;
const CY = 160;
const RADIUS = 118;

/** แถบคะแนน 5 ด้าน — ตัวเลขมาจาก engine ล้วน component แค่วาด */
function AspectBars({ aspects, title }: { aspects: NumberAspectsResult; title?: string }) {
  return (
    <div className={styles.aspectBox}>
      {title && <div className={styles.aspectTitle}>{title}</div>}
      {Object.entries(aspects.คะแนน).map(([label, score]) => (
        <div key={label} className={styles.aspectRow}>
          <span className={styles.aspectLabel}>{label}</span>
          <span className={styles.aspectTrack}>
            <span
              className={styles.aspectFill}
              data-tone={score >= 7 ? "good" : score <= 4 ? "bad" : undefined}
              style={{ width: `${score * 10}%`, display: "block" }}
            />
          </span>
          <span className={styles.aspectScore}>{score}/10</span>
        </div>
      ))}
      <div className={styles.aspectRow}>
        <span className={styles.aspectLabel} style={{ fontWeight: 700 }}>ภาพรวม</span>
        <span className={styles.aspectTrack}>
          <span className={styles.aspectFill} style={{ width: `${aspects.ภาพรวม * 10}%`, display: "block" }} />
        </span>
        <span className={styles.aspectScore}>{aspects.ภาพรวม}/10</span>
      </div>
    </div>
  );
}

export default function CompatibilityPage() {
  const [birthDate, setBirthDate] = useState("");
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [nextId, setNextId] = useState(1);
  // กาง/พับผลรายส่วน (ผู้ใช้ขอ 22 ส.ค. 2569) — id ของส่วนที่กางอยู่
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [entType, setEntType] = useState<EntityType>("house");
  const [entName, setEntName] = useState("");
  const [entNumber, setEntNumber] = useState("");
  const [entShared, setEntShared] = useState(false);
  const [entError, setEntError] = useState<string | null>(null);

  const selfElement = (seed?.dominant ?? null) as Element5 | null;
  const selfMissing = useMemo(() => (seed?.missing ?? []) as Element5[], [seed]);

  const scored = useMemo(
    () => (selfElement ? scoreEntities(entities, selfElement, selfMissing) : []),
    [entities, selfElement, selfMissing]
  );
  const aggregate = useMemo(
    () => (selfElement ? aggregateScore(entities, selfElement, selfMissing) : null),
    [entities, selfElement, selfMissing]
  );
  /** สลับกาง/พับ · forceOpen = คลิกจากแผนผัง (เปิดเสมอ ไม่สลับปิด) */
  function toggleExpand(id: number, forceOpen = false) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (forceOpen || !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // ---- โหมดองค์รวม: คะแนน 5 ด้านของทุกส่วน (ตนเอง = เลขตัวตนจาก BirthPower) ----
  const selfNumberStr = useMemo(() => {
    if (!seed || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    return String(birthPowerNumber(birthDate)).padStart(2, "0");
  }, [seed, birthDate]);

  const holisticParts = useMemo<HolisticPart[]>(() => {
    if (!seed || !selfElement || !selfNumberStr) return [];
    const parts: HolisticPart[] = [
      {
        label: `ตัวคุณ (เลขตัวตน ${selfNumberStr})`,
        icon: "👤",
        aspects: partAspects({ digits: selfNumberStr, letters: null }, selfElement, selfMissing),
        chemistry: null,
        element: null,
      },
    ];
    for (const s of scored) {
      const ref = s.entity.ref ? parseRefInput(s.entity.ref) : null;
      if (!ref) continue;
      parts.push({
        label: s.entity.name,
        icon: ENTITY_ICONS[s.entity.type],
        aspects: partAspects(ref, selfElement, selfMissing),
        chemistry: s.result,
        element: s.entity.element,
      });
    }
    return parts;
  }, [seed, selfElement, selfMissing, selfNumberStr, scored]);

  const coherence = useMemo(() => analyzeCoherence(holisticParts), [holisticParts]);
  const advice = useMemo(
    () => (holisticParts.length >= 2 ? holisticAdvice(holisticParts, coherence, selfElement) : null),
    [holisticParts, coherence, selfElement]
  );

  function calcSelf(e: React.FormEvent) {
    e.preventDefault();
    setSeedError(null);
    const year = Number(birthDate.slice(0, 4));
    const month = Number(birthDate.slice(5, 7));
    const day = Number(birthDate.slice(8, 10));
    if (!year || !month || !day) {
      setSeedError("กรุณากรอกวันเกิดให้ครบ");
      return;
    }
    // normalization layer: ข้อมูลจริงของ Platform D มี พ.ศ. ปนอยู่ (CLAUDE.md §8)
    if (year > 2400) {
      setSeedError("กรุณากรอกเป็น ค.ศ. (เช่น 1995) ไม่ใช่ พ.ศ.");
      return;
    }
    setSeed(
      calculateElementSeed({
        day_of_week: thaiDayOfWeek(birthDate),
        birth_month: month,
        birth_year_ad: year,
        birth_day: day,
        zodiac_year_animal: zodiacAnimalFromYear(year),
      })
    );
  }

  function addEntity(e: React.FormEvent) {
    e.preventDefault();
    setEntError(null);
    const name = entName.trim();
    if (!name) {
      setEntError("กรุณาตั้งชื่อสิ่งที่จะเพิ่ม");
      return;
    }
    const ref = parseRefInput(entNumber);
    if (!ref) {
      setEntError("กรุณากรอกเลขอ้างอิง 1-10 หลัก เช่น 47 · จง 6266 · 0812345678");
      return;
    }
    setEntities((prev) => [
      ...prev,
      {
        id: nextId,
        name,
        type: entType,
        element: entityElementFromNumber(Number(ref.digits)),
        shared: entShared,
        ref: entNumber.trim(),
      },
    ]);
    setNextId((n) => n + 1);
    setEntName("");
    setEntNumber("");
    setEntShared(false);
  }

  function removeEntity(id: number) {
    setEntities((prev) => prev.filter((x) => x.id !== id));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
        <h1>ทำนายแบบองค์รวม</h1>
        <p className={styles.sub}>
          บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน — ดูคะแนน 5 ด้านของแต่ละส่วน
          <br />
          แล้วดูความสอดคล้องของทั้งชีวิตคุณ · คำนวณจากเลขศาสตร์และธาตุจริง ไม่ใช่การเดา
        </p>
      </header>

      {/* ---- 1. ธาตุของคุณ ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ตัวคุณ</h2>
        <form onSubmit={calcSelf}>
          <label className={styles.field}>
            <span>วันเกิด (ค.ศ.)</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          {seedError && <p className={styles.error}>{seedError}</p>}
          <button type="submit" className={styles.btn}>
            คำนวณธาตุและเลขตัวตนของฉัน
          </button>
        </form>

        {seed && (
          <div className={styles.seedSummary}>
            <span
              className={styles.elemTag}
              style={{ background: `var(--${seed.dominant.toLowerCase()})` }}
            >
              {THAI_LABEL_4[seed.dominant]} (เด่น)
            </span>
            {seed.missing.length > 0 ? (
              <span className={styles.missingTags}>
                {seed.missing.map((m) => (
                  <span key={m} className={styles.missingTag}>
                    ขาด {THAI_LABEL_4[m as Element4]}
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.missingTag}>ธาตุครบทั้ง 4</span>
            )}
            <p className={styles.note}>
              ธาตุที่ขาดไม่ใช่จุดอ่อนเสมอไป — สิ่งรอบตัวที่เป็นธาตุนั้นอาจกลายเป็น “ยา” ได้
              (Productive&nbsp;Clash)
            </p>
            {holisticParts[0] && (
              <details className={styles.fold} open>
                <summary>คะแนน 5 ด้านของ {holisticParts[0].label}</summary>
                <AspectBars aspects={holisticParts[0].aspects} />
              </details>
            )}
          </div>
        )}
      </section>

      {/* ---- 2. เพิ่มสิ่งรอบตัว ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>2. เพิ่มสิ่งรอบตัว (เพิ่มได้หลายรายการ)</h2>
        <form onSubmit={addEntity}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>ประเภท</span>
              <select
                value={entType}
                onChange={(e) => setEntType(e.target.value as EntityType)}
                className={styles.input}
              >
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                  <option key={t} value={t}>
                    {ENTITY_ICONS[t]} {ENTITY_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>ชื่อเรียก</span>
              <input
                type="text"
                value={entName}
                onChange={(e) => setEntName(e.target.value)}
                placeholder="เช่น บ้านหลังใหม่ / รถคันเก่ง"
                className={styles.input}
              />
            </label>
          </div>
          <label className={styles.field}>
            <span>เลขอ้างอิง (บ้านเลขที่ / ทะเบียน / เบอร์โทร — ใส่อักษรป้ายได้)</span>
            <input
              type="text"
              inputMode="text"
              value={entNumber}
              onChange={(e) => setEntNumber(e.target.value)}
              placeholder="เช่น 47 · จง 6266 · 0812345678"
              className={styles.input}
            />
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={entShared}
              onChange={(e) => setEntShared(e.target.checked)}
            />
            <span>อยู่กับสิ่งนี้ทุกวัน (ให้น้ำหนักมากขึ้น 1.5 เท่า)</span>
          </label>
          {entError && <p className={styles.error}>{entError}</p>}
          <button type="submit" className={styles.btn} disabled={!seed}>
            {seed ? "เพิ่มเข้าข่าย" : "คำนวณธาตุของคุณก่อน"}
          </button>
        </form>
      </section>

      {/* ---- 3. คะแนนรายส่วน + แผนผังธาตุ ---- */}
      {seed && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>3. คะแนนรายส่วน & เคมีธาตุ</h2>

          <details className={styles.fold} open>
            <summary>🕸 แผนผังเคมีธาตุ & คะแนนรวมของข่าย</summary>
          {aggregate && (
            <div className={styles.aggBox}>
              <div className={styles.aggScore} data-tone={aggregate.tone}>
                {aggregate.score === null ? "--" : `${aggregate.score} / 100`}
              </div>
              <div className={styles.aggTrack}>
                <div
                  className={styles.aggFill}
                  data-tone={aggregate.tone}
                  style={{ width: `${aggregate.score ?? 0}%` }}
                />
              </div>
              <div className={styles.aggLabel}>{aggregate.label}</div>
              <p className={styles.note}>
                ⚠️ คะแนนรวมเป็นตัวช่วยอ่านภาพรวมที่ออกแบบขึ้นเอง ไม่มีในตำรา — ให้ดูรายจุดประกอบเสมอ
              </p>
            </div>
          )}

          <svg viewBox="0 0 320 320" className={styles.graph} role="img" aria-label="แผนผังความสัมพันธ์ของธาตุ">
            {scored.map(({ entity, result }, i) => {
              const angle = (i / Math.max(scored.length, 1)) * 2 * Math.PI - Math.PI / 2;
              const ex = CX + RADIUS * Math.cos(angle);
              const ey = CY + RADIUS * Math.sin(angle);
              const color = relationColorVar(result);
              return (
                <g
                  key={entity.id}
                  className={styles.node}
                  onClick={() => toggleExpand(entity.id, true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && toggleExpand(entity.id, true)}
                >
                  <line
                    x1={CX}
                    y1={CY}
                    x2={ex}
                    y2={ey}
                    stroke={color}
                    strokeWidth={entity.shared ? 4.5 : 2.5}
                  />
                  <circle
                    cx={ex}
                    cy={ey}
                    r={20}
                    fill={`var(--${entity.element.toLowerCase()})`}
                    stroke={result.productive_clash ? "var(--clash)" : "var(--marble-vein)"}
                    strokeWidth={result.productive_clash ? 2.5 : 1}
                  />
                  <text x={ex} y={ey + 5} className={styles.icon}>
                    {ENTITY_ICONS[entity.type]}
                  </text>
                  <text x={ex} y={ey - 26} className={styles.badge} fill={color}>
                    {result.final_score > 0 ? "+" : ""}
                    {result.final_score}
                  </text>
                  <text x={ex} y={ey + (Math.sin(angle) > 0 ? 34 : -34)} className={styles.label}>
                    {entity.name.length > 10 ? `${entity.name.slice(0, 9)}…` : entity.name}
                  </text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={26} fill={`var(--${seed.dominant.toLowerCase()})`} />
            <text x={CX} y={CY + 5} className={styles.selfLabel}>
              คุณ
            </text>
          </svg>

          {entities.length === 0 && (
            <p className={styles.empty}>ยังไม่มีสิ่งรอบตัวในข่าย — เพิ่มจากข้อ 2 ด้านบน</p>
          )}
          </details>

          {/* แอคคอร์เดียนรายส่วน — กาง/พับผลทำนายของแต่ละส่วน (คลิกโหนดในแผนผังก็เปิดได้) */}
          {scored.map(({ entity, result }) => {
            const part = holisticParts.find((p) => p.label === entity.name);
            const open = expanded.has(entity.id);
            return (
              <div key={entity.id} className={styles.accItem}>
                <div className={styles.accHeadRow}>
                  <button
                    type="button"
                    className={styles.accHead}
                    onClick={() => toggleExpand(entity.id)}
                    aria-expanded={open}
                  >
                    <span className={styles.accChev}>{open ? "▾" : "▸"}</span>
                    <span className={styles.accTitle}>
                      {ENTITY_ICONS[entity.type]} {entity.name}
                    </span>
                    {part && <span className={styles.accScore}>{part.aspects.ภาพรวม}/10</span>}
                    <span className="num" style={{ color: relationColorVar(result), fontWeight: 700 }}>
                      {result.final_score > 0 ? "+" : ""}
                      {result.final_score}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeEntity(entity.id)}
                    aria-label={`ลบ ${entity.name}`}
                  >
                    ✕
                  </button>
                </div>
                {open && (
                  <div className={styles.accBody}>
                    <div className={styles.detailRow}>
                      <span>ธาตุ</span>
                      <b>{THAI_LABEL_5[entity.element]}</b>
                    </div>
                    <div className={styles.detailRow}>
                      <span>เคมีธาตุกับคุณ</span>
                      <b className="num">
                        {result.final_score > 0 ? "+" : ""}
                        {result.final_score}
                      </b>
                    </div>
                    <p className={styles.relation}>{result.relation_th}</p>
                    {part && (
                      <>
                        <AspectBars aspects={part.aspects} title="คะแนน 5 ด้านของส่วนนี้" />
                        {part.aspects.การ์ดผลรวม && (
                          <p className={styles.partMeta}>🃏 การ์ดผลรวมเลข: {part.aspects.การ์ดผลรวม}</p>
                        )}
                        {part.aspects.ความหมายเลขท้าย && (
                          <p className={styles.partMeta}>✨ เลขท้าย: {part.aspects.ความหมายเลขท้าย}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ---- 4. ความสอดคล้องทั้งข่าย + คำแนะนำ ---- */}
      {advice && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>4. ความสอดคล้องทั้งข่าย (5 ด้าน)</h2>
          <details className={styles.fold} open>
            <summary>📊 ตารางความสอดคล้องรายด้าน</summary>
            {coherence.map((c) => (
              <div key={c.key} className={styles.coRow}>
                <span className={styles.coLabel}>{c.labelTh}</span>
                <span className={styles.coChip} data-tone={c.tone}>
                  {c.tone === "strong" ? "✅ หนุนกันทั้งข่าย" : c.tone === "caution" ? "⚠️ มีจุดต้องดู" : "· กลางๆ"}
                </span>
                <span className={styles.coDetail}>
                  เฉลี่ย {c.avg} · สูงสุด {c.strongest.label} ({c.max}) · ต่ำสุด {c.weakest.label} ({c.min})
                </span>
              </div>
            ))}
          </details>

          {advice.strengths.length > 0 && (
            <details className={styles.fold} open>
              <summary>✅ จุดแข็งที่ช่วยส่งเสริม ({advice.strengths.length})</summary>
              <ul className={styles.adviceList}>
                {advice.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          {advice.cautions.length > 0 && (
            <details className={styles.fold} open>
              <summary>⚠️ ข้อควรระวัง ({advice.cautions.length})</summary>
              <ul className={styles.adviceList}>
                {advice.cautions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          {advice.tips.length > 0 && (
            <details className={styles.fold} open>
              <summary>💡 ข้อแนะนำอื่น ({advice.tips.length})</summary>
              <ul className={styles.adviceList}>
                {advice.tips.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </details>
          )}
          <p className={styles.note} style={{ marginTop: "0.8rem" }}>
            {advice.caveats.map((c, i) => <span key={i}>⚠️ {c}<br /></span>)}
          </p>
        </section>
      )}

      {/* แชท AI ประจำฟังก์ชัน — ช่วงทดลองถามได้ 2 คำถาม (lib/chat/quota.ts) */}
      <FunctionChat
        logicId={20}
        context={
          seed
            ? {
                ธาตุของฉัน: seed,
                ส่วนในข่าย: holisticParts.map((p) => ({
                  ส่วน: `${p.icon} ${p.label}`,
                  คะแนน5ด้าน: p.aspects.คะแนน,
                  ภาพรวม: p.aspects.ภาพรวม,
                  เคมีธาตุ: p.chemistry?.relation_th ?? "—",
                })),
                ความสอดคล้อง: coherence.map((c) => ({ ด้าน: c.labelTh, เฉลี่ย: c.avg, ต่ำสุด: `${c.weakest.label} ${c.min}` })),
                คำแนะนำ: advice,
                คะแนนรวมข่ายธาตุ: aggregate,
              }
            : null
        }
        placeholder="เช่น ควรแก้ตรงไหนก่อนดี"
      />
    </div>
  );
}
