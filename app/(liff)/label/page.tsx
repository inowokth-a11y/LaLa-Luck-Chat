"use client";

// หน้าออกแบบฉลาก — ต่อจากโลโก้ (รับ logo/brand/el ผ่าน query)
// ประกอบฝั่ง browser (Canvas) ที่ขนาดพิมพ์จริง (มม. × 300 DPI) · ตัวอักษรฟอนต์จริง (ไทยสะกดถูก)
// โหลดโลโก้ผ่านพร็อกซี same-origin → canvas ไม่ taint → export PNG ได้ · ฟรี ฿0 (ไม่เรียก AI)

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { THAI_LABEL_5, wuXingScore, type Element5 } from "@/lib/engine/element";
import { motifElement, scoreLabelComposition, recommendForBrand } from "@/lib/engine/label";
import { analyzeImagePixels, COLOR_ANALYSIS_CAVEAT, type ColorAnalysis } from "@/lib/engine/color-analysis";

const EL_COLOR: Record<string, string> = { Wood: "#2f5c42", Fire: "#a83a1e", Earth: "#a97c1f", Metal: "#6b6255", Water: "#1f4d63" };

interface Size {
  key: string;
  label: string;
  w: number; // มม.
  h: number;
}
const SIZES: Size[] = [
  { key: "rect_9x5", label: "สี่เหลี่ยม 9×5 ซม.", w: 90, h: 50 },
  { key: "bottle_6x8", label: "ฉลากขวด 6×8 ซม.", w: 60, h: 80 },
  { key: "square_5", label: "จัตุรัส 5×5 ซม.", w: 50, h: 50 },
  { key: "tag_5x7", label: "ป้ายแขวน 5×7 ซม.", w: 50, h: 70 },
];
const DPI = 300;
const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI);
const MAX_PX = 2400; // กันภาพใหญ่เกิน

/** โหลดภาพ → ย่อ ≤64px → อ่านพิกเซล → สัดส่วนธาตุ (คณิตศาสตร์ล้วน ฟรี ไม่เรียก AI) */
async function analyzeImageSrc(src: string): Promise<ColorAnalysis> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous"; // ผ่านพร็อกซี/objectURL → canvas ไม่ taint
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("โหลดรูปไม่สำเร็จ"));
    im.src = src;
  });
  const c = document.createElement("canvas");
  const s = Math.min(1, 64 / Math.max(img.width, img.height, 1));
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return analyzeImagePixels(ctx.getImageData(0, 0, c.width, c.height).data);
}

