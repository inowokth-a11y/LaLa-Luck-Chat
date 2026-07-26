// แดชบอร์ดแอดมิน — ต้นทุน AI จาก ai_usage_log (§12/§15)
// 🔒 Server Component: gate ด้วยอีเมลแอดมิน (env ADMIN_EMAILS) ก่อนแตะข้อมูล ·
//    query ด้วย service role (ai_usage_log ไม่มี RLS policy = client อ่านไม่ได้)
//    ไม่ใช่แอดมิน → redirect ไป / (ไม่บอกว่ามีหน้านี้)

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { computeUsageStats, type UsageRow, type UsageStats } from "@/lib/admin/usage-stats";
import { summarizeQuestions, type QuestionRow } from "@/lib/admin/question-stats";
import AdminAssistant from "./AdminAssistant";

export const dynamic = "force-dynamic"; // อ่าน session + DB ทุกครั้ง

const baht = (n: number) => "฿" + n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => (n * 100).toFixed(0) + "%";

export default async function AdminPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email ?? null;
  if (!isAdminEmail(email, getAdminEmails())) redirect("/");

  const svc = createServiceClient();
  const { data: rows, error } = await svc
    .from("ai_usage_log")
    .select("user_id,channel,logic_id,ai_role,provider,model,used_fallback,cost_thb,cache_hit,ok,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const stats = computeUsageStats((rows as UsageRow[] | null) ?? []);
  const maxDay = Math.max(1, ...stats.byDay.map((d) => d.costThb));

  // ประวัติคำถาม (เน้น unclear = สิ่งที่ยังตอบไม่ได้ → จัดลำดับฟีเจอร์)
  const { data: qRows } = await svc
    .from("chat_question_log")
    .select("question,status,fns,created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const q = summarizeQuestions((qRows as QuestionRow[] | null) ?? []);

  return (
    <main className="tone-marble" style={S.page}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <h1 style={S.h1}>แดชบอร์ดต้นทุน AI</h1>
        <span style={S.dim}>
          {stats.dateRange ? `${stats.dateRange.from} → ${stats.dateRange.to}` : "ยังไม่มีข้อมูล"} · {email}
        </span>
      </header>

      {error && <p style={{ color: "var(--bad,#a83a1e)" }}>โหลดข้อมูลไม่สำเร็จ: {error.message}</p>}

      <section style={S.tiles}>
        <Tile label="ต้นทุนรวม" value={baht(stats.totalCostThb)} />
        <Tile label="เฉลี่ย/คำถาม" value={baht(stats.avgCostPerCall)} />
        <Tile label="เรียก AI ทั้งหมด" value={String(stats.totalCalls)} />
        <Tile label="Cache hit rate" value={pct(stats.cacheHitRate)} sub={`${stats.cacheHits} ฮิต`} />
        <Tile label="อัตราล่ม" value={pct(stats.failRate)} sub={`${stats.failures} ครั้ง`} warn={stats.failRate > 0.1} />
      </section>

      <AdminAssistant />

      <Card title="ต้นทุนรายวัน (14 วันล่าสุด)">
        {stats.byDay.length === 0 ? <Empty /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {stats.byDay.map((d) => (
              <div key={d.day} style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", alignItems: "center", gap: "0.6rem" }}>
                <span style={S.mono}>{d.day.slice(5)}</span>
                <span style={S.track}><span style={{ ...S.fill, width: `${Math.max(3, (d.costThb / maxDay) * 100)}%` }} /></span>
                <span style={{ ...S.mono, color: "var(--gold)" }}>{baht(d.costThb)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="แยกตามบทบาท AI">
        <Table head={["บทบาท", "ครั้ง", "ต้นทุนรวม", "เฉลี่ย/ครั้ง"]}
          rows={stats.byRole.map((r) => [r.role, String(r.calls), baht(r.costThb), baht(r.avgCostThb)])} />
      </Card>

      <Card title="แยกตามโมเดล (+ จำนวนที่ล่ม)">
        <Table head={["provider/model", "ครั้ง", "ต้นทุน", "ล่ม"]}
          rows={stats.byModel.map((m) => [`${m.provider}/${m.model}`, String(m.calls), baht(m.costThb), m.failures ? `⚠️ ${m.failures}` : "0"])} />
      </Card>

      <Card title="ผู้ใช้ที่ใช้ต้นทุนสูงสุด">
        <Table head={["ผู้ใช้", "ครั้ง", "ต้นทุนรวม"]}
          rows={stats.topSpenders.map((u) => [u.userId, String(u.calls), baht(u.costThb)])} />
        <p style={S.note}>ส่วนใหญ่ยัง &ldquo;(ไม่ล็อกอิน)&rdquo; — จะแยกรายคนได้ชัดเมื่อผูกการใช้งานกับ auth_uid ครบทุก flow</p>
      </Card>

      <Card title={`ประวัติคำถามแชท (${q.total}) · ตอบได้ ${pct(q.answeredRate)}`}>
        {q.total === 0 ? <Empty /> : (
          <Table head={["สถานะ", "จำนวน"]} rows={q.byStatus.map((s) => [
            s.status === "answered" ? "ตอบได้" : s.status === "unclear" ? "ยังตอบไม่ได้" : "ขอข้อมูลเพิ่ม",
            String(s.count),
          ])} />
        )}
      </Card>

      <Card title="✅ คำถามที่ระบบตอบได้ (ล่าสุด)">
        {q.recentAnswered.length === 0 ? (
          <p style={S.note}>ยังไม่มีคำถามที่ตอบได้ในบันทึก</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {q.recentAnswered.map((a, i) => (
              <div key={i} style={{ ...S.td, borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)", fontSize: "0.85rem" }}>
                “{a.question}” <span style={{ ...S.dim, fontSize: "0.7rem" }}>· ใช้ {a.fns.join(", ") || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="🔴 คำถามที่ยังตอบไม่ได้ (จัดลำดับฟีเจอร์ถัดไป)">
        {q.recentUnclear.length === 0 ? (
          <p style={S.note}>ยังไม่มีคำถามที่ตอบไม่ได้ — ดีมาก แปลว่า engine ครอบคลุมสิ่งที่ผู้ใช้ถาม</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {q.recentUnclear.map((u, i) => (
              <div key={i} style={{ ...S.td, borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)", fontSize: "0.85rem" }}>
                “{u.question}” <span style={{ ...S.dim, fontSize: "0.7rem" }}>· {u.created_at.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p style={S.note}>
        💡 กำไรทั้งธุรกิจขึ้นกับ cache hit rate (§12) — dream ที่ปลุก AI-1 ต้นทุน ~฿7.46/ครั้ง
        ถ้าตอบจากแคชได้ = ฿0 · ระบบเครดิตเติมเงิน (ต่อ Omise) คือสไลซ์ถัดไป
      </p>
      <Link href="/" style={S.back}>← กลับหน้าแรก</Link>
    </main>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div style={{ ...S.tile, ...(warn ? { borderColor: "var(--bad,#a83a1e)" } : {}) }}>
      <span style={S.dim}>{label}</span>
      <strong style={{ fontSize: "1.5rem", color: warn ? "var(--bad,#a83a1e)" : "var(--gold)", fontFamily: "var(--font-mono)" }}>{value}</strong>
      {sub && <span style={{ ...S.dim, fontSize: "0.72rem" }}>{sub}</span>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.card}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </section>
  );
}
function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} style={{ ...S.th, textAlign: i === 0 ? "left" : "right" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ ...S.td, textAlign: ci === 0 ? "left" : "right", fontFamily: ci === 0 ? "inherit" : "var(--font-mono)" }}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const Empty = () => <p style={S.note}>ยังไม่มีข้อมูล</p>;

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--text,var(--ink))", maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.2rem 4rem", display: "flex", flexDirection: "column", gap: "1.2rem" },
  h1: { fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)", margin: 0 },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.7rem" },
  dim: { color: "var(--text-dim,var(--ink-dim))", fontSize: "0.8rem" },
  tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.7rem" },
  tile: { display: "flex", flexDirection: "column", gap: "0.2rem", padding: "0.9rem 1rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 6%,transparent)" },
  card: { padding: "1rem 1.2rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 4%,transparent)" },
  track: { position: "relative", height: 16, borderRadius: 3, background: "color-mix(in srgb,var(--ink) 8%,transparent)", overflow: "hidden" },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, background: "var(--gold)", borderRadius: 3 },
  th: { padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--gold-dim,#a89870)", color: "var(--text-dim,var(--ink-dim))", fontWeight: 600, fontSize: "0.78rem" },
  td: { padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)" },
  mono: { fontFamily: "var(--font-mono)", fontSize: "0.8rem" },
  note: { fontSize: "0.76rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.6, marginTop: "0.6rem" },
  back: { color: "var(--gold)", fontSize: "0.85rem", textDecoration: "none" },
};
