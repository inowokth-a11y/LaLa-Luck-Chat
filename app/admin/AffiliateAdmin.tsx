"use client";

// ส่วนแอฟฟิลิเอตในแดชบอร์ดแอดมิน — ฟอร์มสร้างลิงก์ + ตารางสถิติต่อลิงก์
// ตัวเลขทั้งหมดคำนวณฝั่ง server (หน้า /admin ส่งเข้ามาเป็น props) — component นี้ไม่คำนวณเอง
// URL ลิงก์ประกอบจาก origin จริงของหน้าที่เปิดอยู่ (dev ได้ localhost, prod ได้โดเมนจริง)

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkStats } from "@/lib/affiliate/stats";

const baht = (n: number) => "฿" + n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AffiliateAdmin({ links }: { links: LinkStats[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlFor = (c: string) => `${origin}/?ref=${c}`;

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/affiliate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerName: name.trim(), code: code.trim() || undefined, note: note.trim() || undefined }),
      });
      const d = await res.json();
      if (d.error) setMsg(`⚠️ ${d.error}`);
      else {
        setMsg(`✅ สร้างลิงก์ของ "${d.link.partner_name}" แล้ว: ${urlFor(d.link.code)}`);
        setName("");
        setCode("");
        setNote("");
        router.refresh(); // ให้ Server Component ดึงรายการ+สถิติใหม่
      }
    } catch (err) {
      setMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const res = await fetch("/api/admin/affiliate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      const d = await res.json();
      if (d.error) setMsg(`⚠️ ${d.error}`);
      else router.refresh();
    } catch (err) {
      setMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function editCommission(l: LinkStats) {
    const raw = window.prompt(`คอมมิชชันของ "${l.partner_name}" (% ของรายรับ 0-100):`, String(l.commission_pct));
    if (raw === null) return;
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setMsg("⚠️ คอมมิชชันต้องเป็นตัวเลข 0-100");
      return;
    }
    try {
      const res = await fetch("/api/admin/affiliate", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: l.id, commissionPct: pct }),
      });
      const d = await res.json();
      if (d.error) setMsg(`⚠️ ${d.error}`);
      else {
        setMsg(`✅ ตั้งคอมมิชชัน "${l.partner_name}" เป็น ${pct}%`);
        router.refresh();
      }
    } catch (err) {
      setMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function recordPayout(l: LinkStats) {
    const raw = window.prompt(
      `บันทึกยอดที่จ่ายจริงให้ "${l.partner_name}" (บาท)\nค้างจ่ายตอนนี้: ฿${l.owedThb.toFixed(2)}`,
      l.owedThb > 0 ? l.owedThb.toFixed(2) : ""
    );
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMsg("⚠️ ยอดจ่ายต้องเป็นตัวเลขมากกว่า 0");
      return;
    }
    const note = window.prompt("โน้ต (ช่องทาง/เลขอ้างอิงโอน — เว้นว่างได้):") ?? "";
    try {
      const res = await fetch("/api/admin/affiliate/payout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ linkId: l.id, amountThb: amount, note: note.trim() || undefined }),
      });
      const d = await res.json();
      if (d.error) setMsg(`⚠️ ${d.error}`);
      else {
        setMsg(`✅ บันทึกจ่าย ฿${amount.toFixed(2)} ให้ "${l.partner_name}" แล้ว`);
        router.refresh();
      }
    } catch (err) {
      setMsg(`⚠️ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function copy(c: string) {
    try {
      await navigator.clipboard.writeText(urlFor(c));
      setCopied(c);
      setTimeout(() => setCopied((cur) => (cur === c ? null : cur)), 2000);
    } catch {
      setMsg(`คัดลอกอัตโนมัติไม่ได้ — ลิงก์คือ ${urlFor(c)}`);
    }
  }

  return (
    <section style={S.card}>
      <h2 style={S.h2}>🤝 ลิงก์แอฟฟิลิเอต ({links.length})</h2>

      <form onSubmit={createLink} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.9rem" }}>
        <input style={{ ...S.input, flex: "2 1 160px" }} value={name} onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อผู้รับลิงก์ (คน/เพจ) *" maxLength={80} required />
        <input style={{ ...S.input, flex: "1 1 120px" }} value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="รหัสลิงก์ (เว้นว่าง = สุ่ม)" maxLength={32} />
        <input style={{ ...S.input, flex: "2 1 160px" }} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="โน้ต (ช่องทาง/เงื่อนไข)" maxLength={200} />
        <button type="submit" disabled={busy || !name.trim()} style={S.btn}>
          {busy ? "กำลังสร้าง…" : "+ สร้างลิงก์"}
        </button>
      </form>
      {msg && <p style={{ fontSize: "0.8rem", lineHeight: 1.5, wordBreak: "break-all", margin: "0 0 0.7rem" }}>{msg}</p>}

      {links.length === 0 ? (
        <p style={S.note}>ยังไม่มีลิงก์ — สร้างลิงก์แรกแล้วส่งให้คนที่จะช่วยทำการตลาด</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
            <thead>
              <tr>
                {["ผู้รับลิงก์", "ลิงก์", "เปิดดู", "สมัคร", "คนเติมเงิน", "เครดิตขายได้", "รายรับ", "คอม %", "ค่าคอม", "จ่ายแล้ว", "ค้างจ่าย", ""].map((h, i) => (
                  <th key={i} style={{ ...S.th, textAlign: i <= 1 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} style={l.active ? undefined : { opacity: 0.45 }}>
                  <td style={S.td}>
                    {l.partner_name}
                    {l.note && <div style={{ ...S.note, marginTop: 2 }}>{l.note}</div>}
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <code style={S.mono}>?ref={l.code}</code>{" "}
                    <button type="button" onClick={() => copy(l.code)} style={S.mini} title={urlFor(l.code)}>
                      {copied === l.code ? "✓ คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  </td>
                  <td style={S.tdR}>{l.visit_count}</td>
                  <td style={S.tdR}>{l.signups}</td>
                  <td style={S.tdR}>{l.payingUsers}</td>
                  <td style={S.tdR}>{l.creditsSold}</td>
                  <td style={{ ...S.tdR, color: "var(--gold)" }}>
                    {baht(l.revenueThb)}
                    {l.revenueUncertain && <span title="มีรายการเติมที่เทียบแพ็กปัจจุบันไม่ได้ — ยอดบาทต่ำกว่าจริง"> ⚠️</span>}
                  </td>
                  <td style={S.tdR}>
                    <button type="button" onClick={() => editCommission(l)} style={S.mini}
                      title="แก้ % คอมมิชชันของลิงก์นี้">
                      {l.commission_pct}%
                    </button>
                  </td>
                  <td style={S.tdR}>{baht(l.commissionThb)}</td>
                  <td style={S.tdR}>{baht(l.paidThb)}</td>
                  <td style={{ ...S.tdR, color: l.owedThb > 0 ? "var(--gold)" : undefined, fontWeight: l.owedThb > 0 ? 700 : undefined }}>
                    {baht(l.owedThb)}
                  </td>
                  <td style={{ ...S.tdR, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => recordPayout(l)} style={S.mini} title="บันทึกยอดที่โอนจ่ายให้พันธมิตรแล้ว">
                      บันทึกจ่าย
                    </button>{" "}
                    <button type="button" onClick={() => toggleActive(l.id, !l.active)} style={S.mini}>
                      {l.active ? "ปิด" : "เปิด"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={S.note}>
        นับผู้ใช้แบบ first-touch: ลิงก์แรกที่คนคลิกก่อนสมัครชนะ (ผูกภายใน 24 ชม. หลังสร้างบัญชี) ·
        รายรับ = ยอดเติมเครดิตจริงของคนที่มาจากลิงก์นั้น (ตาม §12: จ่ายพันธมิตรตามรายได้จริง ไม่ใช่ยอดสมัคร) ·
        ลิงก์ที่ปิดจะหยุดรับคนใหม่ แต่รายรับของคนเดิมยังนับต่อ ·
        ค่าคอม = รายรับ × % ของลิงก์ (เริ่มต้น 15% กดที่ตัวเลข % เพื่อแก้) · ปุ่มบันทึกจ่าย = จดยอดที่โอนแล้ว
        ระบบคำนวณค้างจ่ายให้เอง (ไม่มีการโอนอัตโนมัติ)
      </p>
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { padding: "1rem 1.2rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "color-mix(in srgb,var(--gold) 4%,transparent)" },
  h2: { fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.7rem" },
  input: { fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", padding: "0.5rem 0.7rem", borderRadius: 6, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  btn: { fontFamily: "var(--font-sans-thai)", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 1rem", borderRadius: 6, border: "none", background: "var(--gold,#b8860b)", color: "#faf7f0", cursor: "pointer" },
  mini: { fontFamily: "var(--font-sans-thai)", fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: 5, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  th: { padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--gold-dim,#a89870)", color: "var(--text-dim,var(--ink-dim))", fontWeight: 600, fontSize: "0.75rem" },
  td: { padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)" },
  tdR: { padding: "0.4rem 0.5rem", borderBottom: "1px solid color-mix(in srgb,var(--ink) 8%,transparent)", textAlign: "right", fontFamily: "var(--font-mono)" },
  mono: { fontFamily: "var(--font-mono)", fontSize: "0.78rem" },
  note: { fontSize: "0.74rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.6 },
};