/** การ์ดสรุปสัดส่วนธาตุจากสีจริงในภาพ + ความเข้ากันกับธาตุแบรนด์ */
function ColorMixCard({ title, res, brandEl }: { title: string; res: ColorAnalysis; brandEl: Element5 }) {
  if (!res.dominant) return null;
  // ไม่รู้ธาตุที่แบรนด์ขาดในหน้านี้ → ส่ง [] (ไม่ตัดสิน Productive Clash)
  const rel = wuXingScore(brandEl, res.dominant, []);
  const tone = rel.final_score >= 1 ? "var(--good,#2f6b3f)" : rel.final_score < 0 ? "var(--bad,#a83a1e)" : "var(--text-dim,#6b6255)";
  return (
    <div style={{ fontSize: "0.78rem", lineHeight: 1.6, border: "1px dashed var(--gold-dim,#a89870)", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
      <strong>{title}</strong>
      <br />
      {res.elements.slice(0, 3).map((e) => `${e.element_th} ${Math.round(e.share * 100)}%`).join(" · ")}
      <br />
      <span style={{ color: tone }}>
        {rel.final_score >= 1 ? "✓" : rel.final_score < 0 ? "⚠️" : "•"} ธาตุเด่นในภาพ ({THAI_LABEL_5[res.dominant]}) — {rel.relation_th}
      </span>
      <br />
      <span style={{ color: "var(--text-dim,#6b6255)", fontSize: "0.72rem" }}>{COLOR_ANALYSIS_CAVEAT}</span>
    </div>
  );
}

function LabelComposer() {
  const params = useSearchParams();
  const logoUrl = params.get("logo") ?? "";
  const el = (params.get("el") as Element5) ?? "Earth";
  const color = EL_COLOR[el] ?? "#a97c1f";

  const [brand, setBrand] = useState(params.get("brand") ?? "");
  const [tagline, setTagline] = useState("");
  const [sizeKey, setSizeKey] = useState(SIZES[0].key);
  const [motif, setMotif] = useState("");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgBusy, setBgBusy] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgColors, setBgColors] = useState<ColorAnalysis | null>(null);
  const [imported, setImported] = useState<{ name: string; res: ColorAnalysis } | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const size = useMemo(() => SIZES.find((s) => s.key === sizeKey)!, [sizeKey]);
  const proxied = logoUrl ? `/api/logo/download?url=${encodeURIComponent(logoUrl)}&name=logo` : "";
  const bgProxied = bgUrl ? `/api/logo/download?url=${encodeURIComponent(bgUrl)}&name=bg` : "";
  const orientation = size.w > size.h ? "landscape" : size.h > size.w ? "portrait" : "square";

  // วิเคราะห์องค์ประกอบจากลวดลายที่พิมพ์ (ฟรี ทันที) — ธาตุลวดลาย ↔ ธาตุแบรนด์
  const analysis = useMemo(() => {
    const mEl = motif.trim() ? motifElement(motif) : null;
    if (!mEl) return null;
    const r = scoreLabelComposition({ brandElement: el, components: [{ kind: "ลวดลาย", label: motif.trim(), element: mEl }] });
    return { motifEl: mEl, comp: r.components[0] };
  }, [motif, el]);
  const recs = useMemo(() => recommendForBrand(el, []).slice(0, 3), [el]);

  // QA พื้นหลัง AI: อ่าน "สีที่ Recraft วาดจริง" (อาจแถมเกินคำสั่ง) — ฟรี ไม่เรียก AI
  useEffect(() => {
    if (!bgProxied) {
      setBgColors(null);
      return;
    }
    let live = true;
    analyzeImageSrc(bgProxied)
      .then((r) => { if (live) setBgColors(r); })
      .catch(() => { /* วิเคราะห์ไม่ได้ไม่ใช่เรื่องคอขาดบาดตาย — ไม่ต้องรบกวนผู้ใช้ */ });
    return () => { live = false; };
  }, [bgProxied]);

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImportErr(null);
    const url = URL.createObjectURL(f);
    analyzeImageSrc(url)
      .then((r) => setImported({ name: f.name, res: r }))
      .catch((err) => setImportErr(err instanceof Error ? err.message : String(err)))
      .finally(() => URL.revokeObjectURL(url));
  }

  async function genArtwork() {
    if (bgBusy) return;
    setBgBusy(true);
    setBgError(null);
    try {
      const res = await fetch("/api/label/artwork", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandElement: el, motif: motif.trim(), orientation }),
      });
      const d = await res.json();
      if (d.needsLogin) setBgError("ต้องเข้าสู่ระบบก่อนสร้างพื้นหลัง AI");
      else if (d.error) setBgError(d.error);
      else setBgUrl(d.imageUrl);
    } catch (e) {
      setBgError(e instanceof Error ? e.message : String(e));
    } finally {
      setBgBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setError(null);
      try {
        let W = mmToPx(size.w), H = mmToPx(size.h);
        const scale = Math.min(1, MAX_PX / Math.max(W, H));
        W = Math.round(W * scale);
        H = Math.round(H * scale);
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        const loadImg = (src: string) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image();
            im.crossOrigin = "anonymous"; // โหลดผ่านพร็อกซี same-origin → canvas ไม่ taint
            im.onload = () => res(im);
            im.onerror = () => rej(new Error("โหลดรูปไม่สำเร็จ"));
            im.src = src;
          });

        // พื้นหลัง: AI artwork (Recraft ให้กรอบลาย + กลางครีมสะอาดอยู่แล้ว) แบบ cover · ไม่งั้นครีม+แถบสีธาตุ+กรอบ
        const hasBg = Boolean(bgProxied);
        if (hasBg) {
          const bg = await loadImg(bgProxied);
          if (cancelled) return;
          const s = Math.max(W / bg.width, H / bg.height);
          const dw = bg.width * s, dh = bg.height * s;
          ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          ctx.fillStyle = "#faf7f0";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, W, Math.round(H * 0.055));
          ctx.fillRect(0, H - Math.round(H * 0.055), W, Math.round(H * 0.055));
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, Math.round(W * 0.006));
          ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, W - ctx.lineWidth * 2, H - ctx.lineWidth * 2);
        }

        // โลโก้ (ถ้ามี) — วางกลางบน (มี bg ขยับลงนิดให้พ้นกรอบลาย)
        if (proxied) {
          const img = await loadImg(proxied);
          if (cancelled) return;
          const logoH = Math.round(H * 0.36);
          const logoW = logoH * (img.width / img.height || 1);
          ctx.drawImage(img, (W - logoW) / 2, Math.round(H * (hasBg ? 0.16 : 0.12)), logoW, logoH);
        }

        try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ฟอนต์ระบบก็เรนเดอร์ไทยถูก */ }
        if (cancelled) return;

        // halo บางๆ หลังตัวอักษร (กันอ่านไม่ออกถ้าลายพื้นรก) — ครีมบนมี bg
        if (hasBg) {
          ctx.shadowColor = "rgba(250,247,240,0.95)";
          ctx.shadowBlur = Math.round(H * 0.04);
        }

        // ชื่อแบรนด์ (serif) — ย่ออัตโนมัติ
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let bs = Math.round(H * 0.11);
        do {
          ctx.font = `bold ${bs}px 'Noto Serif Thai', 'Noto Sans Thai', serif`;
          if (ctx.measureText(brand || "แบรนด์ของคุณ").width <= W * 0.82 || bs <= 20) break;
          bs -= 3;
        } while (bs > 20);
        ctx.fillText(brand || "แบรนด์ของคุณ", W / 2, Math.round(H * 0.64));

        // สโลแกน (sans) — ถ้ามี
        if (tagline.trim()) {
          ctx.fillStyle = "#6b6255";
          ctx.font = `${Math.round(H * 0.05)}px 'Noto Sans Thai', sans-serif`;
          ctx.fillText(tagline.trim(), W / 2, Math.round(H * 0.8));
        }
        ctx.shadowBlur = 0; // reset halo

        if (!cancelled) setPreview(canvas.toDataURL("image/png"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand, tagline, size, proxied, bgProxied, color]);

  const S = styles;
  const dlName = `label-${(brand.trim() || "brand").replace(/[^a-zA-Z0-9ก-๙._-]/g, "-")}-${size.w}x${size.h}mm.png`;

  return (
    <main className="tone-marble" style={S.page}>
      <header>
        <h1 style={S.h1}>ออกแบบฉลาก</h1>
        <p style={S.sub}>
          จากโลโก้ + ธาตุ<strong style={{ color }}>{el && THAI_LABEL_5[el] ? ` ${THAI_LABEL_5[el]}` : ""}</strong> ของคุณ ·
          ตัวอักษรฟอนต์จริง (ไทยสะกดถูก) · ไฟล์พิมพ์ 300 DPI
        </p>
        {!logoUrl && <p style={S.warn}>ยังไม่มีโลโก้ — ไปสร้างที่ <Link href="/logo" style={{ color }}>หน้าโลโก้</Link> แล้วกด &ldquo;ทำฉลากต่อ&rdquo; จะได้ฉลากที่มีโลโก้ค่ะ</p>}
      </header>

      <div style={S.form}>
        <label style={S.label}>ขนาดฉลาก</label>
        <div style={S.chips}>
          {SIZES.map((s) => (
            <button key={s.key} type="button" onClick={() => setSizeKey(s.key)} style={{ ...S.chip, ...(sizeKey === s.key ? { ...S.chipActive, background: color, borderColor: color } : {}) }}>
              {s.label}
            </button>
          ))}
        </div>
        <input style={S.input} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="ชื่อแบรนด์" maxLength={60} />
        <input style={S.input} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="สโลแกน/คำโปรย (ไม่บังคับ)" maxLength={80} />

        {/* พื้นหลัง AI + วิเคราะห์องค์ประกอบธาตุ */}
        <label style={{ ...S.label, marginTop: "0.3rem" }}>ลวดลาย/พื้นหลัง (AI · ไม่บังคับ)</label>
        <input style={S.input} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="เช่น สวนผลไม้ · ลายไทย · สายน้ำ · ภูเขา" maxLength={160} />

        {analysis && (
          <p style={{ fontSize: "0.78rem", color: analysis.comp.score >= 1 ? "var(--good,#2f6b3f)" : analysis.comp.score < 0 ? "var(--bad,#a83a1e)" : "var(--text-dim,#6b6255)", lineHeight: 1.5 }}>
            {analysis.comp.score >= 1 ? "✓" : analysis.comp.score < 0 ? "⚠️" : "•"} ลวดลายนี้ธาตุ{THAI_LABEL_5[analysis.motifEl]} · {analysis.comp.relation}
          </p>
        )}
        <p style={{ fontSize: "0.74rem", color: "var(--text-dim,#6b6255)", lineHeight: 1.5 }}>
          💡 ลวดลายที่เข้ากับธาตุ{THAI_LABEL_5[el]}: {recs.map((r) => r.motifs[0]).join(" · ")}
        </p>

        <button type="button" style={{ ...S.download, background: bgUrl ? "transparent" : color, color: bgUrl ? color : "#faf7f0", border: bgUrl ? `1px solid ${color}` : "none", alignSelf: "flex-start" }} onClick={genArtwork} disabled={bgBusy}>
          {bgBusy ? "กำลังสร้างพื้นหลัง…" : bgUrl ? "🔄 สร้างพื้นหลังใหม่" : "🎨 สร้างพื้นหลัง AI (Recraft · ช่วงทดลองฟรี)"}
        </button>
        {bgUrl && <button type="button" style={{ ...S.chip, alignSelf: "flex-start" }} onClick={() => setBgUrl(null)}>เอาพื้นหลังออก (กลับเป็นพื้นเรียบ)</button>}
        {bgError && <p style={S.warn}>⚠️ {bgError}</p>}
        {bgUrl && bgColors && <ColorMixCard title="🎨 สีที่ AI วาดออกมาจริง (ตรวจสอบงาน)" res={bgColors} brandEl={el} />}
      </div>

      {/* นำเข้ารูปฉลาก/โลโก้ที่มีอยู่แล้ว → วิเคราะห์สี (คณิตศาสตร์ล้วน ไม่เรียก AI ไม่อัปโหลดขึ้น server) */}
      <div style={S.form}>
        <label style={S.label}>นำเข้าฉลาก/โลโก้ที่มีอยู่ — วิเคราะห์ธาตุจากสี (ฟรี)</label>
        <input type="file" accept="image/*" onChange={onImportFile} style={{ fontSize: "0.85rem" }} />
        <p style={{ fontSize: "0.72rem", color: "var(--text-dim,#6b6255)", lineHeight: 1.5, margin: 0 }}>
          วิเคราะห์ในเครื่องของคุณ ไม่มีการอัปโหลดรูปขึ้นระบบ · การอ่าน &ldquo;ลวดลาย&rdquo; ด้วย AI จะเปิดให้ใช้ภายหลัง
        </p>
        {importErr && <p style={S.warn}>⚠️ {importErr}</p>}
        {imported && (imported.res.dominant
          ? <ColorMixCard title={`📥 ${imported.name}`} res={imported.res} brandEl={el} />
          : <p style={S.warn}>อ่านสีจากรูปนี้ไม่ได้ (ภาพโปร่งใสทั้งหมด?)</p>)}
      </div>

      {error && <p style={S.warn}>⚠️ {error}</p>}

      <section style={S.result}>
        {/* eslint-disable-next-line @next/next/no-img-element -- dataURL จาก canvas */}
        {preview && <img src={preview} alt="ตัวอย่างฉลาก" style={{ ...S.img, aspectRatio: `${size.w}/${size.h}` }} />}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {preview && (
          <a href={preview} download={dlName} style={{ ...S.download, background: color }}>⬇ เซฟฉลาก ({size.w}×{size.h} มม. · 300 DPI)</a>
        )}
      </section>

      <Link href="/logo" style={{ ...S.sub, color, marginTop: "0.5rem" }}>← กลับไปหน้าโลโก้</Link>
    </main>
  );
}

