"use client";

// FaceCardStudio — สร้าง "ภาพฉันในบทบาทการ์ด" ใต้การ์ดบนหน้า /profile (face-card เฟส 1)
//
// 🔴 ชีวมิติ: ต้องติ๊ก consent ชัดแจ้งก่อนส่งรูปทุกครั้ง (FACE_CONSENT_* จาก lib/face-card/consent)
//    รูปย่อฝั่ง client ผ่าน canvas (≤1024px JPEG) — re-encode = ล้าง EXIF/GPS ให้ฟรี
// สิทธิ์: ฟรี 1 ครั้ง/บัญชีถาวร · เจนซ้ำ 40 เครดิต (ผู้ใช้เคาะ — คิว §15)

import { useEffect, useRef, useState } from "react";
import {
  FACE_CONSENT_CHECKBOX,
  FACE_CONSENT_DETAILS,
} from "@/lib/face-card/consent";
import { useSyncStatus } from "@/app/_components/AuthStatus";

interface Props {
  cardId: string;
  cardName: string | null;
}

interface Status {
  has: boolean;
  freeUsed: boolean;
  cost: number;
  imageUrl?: string | null;
  shareUrl?: string;
  storyUrl?: string;
}

/** ย่อรูป ≤1024px → JPEG dataURL (identity ต้องการรายละเอียดมากกว่างาน vision ปกติ) */
async function downscaleFace(file: File, maxPx = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    // พื้นขาวกัน PNG โปร่งใสกลายเป็นดำตอนแปลง JPEG
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const S = {
  box: {
    marginTop: "1.25rem",
    background: "var(--card-bg)",
    border: "1px solid var(--marble-vein)",
    borderLeft: "3px solid var(--gold)",
    padding: "1.25rem",
  } as React.CSSProperties,
  h: { fontSize: "1.05rem", color: "var(--gold)", marginBottom: "0.6rem" } as React.CSSProperties,
  note: { color: "var(--ink-dim)", fontSize: "0.78rem", lineHeight: 1.6 } as React.CSSProperties,
  btn: {
    padding: "0.6rem 1.1rem",
    background: "var(--gold)",
    color: "var(--card-bg)",
    border: "none",
    borderRadius: 3,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: "pointer",
  } as React.CSSProperties,
  ghostBtn: {
    padding: "0.55rem 1rem",
    background: "transparent",
    color: "var(--gold)",
    border: "1px solid var(--gold)",
    borderRadius: 3,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
  err: { color: "var(--bad)", fontSize: "0.85rem", marginTop: "0.5rem" } as React.CSSProperties,
};

export default function FaceCardStudio({ cardId, cardName }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTopup, setNeedsTopup] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    let active = true;
    fetch("/api/face-card")
      .then(async (r) => {
        const d = await r.json();
        if (!active) return;
        if (r.status === 401) setNeedsLogin(true);
        else if (r.ok) setStatus(d as Status);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPreview(await downscaleFace(f));
    } catch {
      setError("อ่านไฟล์รูปไม่สำเร็จค่ะ ลองรูปอื่น");
    }
  }

  async function generateArt() {
    if (!preview || !consent) return;
    setBusy(true);
    setError(null);
    setNeedsTopup(false);
    try {
      const r = await fetch("/api/face-card", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: preview, cardId, consent: true }),
      });
      const d = await r.json();
      if (r.status === 401) {
        setNeedsLogin(true);
        setError(d.error ?? "กรุณาเข้าสู่ระบบก่อนค่ะ");
      } else if (r.status === 429) {
        setNeedsTopup(true);
        setError(d.message ?? "เครดิตไม่พอค่ะ");
      } else if (!r.ok) {
        setError(d.error ?? "สร้างภาพไม่สำเร็จค่ะ");
      } else {
        setStatus({
          has: true,
          freeUsed: true,
          cost: status?.cost ?? 40,
          imageUrl: d.imageUrl,
          shareUrl: d.shareUrl,
          storyUrl: d.storyUrl,
        });
        setPreview(null);
        setConsent(false);
        setRegenOpen(false);
        syncStatus();
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      setBusy(false);
    }
  }

  async function copyShare() {
    if (!status?.shareUrl) return;
    const url = `${window.location.origin}${status.shareUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("คัดลอกไม่สำเร็จค่ะ");
    }
  }

  async function nativeShare() {
    if (!status?.shareUrl) return;
    const url = `${window.location.origin}${status.shareUrl}`;
    try {
      await navigator.share({ url, text: `✨ ฉันในบทบาท "${cardName ?? "การ์ดพลังงาน"}" — เปิดการ์ดของคุณบ้างสิ 🐾` });
    } catch {
      /* ผู้ใช้ยกเลิก — เงียบ */
    }
  }

  if (needsLogin) {
    return (
      <div style={S.box}>
        <h3 style={S.h}>🎨 ภาพฉันในบทบาทการ์ด</h3>
        <p style={S.note}>สร้างภาพศิลปะ &quot;คุณในบทบาทการ์ด&quot; จากรูปถ่ายของคุณ (สไตล์เดียวกับการ์ดจริง) — เปิดให้บัญชีถาวร ฟรี 1 ครั้ง</p>
        <a href="/login?next=/profile" style={{ ...S.ghostBtn, marginTop: "0.7rem" }}>เข้าสู่ระบบ / ผูกบัญชี →</a>
      </div>
    );
  }

  const uploadForm = (
    <div style={{ marginTop: "0.6rem" }}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} style={{ fontSize: "0.85rem" }} />
      {preview && (
        <div style={{ marginTop: "0.7rem", display: "flex", gap: "0.9rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="รูปที่เลือก" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8, border: "1px solid var(--marble-vein)" }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.82rem", lineHeight: 1.55, cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{FACE_CONSENT_CHECKBOX}</span>
            </label>
            <details style={{ marginTop: "0.4rem" }}>
              <summary style={{ ...S.note, cursor: "pointer" }}>อ่านรายละเอียดการใช้ข้อมูลใบหน้า</summary>
              <ul style={{ ...S.note, paddingLeft: "1.1rem", marginTop: "0.3rem" }}>
                {FACE_CONSENT_DETAILS.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      )}
      {error && <p style={S.err}>{error}</p>}
      {needsTopup && (
        <a href="/account" style={{ ...S.ghostBtn, marginTop: "0.5rem" }}>⭐ เติมเครดิต →</a>
      )}
      {preview && (
        <button type="button" style={{ ...S.btn, marginTop: "0.8rem", opacity: consent && !busy ? 1 : 0.55 }} disabled={!consent || busy} onClick={generateArt}>
          {busy
            ? "กำลังวาดภาพ... (~15 วินาที)"
            : status?.freeUsed
              ? `🎨 สร้างภาพใหม่ (${status?.cost ?? 40} เครดิต)`
              : "🎨 สร้างภาพของฉัน (ฟรีครั้งแรก)"}
        </button>
      )}
    </div>
  );

  return (
    <div style={S.box}>
      <h3 style={S.h}>🎨 ภาพฉันในบทบาทการ์ด</h3>
      {!status?.has && (
        <>
          <p style={S.note}>
            อัปโหลดรูปถ่ายหน้าตรง แล้ว AI จะวาดคุณเป็นตัวละครของการ์ด &quot;{cardName ?? cardId}&quot;
            ในสไตล์ศิลปะเดียวกับการ์ดจริง — ฟรีครั้งแรก · สร้างใหม่ {status?.cost ?? 40} เครดิต
          </p>
          {uploadForm}
        </>
      )}
      {status?.has && status.imageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={status.imageUrl}
            alt="ภาพฉันในบทบาทการ์ด"
            style={{ width: "100%", maxWidth: 300, display: "block", margin: "0.4rem auto", borderRadius: 10, boxShadow: "0 8px 18px rgba(110,82,16,0.25)" }}
          />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.7rem" }}>
            <button type="button" style={S.btn} onClick={copyShare}>{copied ? "✓ คัดลอกแล้ว" : "🔗 คัดลอกลิงก์แชร์"}</button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button type="button" style={S.ghostBtn} onClick={nativeShare}>📤 แชร์</button>
            )}
            {status.storyUrl && (
              <a href={status.storyUrl} style={S.ghostBtn} download>
                📱 ดาวน์โหลดสตอรี่ IG
              </a>
            )}
          </div>
          <p style={{ ...S.note, textAlign: "center", marginTop: "0.5rem" }}>
            ลิงก์แชร์เปิดดูได้ทุกคน (มีเฉพาะภาพผลงาน + ข้อมูลการ์ด — ไม่มีข้อมูลส่วนตัว)
          </p>
          <div style={{ marginTop: "0.8rem", borderTop: "1px dashed var(--marble-vein)", paddingTop: "0.7rem" }}>
            {!regenOpen ? (
              <button type="button" style={S.ghostBtn} onClick={() => setRegenOpen(true)}>
                🔄 สร้างภาพใหม่ ({status.cost} เครดิต)
              </button>
            ) : (
              uploadForm
            )}
          </div>
        </>
      )}
    </div>
  );
}
