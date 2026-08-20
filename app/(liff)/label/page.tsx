"use client";

// หน้าออกแบบฉลาก — ต่อจากโลโก้ (รับ logo/brand/el ผ่าน query)
// ประกอบฝั่ง browser (Canvas) ที่ขนาดพิมพ์จริง (มม. × 300 DPI) · ตัวอักษรฟอนต์จริง (ไทยสะกดถูก)
// โหลดโลโก้ผ่านพร็อกซี same-origin → canvas ไม่ taint → export PNG ได้ · ฟรี ฿0 (ไม่เรียก AI)

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import MascotLogo from "@/app/_components/MascotLogo";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { THAI_LABEL_5, wuXingScore, type Element5 } from "@/lib/engine/element";
import { motifElement, scoreLabelComposition, recommendForBrand } from "@/lib/engine/label";
import { analyzeImagePixels, COLOR_ANALYSIS_CAVEAT, type ColorAnalysis } from "@/lib/engine/color-analysis";
import { buildPrintPdf, rgbaToCmyk, PRINT_BLEED_MM, PRINT_CMYK_CAVEAT, type PrintImage } from "@/lib/print/pdf";

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous"; // ผ่านพร็อกซี/objectURL → canvas ไม่ taint
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("โหลดรูปไม่สำเร็จ"));
    im.src = src;
  });
}

/** โหลดภาพ → ย่อ ≤64px → อ่านพิกเซล → สัดส่วนธาตุ (คณิตศาสตร์ล้วน ฟรี ไม่เรียก AI) */
async function analyzeImageSrc(src: string): Promise<ColorAnalysis> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  const s = Math.min(1, 64 / Math.max(img.width, img.height, 1));
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return analyzeImagePixels(ctx.getImageData(0, 0, c.width, c.height).data);
}

/** ย่อภาพ ≤768px → JPEG dataURL — สำหรับส่งให้ AI vision (re-encode ผ่าน canvas = ล้าง EXIF/GPS ให้ฟรี) */
async function downscaleToJpeg(src: string, maxPx = 768): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  const s = Math.min(1, maxPx / Math.max(img.width, img.height, 1));
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // JPEG ไม่มี alpha — พื้นโปร่งใสต้องเป็นขาว ไม่ใช่ดำ
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

interface RenderLabelOpts {
  size: Size;
  brand: string;
  tagline: string;
  proxied: string; // โลโก้ผ่านพร็อกซี ("" = ไม่มี)
  bgProxied: string; // พื้นหลัง AI ผ่านพร็อกซี ("" = พื้นเรียบ)
  color: string;
  /** ระยะเจียนรอบด้าน (มม.) — 0 = พรีวิว/PNG ขนาดตัด · 3 = ไฟล์พิมพ์ */
  bleedMm?: number;
  /** เช็คระหว่าง await ว่า render รอบนี้ถูกยกเลิกแล้ว (effect รอบใหม่ทับ) */
  cancelled?: () => boolean;
}

/**
 * วาดฉลากลง canvas ที่ขนาดพิมพ์จริง — เนื้อหา (โลโก้/ตัวอักษร/กรอบ) อิงพื้นที่ trim
 * ส่วนพื้นหลัง/แถบสีลามเต็มถึงขอบ bleed (ถูกเจียนทิ้งตอนตัด)
 */