export default function LabelPage() {
  return (
    <Suspense fallback={<main className="tone-marble" style={styles.page}><p style={{ opacity: 0.7 }}>กำลังโหลด…</p></main>}>
      <LabelComposer />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "var(--bg)", color: "var(--text,var(--ink))", maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.2rem 4rem", display: "flex", flexDirection: "column", gap: "1rem" },
  h1: { fontFamily: "var(--font-serif-thai)", fontSize: "1.7rem", color: "var(--gold)", margin: 0 },
  sub: { fontSize: "0.9rem", color: "var(--text-dim,var(--ink-dim))", lineHeight: 1.5 },
  warn: { fontSize: "0.82rem", color: "var(--bad,#a83a1e)", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: "0.7rem", border: "1px solid var(--gold-dim,#a89870)", borderRadius: 8, padding: "1.1rem", background: "color-mix(in srgb,var(--gold) 5%,transparent)" },
  label: { fontSize: "0.82rem", color: "var(--text,var(--ink))" },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  chip: { fontFamily: "var(--font-sans-thai)", fontSize: "0.8rem", padding: "0.45rem 0.85rem", borderRadius: 999, border: "1px solid var(--gold-dim,#a89870)", background: "transparent", color: "var(--text,var(--ink))", cursor: "pointer" },
  chipActive: { color: "#faf7f0", fontWeight: 600 },
  input: { fontFamily: "var(--font-sans-thai)", fontSize: "0.95rem", padding: "0.7rem 1rem", borderRadius: 8, border: "1px solid var(--gold-dim,#a89870)", background: "var(--surface,transparent)", color: "var(--text,var(--ink))" },
  result: { display: "flex", flexDirection: "column", gap: "0.7rem", alignItems: "center" },
  img: { width: "100%", maxWidth: 380, borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", objectFit: "contain" },
  download: { fontFamily: "var(--font-sans-thai)", fontWeight: 600, fontSize: "0.9rem", color: "#faf7f0", padding: "0.65rem 1.4rem", borderRadius: 8, textDecoration: "none" },
};
