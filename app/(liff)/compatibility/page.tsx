"use client";

// Logic 20 — ข่ายความสัมพันธ์หลาย entity
// พอร์ตจาก legacy-artifacts/compatibility_dashboard.html
// โทน: ☀️ สว่างหินอ่อน (.tone-marble) ตาม CLAUDE.md §2 — หน้านี้เป็น "ข้อมูล/ผลลัพธ์ถาวร"
//
// ⚠️ HTML ต้นฉบับมีสำเนาสูตรของตัวเองที่ล้าสมัย (DAY_ELEMENT บั๊ก B2, ไม่มีลี่ชุน B1)
//    หน้านี้เรียก calculateElementSeed() ตัวจริงจาก lib/engine/element.ts เท่านั้น
//    **ห้ามลอกสูตรจาก HTML กลับมา** (CLAUDE.md §5.1)

import { useMemo, useState } from "react";
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

export default function CompatibilityPage() {
  const [birthDate, setBirthDate] = useState("");
  const [seed, setSeed] = useState<ElementSeedResult | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [nextId, setNextId] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
  const selected = scored.find((s) => s.entity.id === selectedId) ?? null;

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
    const num = Number(entNumber);
    if (!name) {
      setEntError("กรุณาตั้งชื่อสิ่งที่จะเพิ่ม");
      return;
    }
    if (!entNumber.trim() || !Number.isFinite(num)) {
      setEntError("กรุณากรอกเลขอ้างอิง (บ้านเลขที่ / เลขทะเบียน / เลขที่จดทะเบียน)");
      return;
    }
    setEntities((prev) => [
      ...prev,
      { id: nextId, name, type: entType, element: entityElementFromNumber(num), shared: entShared },
    ]);
    setNextId((n) => n + 1);
    setEntName("");
    setEntNumber("");
    setEntShared(false);
  }

  function removeEntity(id: number) {
    setEntities((prev) => prev.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className={`tone-marble ${styles.page}`}>
      <header className={styles.header}>
        <h1>ข่ายความสัมพันธ์</h1>
        <p className={styles.sub}>
          ดูว่าธาตุของคุณเข้ากับบ้าน รถ องค์กร และคนรอบตัวอย่างไร
          <br />
          คำนวณจากธาตุจริง ไม่ใช่การเดา
        </p>
      </header>

      {/* ---- 1. ธาตุของคุณ ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>1. ธาตุของคุณ</h2>
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
            คำนวณธาตุของฉัน
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
          </div>
        )}
      </section>

      {/* ---- 2. เพิ่มสิ่งรอบตัว ---- */}
      <section className={styles.panel}>
        <h2 className={styles.h2}>2. เพิ่มสิ่งรอบตัว</h2>
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
                placeholder="บ้านหลังใหม่"
                className={styles.input}
              />
            </label>
          </div>
          <label className={styles.field}>
            <span>เลขอ้างอิง</span>
            <input
              type="number"
              value={entNumber}
              onChange={(e) => setEntNumber(e.target.value)}
              placeholder="เช่น 47 (บ้านเลขที่) หรือ 82 (เลขทะเบียน)"
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

      {/* ---- 3. ผลลัพธ์ ---- */}
      {seed && (
        <section className={styles.panel}>
          <h2 className={styles.h2}>3. ภาพรวม</h2>

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
                  onClick={() => setSelectedId(entity.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedId(entity.id)}
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

          {selected && (
            <div className={styles.detail}>
              <h3 className={styles.detailTitle}>
                {ENTITY_ICONS[selected.entity.type]} {selected.entity.name}
              </h3>
              <div className={styles.detailRow}>
                <span>ธาตุ</span>
                <b>{THAI_LABEL_5[selected.entity.element]}</b>
              </div>
              <div className={styles.detailRow}>
                <span>คะแนนดิบ</span>
                <b className="num">{selected.result.raw_score}</b>
              </div>
              <div className={styles.detailRow}>
                <span>คะแนนสุทธิ</span>
                <b className="num">
                  {selected.result.final_score > 0 ? "+" : ""}
                  {selected.result.final_score}
                </b>
              </div>
              <p className={styles.relation}>{selected.result.relation_th}</p>
            </div>
          )}

          {entities.length > 0 && (
            <ul className={styles.list}>
              {scored.map(({ entity, result }) => (
                <li key={entity.id} className={styles.listItem}>
                  <button
                    type="button"
                    className={styles.listMain}
                    onClick={() => setSelectedId(entity.id)}
                  >
                    <span>
                      {ENTITY_ICONS[entity.type]} {entity.name}
                    </span>
                    <span className="num" style={{ color: relationColorVar(result) }}>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    
      {/* แชท AI ประจำฟังก์ชัน — ช่วงทดลองถามได้ 2 คำถาม (lib/chat/quota.ts) */}
      <FunctionChat logicId={20} context={seed ? { ธาตุของฉัน: seed, สิ่งรอบตัว: scored, ภาพรวม: aggregate } : null} placeholder="เช่น ควรแก้ตรงไหนก่อนดี" />

    </div>
  );
}
