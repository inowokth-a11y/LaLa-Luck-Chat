"use client";

// กราฟเปรียบเทียบสำหรับ AI Chat แบบยืดหยุ่น (CLAUDE.md §16)
//
// 🔴 กฎเหล็ก: component นี้ **วาดจากตัวเลขที่ server ส่งมาเท่านั้น** ไม่คำนวณเอง ไม่แต่งเลข
//    (ตัวเลขมาจาก engine ผ่าน executePlan — AI เลือกได้แค่ชนิดกราฟ/ป้ายชื่อ)
// ไม่ลง recharts/chart.js — bar/scale เป็น CSS, radar เป็น SVG เขียนเอง (หน้านี้เปิดบนมือถือ)

import styles from "./ChartPanel.module.css";

type Point = { label: string; value: number };

export type ChartData =
  | { type: "bar" | "radar" | "scale"; label: string; series: string; scale: [number, number]; points: Point[] }
  | { type: "table"; label: string; series: string; rows: { label: string; output: unknown }[] };

export default function ChartPanel({ chart }: { chart: ChartData }) {
  return (
    <figure className={styles.panel}>
      <figcaption className={styles.caption}>{chart.label}</figcaption>
      {chart.type === "bar" && <BarChart scale={chart.scale} points={chart.points} />}
      {chart.type === "scale" && <ScaleChart scale={chart.scale} points={chart.points} />}
      {chart.type === "radar" && <RadarChart scale={chart.scale} points={chart.points} />}
      {chart.type === "table" && <TableChart rows={chart.rows} />}
    </figure>
  );
}

/** ตำแหน่ง 0..1 ของ value ในสเกล */
const frac = (v: number, [min, max]: [number, number]) =>
  max === min ? 0.5 : Math.min(1, Math.max(0, (v - min) / (max - min)));

// --- bar: แท่งแนวนอน มีเส้นศูนย์ถ้าสเกลคร่อม 0 (เช่น wuXingScore -2..2) ---
function BarChart({ scale, points }: { scale: [number, number]; points: Point[] }) {
  const [min, max] = scale;
  const zeroF = min < 0 && max > 0 ? frac(0, scale) : 0;
  return (
    <div className={styles.bars}>
      {points.map((p, i) => {
        const f = frac(p.value, scale);
        const left = Math.min(f, zeroF) * 100;
        const width = Math.abs(f - zeroF) * 100;
        const neg = p.value < 0;
        return (
          <div key={i} className={styles.barRow}>
            <span className={styles.barLabel} title={p.label}>{p.label}</span>
            <span className={styles.track}>
              {min < 0 && max > 0 && <span className={styles.zeroLine} style={{ left: `${zeroF * 100}%` }} />}
              <span
                className={neg ? styles.fillNeg : styles.fillPos}
                style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
              />
            </span>
            <span className={styles.barVal}>{fmt(p.value)}</span>
          </div>
        );
      })}
      <div className={styles.axisNote}>สเกล {fmt(min)} ถึง {fmt(max)}</div>
    </div>
  );
}

// --- scale: มาตรวัดค่าเดียว/ไม่กี่ค่า บนแกน min..max ---
function ScaleChart({ scale, points }: { scale: [number, number]; points: Point[] }) {
  const [min, max] = scale;
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeTrack}>
        {min < 0 && max > 0 && <span className={styles.zeroLine} style={{ left: `${frac(0, scale) * 100}%` }} />}
        {points.map((p, i) => (
          <span key={i} className={styles.dot} style={{ left: `${frac(p.value, scale) * 100}%` }} title={`${p.label}: ${fmt(p.value)}`}>
            <span className={styles.dotLabel}>{p.label} {fmt(p.value)}</span>
          </span>
        ))}
      </div>
      <div className={styles.gaugeEnds}><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
    </div>
  );
}

// --- radar: ใยแมงมุม (ต้องมี ≥3 จุด — validate บังคับแล้ว) ---
function RadarChart({ scale, points }: { scale: [number, number]; points: Point[] }) {
  const size = 220, cx = size / 2, cy = size / 2, r = 78;
  const n = points.length;
  const pt = (i: number, radius: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  };
  const poly = points.map((p, i) => pt(i, r * frac(p.value, scale)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={styles.radar} role="img">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon key={g} points={points.map((_, i) => pt(i, r * g).join(",")).join(" ")} className={styles.grid} />
      ))}
      {points.map((_, i) => {
        const [x, y] = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className={styles.spoke} />;
      })}
      <polygon points={poly} className={styles.area} />
      {points.map((p, i) => {
        const [x, y] = pt(i, r + 14);
        return <text key={i} x={x} y={y} className={styles.radarLabel} textAnchor="middle">{clip(p.label, 10)}</text>;
      })}
    </svg>
  );
}

// --- table: ไม่อ้างว่ามีสเกลร่วม (lookup2digit ฯลฯ) — แสดง label + สรุป output ---
function TableChart({ rows }: { rows: { label: string; output: unknown }[] }) {
  return (
    <div className={styles.table}>
      {rows.map((row, i) => (
        <div key={i} className={styles.tableRow}>
          <span className={styles.tableLabel}>{row.label}</span>
          <span className={styles.tableVal}>{summarize(row.output)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- ตัวช่วย ----
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
/** ย่อ output (มักเป็น object จาก engine) ให้เป็นข้อความสั้นอ่านได้ */
function summarize(out: unknown): string {
  if (out === null || out === undefined) return "—";
  if (typeof out !== "object") return String(out);
  const o = out as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of ["energy_name", "essence", "meaning", "element", "overall_element", "relation_th", "final_score"]) {
    if (o[k] !== undefined && o[k] !== null) parts.push(String(o[k]));
  }
  return parts.length ? clip(parts.join(" · "), 120) : clip(JSON.stringify(o), 120);
}
