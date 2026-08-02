"use client";

// ปุ่มแชร์การ์ด + รางวัล +2 คำถามฟรี (ครั้งเดียวต่อบัญชี) — เฟส 2
//
// มือถือ: navigator.share (ระบบแชร์ของเครื่อง) — resolve = แชร์เสร็จ → เคลม ·
//         ผู้ใช้กดยกเลิก (AbortError) → ไม่เคลม
// desktop: ลิงก์ LINE/Facebook/X + คัดลอกลิงก์ — ไม่มีสัญญาณยืนยัน → เคลมตอนกด
//         (ข้อจำกัดที่ยอมรับแล้ว — กันฟาร์มด้วย "ครั้งเดียวต่อบัญชี" ฝั่ง DB)

import { useEffect, useState } from "react";
import { cardShareUrl, shareLinks, shareText, SHARE_REWARD_QUESTIONS } from "@/lib/share";
import { useSyncStatus } from "@/app/_components/AuthStatus";

interface Props {
  cardId: string;
  cardName: string | null;
  /** ชื่อบุคคลต้นแบบ (archetype_figure) — มีแล้วข้อความแชร์จะชูชื่อนี้แทนชื่อการ์ด */
  figure?: string | null;
}

export default function ShareCard({ cardId, cardName, figure }: Props) {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    let active = true;
    fetch("/api/share/claim")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setClaimed(Boolean(d.claimed));
        setLoggedIn(Boolean(d.loggedIn));
        setNeedsUpgrade(Boolean(d.needsUpgrade));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const url = cardShareUrl(typeof window !== "undefined" ? window.location.origin : "", cardId);
  const text = shareText(cardName, figure);
  const links = shareLinks(url, text);

  async function claim() {
    try {
      const res = await fetch("/api/share/claim", { method: "POST" });
      const d = await res.json();
      if (d.rewarded) {
        setClaimed(true);
        setMessage(d.message);
        syncStatus(); // อัปเดตแถบสถานะ (คำถามฟรี +2)
      } else if (d.alreadyClaimed) {
        setClaimed(true);
      } else if (d.needsUpgrade || d.needsLogin) {
        setNeedsUpgrade(true);
        setMessage(d.error);
      }
    } catch {
      /* เคลมพลาด — ผู้ใช้กดแชร์ใหม่ได้ ไม่ต้องรบกวน */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "LaLa Lucky Chat", text, url });
      await claim(); // resolve = ผ่านหน้าแชร์ของระบบแล้ว
    } catch {
      /* ผู้ใช้กดยกเลิก (AbortError) — ไม่เคลม */
    }
  }

  function openAndClaim(href: string) {
    window.open(href, "_blank", "noopener");
    void claim();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("คัดลอกลิงก์แล้ว — เอาไปวางที่ไหนก็ได้เลยค่ะ");
      void claim();
    } catch {
      setMessage(url); // clipboard ใช้ไม่ได้ → โชว์ลิงก์ให้คัดลอกเอง
    }
  }

  const hasNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const btn: React.CSSProperties = {
    fontFamily: "var(--font-sans-thai)",
    fontSize: "0.85rem",
    padding: "0.55rem 1rem",
    borderRadius: 8,
    border: "1px solid var(--gold-dim, #cbb98f)",
    background: "var(--card-bg, #fffdf8)",
    color: "var(--ink, #2b2620)",
    cursor: "pointer",
  };

  return (
    <section
      style={{
        marginTop: "1rem",
        padding: "1rem 1.1rem",
        border: "1px dashed var(--gold, #b8860b)",
        background: "color-mix(in srgb, var(--gold, #b8860b) 6%, transparent)",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6 }}>
        📤 <b>แชร์การ์ดของคุณ</b>
        {claimed === false && loggedIn && (
          <> — รับคำถามฟรีเพิ่ม <b>{SHARE_REWARD_QUESTIONS} ข้อ</b> (รับได้ครั้งเดียว)</>
        )}
        {claimed === true && <> — รับรางวัลแชร์ไปแล้ว ขอบคุณที่บอกต่อค่ะ 🐾</>}
        {needsUpgrade && (
          <>
            {" — "}
            <a href="/login?next=/profile" style={{ color: "var(--gold)" }}>
              ผูกบัญชี
            </a>{" "}
            เพื่อรับคำถามฟรี +{SHARE_REWARD_QUESTIONS}
          </>
        )}
      </p>
      <p style={{ margin: "0.3rem 0 0.7rem", fontSize: "0.78rem", color: "var(--ink-dim, #6b6255)" }}>
        หน้าแชร์มีแค่ข้อมูลการ์ด (เลข/ชื่อ/ความหมาย) — ไม่มีวันเกิดหรือข้อมูลส่วนตัวของคุณ
      </p>
      {/* โชว์ปุ่มแพลตฟอร์มเสมอ — เดิมซ่อนเมื่อมี navigator.share แล้วผู้ใช้หาปุ่ม Facebook
          ไม่เจอ (feedback จริง 2 ส.ค. 2569) · native share เป็นปุ่มเสริมเมื่อเครื่องรองรับ */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {hasNative && (
          <button onClick={nativeShare} style={{ ...btn, background: "var(--gold)", color: "#fffdf8", border: "1px solid var(--gold)" }}>
            📤 แชร์การ์ด
          </button>
        )}
        <button onClick={() => openAndClaim(links.facebook)} style={btn}>Facebook</button>
        <button onClick={() => openAndClaim(links.line)} style={btn}>LINE</button>
        <button onClick={() => openAndClaim(links.x)} style={btn}>X</button>
        <button onClick={copyLink} style={btn}>🔗 คัดลอกลิงก์</button>
      </div>
      {message && <p style={{ margin: "0.6rem 0 0", fontSize: "0.85rem", color: "var(--good, #2f6b3f)" }}>{message}</p>}
    </section>
  );
}