async function renderLabel(canvas: HTMLCanvasElement, o: RenderLabelOpts): Promise<void> {
  const bleedMm = o.bleedMm ?? 0;
  const done = () => o.cancelled?.() === true;
  let W = mmToPx(o.size.w + bleedMm * 2);
  let H = mmToPx(o.size.h + bleedMm * 2);
  const scale = Math.min(1, MAX_PX / Math.max(W, H));
  W = Math.round(W * scale);
  H = Math.round(H * scale);
  const b = Math.round(mmToPx(bleedMm) * scale);
  const tw = W - b * 2; // พื้นที่หลังตัดจริง — ตัวอักษร/โลโก้ห้ามล้ำออกนอกนี้
  const th = H - b * 2;
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

  // พื้นหลัง: AI artwork (ลายกรอบ+กลางครีม) cover เต็มถึงขอบ bleed · ไม่งั้นครีม+แถบสีธาตุ+กรอบ
  const hasBg = Boolean(o.bgProxied);
  if (hasBg) {
    const bg = await loadImg(o.bgProxied);
    if (done()) return;
    const s = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * s, dh = bg.height * s;
    ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#faf7f0";
    ctx.fillRect(0, 0, W, H);
    // แถบสีธาตุบน-ล่าง ลามเข้า bleed (โดนเจียนแล้วยังชนขอบพอดี ไม่มีเส้นขาว)
    ctx.fillStyle = o.color;
    ctx.fillRect(0, 0, W, b + Math.round(th * 0.055));
    ctx.fillRect(0, H - b - Math.round(th * 0.055), W, b + Math.round(th * 0.055));
    // กรอบเส้น อยู่ในพื้นที่ trim (ถ้าคร่อมเส้นตัดจะโดนเจียนหายครึ่งเส้น)
    ctx.strokeStyle = o.color;
    ctx.lineWidth = Math.max(2, Math.round(tw * 0.006));
    ctx.strokeRect(b + ctx.lineWidth, b + ctx.lineWidth, tw - ctx.lineWidth * 2, th - ctx.lineWidth * 2);
  }

  // โลโก้ (ถ้ามี) — วางกลางบนของพื้นที่ trim (มี bg ขยับลงนิดให้พ้นกรอบลาย)
  if (o.proxied) {
    const img = await loadImg(o.proxied);
    if (done()) return;
    const logoH = Math.round(th * 0.36);
    const logoW = logoH * (img.width / img.height || 1);
    ctx.drawImage(img, (W - logoW) / 2, b + Math.round(th * (hasBg ? 0.16 : 0.12)), logoW, logoH);
  }

  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ฟอนต์ระบบก็เรนเดอร์ไทยถูก */ }
  if (done()) return;

  // halo บางๆ หลังตัวอักษร (กันอ่านไม่ออกถ้าลายพื้นรก) — ครีมบนมี bg
  if (hasBg) {
    ctx.shadowColor = "rgba(250,247,240,0.95)";
    ctx.shadowBlur = Math.round(th * 0.04);
  }

  // ชื่อแบรนด์ (serif) — ย่ออัตโนมัติ
  ctx.fillStyle = o.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let bs = Math.round(th * 0.11);
  do {
    ctx.font = `bold ${bs}px 'Noto Serif Thai', 'Noto Sans Thai', serif`;
    if (ctx.measureText(o.brand || "แบรนด์ของคุณ").width <= tw * 0.82 || bs <= 20) break;
    bs -= 3;
  } while (bs > 20);
  ctx.fillText(o.brand || "แบรนด์ของคุณ", W / 2, b + Math.round(th * 0.64));

  // สโลแกน (sans) — ถ้ามี
  if (o.tagline.trim()) {
    ctx.fillStyle = "#6b6255";
    ctx.font = `${Math.round(th * 0.05)}px 'Noto Sans Thai', sans-serif`;
    ctx.fillText(o.tagline.trim(), W / 2, b + Math.round(th * 0.8));
  }
  ctx.shadowBlur = 0; // reset halo
}

