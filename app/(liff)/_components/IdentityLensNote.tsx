"use client";

// 🔢 มุมเลขตัวตน (เลนส์ทางเลือก) — บล็อกแสดงประกอบในโหมด ฤกษ์/ฮวงจุ้ย/wellness
// (มติผู้ใช้ 1 ก.ย. 2569: นำค่าพลังงานจากการ์ดพลังงานเข้าโหมดที่คำนวณตัวผู้ใช้ —
//  เป็นชั้นแสดงคู่ ไม่เข้าสูตรคะแนนเดิมของโหมด · ไม่เฉลี่ยรวมกับธาตุกำเนิด)
// คำนวณจากโปรไฟล์บัญชี (ชื่อ+วันเกิด+เวลา ชุดเดียวกับการ์ด /profile) — ไม่มีโปรไฟล์ = ไม่แสดง

import { useMemo } from "react";
import { useStoredProfile } from "./useStoredProfile";
import { identityLens, type IdentityLens } from "@/lib/engine/identity-lens";
import { wuXingScore, DAY_ELEMENT, THAI_LABEL_5, type Element5 } from "@/lib/engine/element";
import { DIRECTION_TO_ELEMENT, ALL_DIRECTIONS } from "@/lib/engine/fengshui";
import { getWellnessPair } from "@/lib/engine/wellness";

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function modeLine(mode: "timing" | "fengshui" | "wellness", lens: IdentityLens): string | null {
  if (mode === "timing") {
    // มุม "วันบำรุงเลนส์" — convention เดียวกับ "วันบำรุงของ" ของโหมดฤกษ์: wuXingScore(ของ, ธาตุวัน)
    const days = THAI_DAYS.filter((d) => {
      const el = DAY_ELEMENT[d] as Element5 | undefined;
      return el ? wuXingScore(lens.element, el, []).final_score === 2 : false;
    });
    return days.length ? `วันที่ธาตุประจำวันบำรุงธาตุเลขตัวตน: วัน${days.join("/วัน")}` : null;
  }
  if (mode === "fengshui") {
    const dirs = ALL_DIRECTIONS.filter(
      (d) => wuXingScore(lens.element, DIRECTION_TO_ELEMENT[d] as Element5, []).final_score === 2
    );
    return dirs.length ? `ทิศที่พลังงานบำรุงธาตุเลขตัวตน: ${dirs.join("/")}` : null;
  }
  const w = getWellnessPair(lens.element);
  return "error" in w ? null : `เทคนิคประจำธาตุเลขตัวตน: ${w.internal.name}`;
}

export default function IdentityLensNote({ mode }: { mode: "timing" | "fengshui" | "wellness" }) {
  const { profile } = useStoredProfile();
  const lens = useMemo(() => {
    if (!profile?.birth_date) return null;
    try {
      return identityLens(profile.birth_date, {
        name: [profile.first_name, profile.last_name].filter(Boolean).join("") || null,
        birthTime: profile.birth_time ?? null,
      });
    } catch {
      return null;
    }
  }, [profile]);
  if (!lens) return null;
  const extra = modeLine(mode, lens);
  return (
    <details style={S.box}>
      <summary style={S.sum}>🔢 มุมเลขตัวตนของคุณ (เลนส์ทางเลือก)</summary>
      <p style={S.row}>
        เลขตัวตน <strong>{lens.number}</strong> · การ์ด &quot;{lens.card.name ?? "-"}&quot; · ธาตุจากเลขตัวตน:{" "}
        <strong>{lens.elementTh}</strong>
      </p>
      <p style={S.row}>
        คะแนน 5 ด้านของเลขตัวตน:{" "}
        {Object.entries(lens.aspects.คะแนน).map(([k, v]) => `${k} ${v}`).join(" · ")} · ภาพรวม{" "}
        <strong>{lens.aspects.ภาพรวม}/10</strong>
      </p>
      {extra && <p style={S.row}>{extra}</p>}
      <p style={S.note}>
        มุมนี้แสดงคู่กับธาตุกำเนิด (แกนหลักของโหมดนี้) — สองมุมไม่เฉลี่ยรวมกัน เลือกจุดเน้นได้เอง ·{" "}
        {lens.caveats[0]}
      </p>
    </details>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: {
    margin: "1rem 0",
    padding: "0.7rem 1rem",
    borderRadius: 10,
    border: "1px solid var(--gold-dim, #a89870)",
    background: "var(--surface, #fffdf8)",
    color: "var(--text, #1d1812)",
  },
  sum: { cursor: "pointer", fontWeight: 600, fontSize: "0.92rem", color: "var(--gold, #8a6d1d)" },
  row: { margin: "0.5rem 0 0", fontSize: "0.88rem", lineHeight: 1.7 },
  note: { margin: "0.6rem 0 0", fontSize: "0.74rem", opacity: 0.75, lineHeight: 1.6 },
};
