// เนื้อหา SEO ใต้เครื่องมือดูดวงแมว (9 ก.ย. 2569) — component ไม่มี hook (render เป็น HTML ตอน SSR)
// เนื้อหา: ที่มาตำรา · 18 ชนิดลิงก์ไปหน้ารายชนิด · ตารางสีแมวถูกโฉลกตามวันเกิด (คำนวณจาก engine) · FAQ
import Link from "next/link";
import { catSeoEntries, dayCatColorRows, catHubFaq, CAT_SEO_INTRO_TH, CAT_DAY_COLOR_CAVEAT, CAT_ELEMENT_NOTE } from "@/lib/cat/seo";
import { THAI_LABEL_5 } from "@/lib/engine/element";
import styles from "./cat.module.css";

const th: React.CSSProperties = { textAlign: "left", padding: "0.4rem 0.5rem", borderBottom: "1px solid rgba(184,134,11,0.4)", fontSize: "0.8rem" };
const td: React.CSSProperties = { padding: "0.4rem 0.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", verticalAlign: "top", fontSize: "0.84rem", lineHeight: 1.6 };

export default function CatSeoContent() {
  const entries = catSeoEntries();
  const rows = dayCatColorRows();
  const faq = catHubFaq();
  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.h2}>แมวมงคล 17 ชนิดในตำรา</h2>
        <p className={styles.note}>{CAT_SEO_INTRO_TH}</p>
        <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0 0", fontSize: "0.85rem", lineHeight: 1.7 }}>
          {entries.map((b) => (
            <li key={b.key}>
              <Link href={`/cat/${encodeURIComponent(b.slug)}`} style={{ color: "var(--gold, #96700a)", fontWeight: 700 }}>
                {b.nameTh}
              </Link>
              {b.aliasTh ? ` (${b.aliasTh})` : ""}{b.inTamra ? "" : " — นอกสมุดข่อย"}: {b.traitsTh} · <i>{b.boonTh}</i>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>เลี้ยงแมวสีอะไรถูกโฉลก ตามวันเกิดของคุณ</h2>
        <p className={styles.note}>
          ธาตุประจำวันเกิดของคน เทียบกับธาตุจากสีขนแมว (ขาว/เทา = ทอง · ดำ = น้ำ · น้ำตาล/ครีม = ดิน · ส้ม = ไฟ)
          ด้วยหลักเบญจธาตุชุดเดียวกับที่ระบบใช้ทำนายจริง — ✅ เกื้อหนุน/กลมกลืน · 💛 ควรดูแลสมดุล (ไม่ใช่ห้ามเลี้ยง)
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
            <thead>
              <tr><th style={th}>วันเกิด</th><th style={th}>ธาตุประจำวัน</th><th style={th}>✅ สีขนที่เกื้อหนุน/กลมกลืน</th><th style={th}>💛 สีขนที่ควรดูแลสมดุล</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td style={td}>วัน{r.day}</td>
                  <td style={td}>{THAI_LABEL_5[r.dayEl]}</td>
                  <td style={td}>
                    {[...r.support, ...r.harmony].map((c) => `${c.colorTh} (${c.score > 0 ? "+" : ""}${c.score})`).join(" · ") || "—"}
                  </td>
                  <td style={td}>{r.care.map((c) => `${c.colorTh} (${c.score})`).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note} style={{ marginTop: "0.6rem" }}>⚠️ {CAT_DAY_COLOR_CAVEAT}</p>
        <p className={styles.note}>{CAT_ELEMENT_NOTE}</p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>คำถามที่พบบ่อยเรื่องดูดวงแมว</h2>
        {faq.map((f) => (
          <div key={f.q} style={{ marginBottom: "0.6rem" }}>
            <p style={{ fontWeight: 700, margin: "0.2rem 0", fontSize: "0.9rem" }}>{f.q}</p>
            <p style={{ margin: "0.1rem 0", fontSize: "0.86rem", lineHeight: 1.7 }}>{f.a}</p>
          </div>
        ))}
        <p className={styles.note} style={{ marginTop: "0.5rem" }}>
          แมวหาย? <Link href="/cat/lost" style={{ color: "var(--gold, #96700a)", fontWeight: 700 }}>วางแผนตามหาแมวหายตามทิศ ระยะ และฤกษ์ →</Link>
        </p>
      </section>
    </>
  );
}