/** บีบอัด zlib ฝั่ง browser (รูปแบบเดียวกับ /FlateDecode ของ PDF) — เบราว์เซอร์เก่าคืน null */
async function deflateBytes(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function dataUrlToBytes(u: string): Uint8Array {
  const bin = atob(u.slice(u.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
  const [importJpeg, setImportJpeg] = useState<string | null>(null); // ภาพย่อ ≤768px รอส่ง AI (ถ้าผู้ใช้กดเอง)
  const [visionBusy, setVisionBusy] = useState(false);
  const [visionMsg, setVisionMsg] = useState<string | null>(null);
  interface VisionResp {
    classification?: { motifs: string[]; shape: string | null; confidence: number };
    composition?: { components: Array<{ kind: string; label: string; score: number; relation: string }>; overallScore: number } | null;
    cached?: boolean; caveat?: string; remaining?: number; credits?: number | null; paidWithCredits?: boolean;
  }
  const [vision, setVision] = useState<VisionResp | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
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
    setVision(null);
    setVisionMsg(null);
    setImportJpeg(null);
    const url = URL.createObjectURL(f);
    Promise.all([analyzeImageSrc(url), downscaleToJpeg(url)])
      .then(([r, jpeg]) => {
        setImported({ name: f.name, res: r });
        setImportJpeg(jpeg); // เก็บไว้ในเครื่องเฉยๆ — ส่งออกเฉพาะเมื่อผู้ใช้กดปุ่ม AI เอง
      })
      .catch((err) => setImportErr(err instanceof Error ? err.message : String(err)))
      .finally(() => URL.revokeObjectURL(url));
  }

  async function runVision() {
    if (!importJpeg || visionBusy) return;
    setVisionBusy(true);
    setVisionMsg(null);
    try {
      const res = await fetch("/api/label/vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: importJpeg, brandElement: el }),
      });
      const d = await res.json();
      if (d.needsLogin) setVisionMsg("ต้องเข้าสู่ระบบก่อนใช้การอ่านลวดลายด้วย AI");
      else if (d.declined) setVisionMsg(d.message);
      else if (d.error) setVisionMsg(d.error);
      else setVision(d as VisionResp);
    } catch (err) {
      setVisionMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setVisionBusy(false);
    }
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
        await renderLabel(canvas, { size, brand, tagline, proxied, bgProxied, color, cancelled: () => cancelled });
        if (!cancelled) setPreview(canvas.toDataURL("image/png"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brand, tagline, size, proxied, bgProxied, color]);

  // ไฟล์พิมพ์ PDF: เรนเดอร์ใหม่พร้อม bleed 3 มม. → แปลง CMYK → บีบอัด → ประกอบ PDF ในเครื่อง (ฟรี ฿0)
  async function exportPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    setPdfNote(null);
    try {
      const c = document.createElement("canvas");
      await renderLabel(c, { size, brand, tagline, proxied, bgProxied, color, bleedMm: PRINT_BLEED_MM });
      const ctx = c.getContext("2d")!;
      const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
      const flated = await deflateBytes(rgbaToCmyk(pixels));
      const image: PrintImage = flated
        ? { kind: "cmyk-flate", data: flated, width: c.width, height: c.height }
        : // เบราว์เซอร์เก่าไม่มี CompressionStream → RGB JPEG (โรงพิมพ์แปลงสีเองได้ แต่แจ้งให้รู้)
          { kind: "jpeg", data: dataUrlToBytes(c.toDataURL("image/jpeg", 0.92)), width: c.width, height: c.height };
      const pdf = buildPrintPdf({ trimWidthMm: size.w, trimHeightMm: size.h, bleedMm: PRINT_BLEED_MM, image });
      const url = URL.createObjectURL(new Blob([pdf as unknown as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `label-print-${(brand.trim() || "brand").replace(/[^a-zA-Z0-9ก-๙._-]/g, "-")}-${size.w}x${size.h}mm-bleed${PRINT_BLEED_MM}mm.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
      setPdfNote(
        flated
          ? PRINT_CMYK_CAVEAT
          : `เบราว์เซอร์นี้ไม่รองรับการแปลง CMYK — ได้ไฟล์ PDF สี RGB (เผื่อเจียน ${PRINT_BLEED_MM} มม. แล้ว โรงพิมพ์แปลงสีให้ได้)`
      );
    } catch (e) {
      setPdfNote(`⚠️ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPdfBusy(false);
    }
  }

  const S = styles;
  const dlName = `label-${(brand.trim() || "brand").replace(/[^a-zA-Z0-9ก-๙._-]/g, "-")}-${size.w}x${size.h}mm.png`;

  return (
    <main className="tone-marble" style={S.page}>
      <header>
        <div style={{ textAlign: "center" }}><MascotLogo size={84} /></div>
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
          วิเคราะห์สีในเครื่องของคุณทันที ไม่มีการอัปโหลด · ถ้าต้องการอ่าน &ldquo;ลวดลาย/รูปทรง&rdquo; ด้วย AI กดปุ่มแยกด้านล่าง (ต้องล็อกอิน)
        </p>
        {importErr && <p style={S.warn}>⚠️ {importErr}</p>}
        {imported && (imported.res.dominant
          ? <ColorMixCard title={`📥 ${imported.name}`} res={imported.res} brandEl={el} />
          : <p style={S.warn}>อ่านสีจากรูปนี้ไม่ได้ (ภาพโปร่งใสทั้งหมด?)</p>)}

        {/* ปุ่มแยกชัดจากการวิเคราะห์สี — เส้นนี้ "ส่งภาพออกจากเครื่อง" และมีค่าใช้จ่าย */}
        {importJpeg && !vision && (
          <button type="button" style={{ ...S.chip, alignSelf: "flex-start" }} onClick={runVision} disabled={visionBusy}>
            {visionBusy ? "กำลังอ่านลวดลาย…" : "🔍 อ่านลวดลาย/รูปทรงด้วย AI (ฟรี 3 ครั้ง จากนั้น 10 เครดิต)"}
          </button>
        )}
        {importJpeg && !vision && (
          <p style={{ fontSize: "0.72rem", color: "var(--text-dim,#6b6255)", lineHeight: 1.5, margin: 0 }}>
            เส้นนี้จะส่งภาพ (ย่อแล้ว ไม่มีข้อมูลตำแหน่ง/EXIF) ไปประมวลผลครั้งเดียว — ระบบเก็บเฉพาะผลจำแนก ไม่เก็บตัวภาพ
          </p>
        )}
        {visionMsg && <p style={S.warn}>⚠️ {visionMsg}</p>}
        {vision?.classification && (
          <div style={{ fontSize: "0.78rem", lineHeight: 1.6, border: "1px dashed var(--gold-dim,#a89870)", borderRadius: 8, padding: "0.6rem 0.8rem" }}>
            <strong>🔍 ลวดลาย/รูปทรงที่ AI เห็น{vision.cached ? " (จากแคช)" : ""}</strong>
            <br />
            {vision.classification.motifs.length === 0 && !vision.classification.shape
              ? "ไม่พบลวดลาย/รูปทรงที่ระบบรู้จักในภาพนี้"
              : [...vision.classification.motifs, ...(vision.classification.shape ? [vision.classification.shape] : [])].join(" · ")}
            {vision.composition && (
              <>
                <br />
                {vision.composition.components.map((c) => (
                  <span key={c.kind + c.label} style={{ color: c.score >= 1 ? "var(--good,#2f6b3f)" : c.score < 0 ? "var(--bad,#a83a1e)" : "var(--text-dim,#6b6255)" }}>
                    {c.score >= 1 ? "✓" : c.score < 0 ? "⚠️" : "•"} {c.label} — {c.relation}
                    <br />
                  </span>
                ))}
              </>
            )}
            <span style={{ color: "var(--text-dim,#6b6255)", fontSize: "0.72rem" }}>
              {vision.caveat}
              {typeof vision.remaining === "number" && !vision.paidWithCredits ? ` · สิทธิ์ฟรีเหลือ ${vision.remaining} ครั้ง` : ""}
              {vision.paidWithCredits && typeof vision.credits === "number" ? ` · เครดิตคงเหลือ ${vision.credits}` : ""}
            </span>
          </div>
        )}
      </div>

      {error && <p style={S.warn}>⚠️ {error}</p>}

      <section style={S.result}>
        {/* eslint-disable-next-line @next/next/no-img-element -- dataURL จาก canvas */}
        {preview && <img src={preview} alt="ตัวอย่างฉลาก" style={{ ...S.img, aspectRatio: `${size.w}/${size.h}` }} />}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {preview && (
          <a href={preview} download={dlName} style={{ ...S.download, background: color }}>⬇ เซฟฉลาก ({size.w}×{size.h} มม. · 300 DPI)</a>
        )}
        {preview && (
          <button
            type="button"
            onClick={exportPdf}
            disabled={pdfBusy}
            style={{ ...S.download, background: "transparent", color, border: `1px solid ${color}`, cursor: "pointer" }}
          >
            {pdfBusy ? "กำลังสร้างไฟล์พิมพ์…" : `🖨 ไฟล์พิมพ์ PDF (เผื่อเจียน ${PRINT_BLEED_MM} มม. · CMYK)`}
          </button>
        )}
        {pdfNote && (
          <p style={{ fontSize: "0.72rem", color: "var(--text-dim,#6b6255)", lineHeight: 1.5, maxWidth: 380, margin: 0 }}>{pdfNote}</p>
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
  page: { minHeight: "100vh", color: "var(--text,var(--ink))", maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.2rem 4rem", display: "flex", flexDirection: "column", gap: "1rem" },
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
