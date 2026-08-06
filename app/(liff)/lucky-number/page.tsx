"use client";

// หน้า SEO + เครื่องคิดเลขมงคล "ดูดวงทะเบียนรถ/เบอร์โทร/บ้านเลขที่" (เฟส 1 SEO — 6 ส.ค. 2569)
//
// จุดต่างจากบทความคู่แข่ง: คำนวณจริงในเบราว์เซอร์ทันที (engine ล้วน ฿0 ไม่ต้องล็อกอิน ไม่ยิง server)
// — ไม่ล็อกอิน = คะแนนจากตัวเลขล้วน · แนะนำเปิดการ์ดเพื่อคิดชั้น "ความเข้ากับธาตุประจำตัว" เพิ่ม
// เนื้อหา SEO ด้านล่างเป็น static ให้ crawler อ่านครบโดยไม่ต้องกดอะไร

import { useState } from "react";
import Link from "next/link";
import { numberAspects, NUMBER_ASPECTS_CAVEAT, type NumberAspectsResult } from "@/lib/engine/number-aspects";
import MascotLogo from "@/app/_components/MascotLogo";
import FunctionChat from "../_components/FunctionChat";

export default function LuckyNumberPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<NumberAspectsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calc(e: React.FormEvent) {
    e.preventDefault();
    const digits = input.replace(/\D/g, "");
    if (!digits || digits.length > 10) {
      setError("ใส่ตัวเลข 1-10 หลัก เช่น ทะเบียน 6266 หรือเบอร์ 0812345678");
      setResult(null);
      return;
    }
    setError(null);
    setResult(numberAspects(digits)); // ไม่มีโปรไฟล์ = คะแนนจากตัวเลขล้วน (บอกผู้ใช้ตรงๆ ด้านล่าง)
  }

  return (
    <main className="tone-marble" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1.2rem 1rem 4rem" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "1rem" }}>
          <MascotLogo size={90} />
          <h1 style={{ fontFamily: "var(--font-serif-thai)", color: "var(--gold)", fontSize: "1.5rem", margin: "0.4rem 0 0.3rem" }}>
            ดูดวงทะเบียนรถ เบอร์โทร บ้านเลขที่
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-dim)", lineHeight: 1.6 }}>
            ใส่เลขแล้วรับคะแนน 5 ด้านทันที — ฟรี ไม่ต้องสมัคร คำนวณจากเลขศาสตร์และหลักธาตุจริง
          </p>
        </header>

        <form onSubmit={calc} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="เช่น 6266 · 0812345678 · 99"
            inputMode="numeric"
            aria-label="เลขที่ต้องการดูดวง"
            style={{
              flex: 1, padding: "0.7rem 0.9rem", borderRadius: 10, fontSize: "1rem",
              border: "1px solid color-mix(in srgb, var(--gold) 45%, transparent)",
              background: "var(--surface, #fff)", color: "var(--ink)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.7rem 1.2rem", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--gold)", color: "#faf7f0", fontWeight: 700, fontFamily: "var(--font-sans-thai)",
            }}
          >
            🔮 ดูดวงเลขนี้
          </button>
        </form>
        {error && <p style={{ color: "var(--bad, #a83a1e)", fontSize: "0.85rem" }}>⚠️ {error}</p>}

        {result && (
          <section aria-live="polite" style={{ border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)", borderRadius: 12, padding: "1rem 1.1rem", marginBottom: "1rem", background: "color-mix(in srgb, var(--gold) 5%, transparent)" }}>
            <h2 style={{ fontFamily: "var(--font-serif-thai)", fontSize: "1.05rem", color: "var(--gold)", margin: "0 0 0.5rem" }}>
              เลข {result.เลข} — ธาตุ{result.ธาตุของเลข} · ภาพรวม {result.ภาพรวม}/10
            </h2>
            {Object.entries(result.คะแนน).map(([d, v]) => (
              <div key={d} style={{ marginBottom: "0.45rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span>{d}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{v}/10</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "color-mix(in srgb, var(--ink) 10%, transparent)" }}>
                  <div style={{ width: `${v * 10}%`, height: "100%", borderRadius: 4, background: "var(--gold)" }} />
                </div>
              </div>
            ))}
            {result.ความหมายเลขท้าย && (
              <p style={{ fontSize: "0.85rem", lineHeight: 1.6, margin: "0.6rem 0 0" }}>
                ✨ <b>ความหมายเลขท้าย:</b> {result.ความหมายเลขท้าย}
              </p>
            )}
            {result.จุดเด่น.map((t, i) => (
              <p key={i} style={{ fontSize: "0.82rem", lineHeight: 1.55, margin: "0.4rem 0 0" }}>✅ {t}</p>
            ))}
            {result.ข้อควรระวัง.map((t, i) => (
              <p key={i} style={{ fontSize: "0.82rem", lineHeight: 1.55, margin: "0.4rem 0 0" }}>⚠️ {t}</p>
            ))}
            <p style={{ fontSize: "0.75rem", opacity: 0.65, lineHeight: 1.55, marginTop: "0.6rem" }}>{NUMBER_ASPECTS_CAVEAT}</p>
            <div style={{ marginTop: "0.8rem", padding: "0.7rem 0.8rem", borderRadius: 10, background: "color-mix(in srgb, var(--gold) 12%, transparent)", fontSize: "0.87rem", lineHeight: 1.6 }}>
              💡 คะแนนนี้คิดจากตัวเลขล้วน — <b>อยากรู้ว่าเลขนี้เข้ากับดวงของคุณโดยเฉพาะไหม?</b>{" "}
              <Link href="/" style={{ color: "var(--gold)", fontWeight: 700 }}>
                เปิดการ์ดพลังงานจากวันเกิด (ฟรี) →
              </Link>{" "}
              แล้วถามแม่หมอได้เลยว่า &ldquo;เลขนี้เข้ากับฉันไหม&rdquo;
            </div>
          </section>
        )}

        {/* เนื้อหา SEO — static ให้ crawler อ่านได้โดยไม่ต้องกดคำนวณ */}
        <article style={{ fontSize: "0.88rem", lineHeight: 1.75, color: "var(--ink)" }}>
          <h2 style={h2}>ดูดวงทะเบียนรถ ดูยังไงให้ถูกหลัก</h2>
          <p>
            เลขทะเบียนรถส่งพลังผ่านสองชั้น: <b>อุปนิสัยของเลขแต่ละหลัก</b>ตามเลขศาสตร์ (เช่น เลข 6
            เด่นการเงินและเสน่ห์ เลข 8 เด่นทรัพย์และอำนาจ เลข 9 เด่นโชคและการคุ้มครอง) และ
            <b>ธาตุประจำเลข</b>ตามหลักเบญจธาตุ โดยเลขท้ายของทะเบียนถือว่ามีน้ำหนักมากที่สุด
            เครื่องมือด้านบนคำนวณทั้งสองชั้นให้อัตโนมัติ พร้อมสรุปเป็นคะแนน 5 ด้าน:
            การเงิน · ความรักและความสัมพันธ์ · สุขภาพกายและใจ · โชคและเสริมดวง · อำนาจบารมี
          </p>
          <h2 style={h2}>ดูดวงเบอร์โทรศัพท์ ต่างจากทะเบียนรถไหม</h2>
          <p>
            ใช้หลักเดียวกันแต่เบอร์มือถือมีหลักมากกว่า (10 หลัก) พลังของเลขจึงเฉลี่ยจากทุกหลัก
            โดยเลขท้ายคู่ยังคงมีน้ำหนักพิเศษ — ใส่เบอร์ได้ทั้งแบบมีขีด (081-234-5678) หรือไม่มีขีด
            ระบบตัดให้เอง และถ้าเข้าสู่ระบบพร้อมกรอกวันเกิด ระบบจะคำนวณเพิ่มอีกชั้นว่า
            <b>ธาตุของเบอร์เข้ากับธาตุประจำตัวคุณ</b>หรือไม่ (บางเลขที่ดูธรรมดา อาจกลายเป็น
            &ldquo;เลขยา&rdquo; ที่เติมธาตุที่คุณขาดพอดี)
          </p>
          <h2 style={h2}>บ้านเลขที่ ก็ดูได้</h2>
          <p>
            บ้านเลขที่ส่งผลต่อพลังงานของที่อยู่อาศัยในภาพรวม ใช้เครื่องมือเดียวกันนี้ใส่เลขบ้านได้เลย
            และถ้าอยากดูลึกถึงทิศทางการจัดบ้าน ลองเมนู{" "}
            <Link href="/fengshui" style={{ color: "var(--gold)" }}>🧭 ฮวงจุ้ย</Link> ต่อได้
          </p>
          <h2 style={h2}>ทำไมที่นี่ไม่เหมือนเว็บดูดวงทั่วไป</h2>
          <p>
            LaLa Lucky Chat ให้ AI เป็นเพียงผู้เรียบเรียงคำตอบ — <b>ตัวเลขทุกตัวมาจากการคำนวณจริง</b>
            ของระบบ ไม่ใช่การเดาของ AI (อ่านเพิ่มที่{" "}
            <Link href="/ai" style={{ color: "var(--gold)" }}>ดูดวง AI แม่นไหม?</Link>) อยากถามต่อ
            แบบเจาะจงดวงตัวเอง เช่น เทียบทะเบียนหลายป้าย เลือกเบอร์ใหม่ หรือหาฤกษ์ออกรถ{" "}
            <Link href="/" style={{ color: "var(--gold)" }}>เปิดการ์ดพลังงานฟรีแล้วถามแม่หมอ</Link>{" "}
            ได้ไม่จำกัดเรื่องคำนวณพื้นฐาน
          </p>
        </article>

        <FunctionChat logicId={2} context={result} placeholder="ถามเรื่องเลขนี้ เช่น เทียบกับอีกเบอร์" />
      </div>
    </main>
  );
}

const h2: React.CSSProperties = {
  fontFamily: "var(--font-serif-thai)",
  fontSize: "1.05rem",
  color: "var(--gold)",
  margin: "1.2rem 0 0.3rem",
};
