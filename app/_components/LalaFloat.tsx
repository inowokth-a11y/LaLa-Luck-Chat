"use client";

// แชทลอย "อาจารย์ลาลา ลักกี้" ประจำระบบ — อยู่ใน root layout ลอยทับทุกหน้า (2 ส.ค. 2569)
//
// สเปกที่ผู้ใช้ยืนยัน:
//  - ปุ่มโลโก้แมวลอย **ลากได้แบบ AssistiveTouch**: ปล่อยแล้ว snap เข้าขอบซ้าย/ขวา + จำตำแหน่ง
//  - พับเก็บเหลือแต่โลโก้ / เปิดเป็นแผงแชทโค้งมนแบบ Messenger
//  - มีผลคำนวณบนหน้า (จาก float-bus) → ตอบอิงผล · ไม่มี → โหมด plan (AI เลือก engine เอง)
//  - **nudge**: หลังผลขึ้น ~7 วิ เด้งชิปคำถามชวนถามต่อ 2-3 ข้อ — เทมเพลต ฿0 **ห้ามเรียก AI**
//    (lib/chat/suggest.ts — ตัวเด้งฟรี ผู้ใช้กดถามจริงค่อยหักตามกติกาเดิม) · เด้งครั้งเดียวต่อผล
//  - Safety Gate ฝั่ง server เหมือนเดิม — ข้อความวิกฤตแสดงเดี่ยว ห้ามพ่วงปุ่ม/การตลาด
//
// ไม่แสดงบน: /dream /chat (แชทเต็มหน้าอยู่แล้ว — ห้ามซ้อน §13) · auth/consent/แอดมิน/หน้าแชร์

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSyncStatus } from "@/app/_components/AuthStatus";
import { MascotAvatar } from "@/app/_components/MascotLogo";
import ChartPanel, { type ChartData } from "@/app/(liff)/_components/ChartPanel";
import { onChatContext, type ChatContextPayload } from "@/lib/chat/float-bus";
import { suggestQuestions } from "@/lib/chat/suggest";
import styles from "./LalaFloat.module.css";

const HIDE_ON = ["/dream", "/chat", "/login", "/onboarding", "/auth", "/consent", "/welcome", "/admin", "/privacy", "/card"];

const POS_KEY = "kruth_lala_pos"; // {side:"left"|"right", y:number}
const NUDGE_DELAY_MS = 7_000;
const DRAG_THRESHOLD_PX = 8;

interface Msg {
  role: "user" | "ai";
  text: string;
  chart?: ChartData;
}

interface Pos {
  side: "left" | "right";
  y: number; // px จากขอบบน
}

function loadPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    if (p && (p.side === "left" || p.side === "right") && Number.isFinite(p.y)) return p;
  } catch {}
  return null;
}

/** hash สั้นๆ ของ context — ใช้กันเด้ง nudge ซ้ำกับผลเดิม (ไม่ใช่งาน crypto) */
function ctxKey(p: ChatContextPayload): string {
  const s = JSON.stringify(p.context) ?? "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `lala_nudged:${p.logicId}:${h}`;
}

export default function LalaFloat() {
  const pathname = usePathname();
  const [ctx, setCtx] = useState<ChatContextPayload | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [nudge, setNudge] = useState<string[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<{ remaining: number; limit: number } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [topup, setTopup] = useState(false);
  const [crisis, setCrisis] = useState<string | null>(null);
  const [shareTeaser, setShareTeaser] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ชิปคำตอบจากการ "ถามกลับ" ของแม่หมอ (เฟส 1 จิตวิทยา — เทมเพลต ฿0 จาก server)
  const [replySuggest, setReplySuggest] = useState<string[] | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const openRef = useRef(false);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    setPos(loadPos());
  }, []);

  // รับ context จากหน้าฟังก์ชัน (FunctionChat publish เข้ามา)
  useEffect(() => onChatContext(setCtx), []);

  // สถานะถัง/เครดิต — โหลดครั้งเดียว ฿0
  useEffect(() => {
    let active = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.loggedIn) setNeedsLogin(true);
        else {
          setQuestions(d.questions);
          setCredits(d.credits);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  openRef.current = open;

  // nudge: ผลใหม่ขึ้น → รอ ~7 วิ (ให้อ่านผลจบ) → เด้งชิปคำถาม · ครั้งเดียวต่อผล/เซสชัน
  // มี invite (onboarding) = แม่หมอชวนอยู่แล้ว ไม่เด้งซ้อน
  useEffect(() => {
    if (!ctx || ctx.invite) return;
    const key = ctxKey(ctx);
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    const t = setTimeout(() => {
      if (openRef.current) return; // ผู้ใช้เปิดแชทเองแล้ว — ไม่ต้องสะกิด
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
      setNudge(suggestQuestions(ctx.logicId));
    }, NUDGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [ctx]);

  // คำทำนายแรกพบ (4 ส.ค. 2569): เพิ่งเปิดการ์ดครั้งแรก → เด้งแชทเปิดเอง + แม่หมออ่านพื้นดวงให้
  // ครั้งเดียวต่อเซสชัน (sessionStorage) · ไม่หักสิทธิ์ (route โหมด first_reading) · พังเงียบ = เหลือ invite เดิม
  const firstReadingRan = useRef(false);
  useEffect(() => {
    if (!ctx?.firstReading || needsLogin || firstReadingRan.current) return;
    try {
      if (sessionStorage.getItem("kruth_first_reading")) return;
      sessionStorage.setItem("kruth_first_reading", "1");
    } catch {}
    firstReadingRan.current = true;
    setOpen(true);
    setBusy(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "first_reading", context: ctx.context }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.reply) setMsgs((m) => [...m, { role: "ai", text: d.reply }]);
      })
      .catch(() => {})
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.firstReading, needsLogin]);

  // เลื่อนเธรดลงล่างสุดเมื่อมีข้อความใหม่
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, notice, shareTeaser, error]);

  const show = useCallback(() => {
    setOpen(true);
    setNudge(null);
  }, []);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setTopup(false);
    setReplySuggest(null);
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setInput("");

    try {
      const body = ctx
        ? { logicId: ctx.logicId, question, context: ctx.context }
        : { mode: "plan", question };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (d.intercepted) {
        setCrisis(d.message); // ข้อความช่วยเหลือ — แสดงเดี่ยวๆ ไม่คิดโควตา
      } else if (d.needsLogin) {
        setNeedsLogin(true);
      } else if (d.declined || d.needsInput || d.unclear) {
        // ถามกลับของแม่หมอแสดงเป็น bubble ฝั่ง AI (ไม่ใช่กล่องเตือน) — เป็นบทสนทนา ไม่ใช่ error
        setMsgs((m) => [...m, { role: "ai", text: d.message }]);
        if (Array.isArray(d.suggest) && d.suggest.length > 0) setReplySuggest(d.suggest);
      } else if (d.quotaExceeded) {
        setNotice(d.message);
        setQuestions({ remaining: 0, limit: questions?.limit ?? 1 });
        if (typeof d.credits === "number") setCredits(d.credits);
        setTopup(true);
      } else if (d.error) {
        setError(d.error);
      } else {
        setMsgs((m) => [...m, { role: "ai", text: d.reply, chart: d.chart ?? undefined }]);
        if (d.questions) setQuestions(d.questions);
        if (typeof d.credits === "number") setCredits(d.credits);
        setShareTeaser(Boolean(d.shareTeaser));
        syncStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // ---- ลากปุ่ม (AssistiveTouch): ขยับเกิน threshold = ลาก · ปล่อยแล้ว snap ขอบ + จำตำแหน่ง ----
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragState.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.startX, e.clientY - s.startY) < DRAG_THRESHOLD_PX) return;
    s.moved = true;
    setDrag({ x: e.clientX, y: e.clientY });
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragState.current;
    dragState.current = null;
    if (!s) return;
    if (!s.moved) {
      setDrag(null);
      show(); // แตะเฉยๆ = เปิดแชท
      return;
    }
    const side: Pos["side"] = e.clientX < window.innerWidth / 2 ? "left" : "right";
    const y = Math.min(Math.max(e.clientY - 30, 64), window.innerHeight - 140);
    const p: Pos = { side, y };
    setPos(p);
    setDrag(null);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {}
  }

  if (HIDE_ON.some((p) => pathname?.startsWith(p))) return null;

  const quotaLabel = needsLogin
    ? ""
    : questions === null
    ? ""
    : questions.remaining > 0
    ? `คำถามฟรี ${questions.remaining} ข้อ`
    : credits !== null && credits > 0
    ? `ใช้เครดิต (มี ${credits})`
    : "คำถามฟรีหมด";

  // ---- แผงแชท (เปิด) ----
  if (open) {
    const panelSide: React.CSSProperties = pos?.side === "left" ? { left: 16, right: "auto" } : {};
    return (
      <section className={styles.panel} style={panelSide} aria-label="แชทกับอาจารย์ลาลา ลักกี้">
        <div className={styles.head}>
          <MascotAvatar size={26} />
          <div className={styles.headText}>
            <span className={styles.title}>อาจารย์ลาลา ลักกี้</span>
            {quotaLabel && <span className={styles.quota}>{quotaLabel}</span>}
          </div>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="ย่อแชท">
            ─
          </button>
        </div>

        {crisis ? (
          <div className={styles.crisis}>{crisis}</div>
        ) : (
          <>
            <div className={styles.thread} ref={threadRef}>
              {ctx?.invite && !needsLogin && <div className={styles.ai}>🐾 {ctx.invite}</div>}
              {!ctx?.invite && msgs.length === 0 && !needsLogin && (
                <div className={styles.ai}>
                  {ctx
                    ? "ถามเรื่องผลที่คำนวณได้บนหน้านี้ได้เลยค่ะ ลาลา~"
                    : "ถามแม่หมอได้เลยค่ะ เช่น ทะเบียนรถ เบอร์โทร หรือธาตุประจำตัว ลาลา~"}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? styles.user : styles.ai}>
                  {m.text}
                  {m.chart && <ChartPanel chart={m.chart} />}
                </div>
              ))}
              {busy && <div className={styles.ai}>กำลังคิด…</div>}
              {replySuggest && !busy && (
                <div className={styles.chips}>
                  {replySuggest.map((q) => (
                    <button key={q} type="button" className={styles.chip} onClick={() => void ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {notice && <p className={styles.notice}>{notice}</p>}
              {shareTeaser && (
                <p className={styles.notice}>
                  💡 คำถามฟรีหมดแล้ว — <a href="/profile" style={{ color: "var(--gold)" }}>แชร์การ์ดของคุณ</a> รับคำถามฟรีเพิ่ม +2 (ครั้งแรกครั้งเดียว)
                </p>
              )}
              {error && <p className={styles.error}>⚠️ {error}</p>}
              {/* ชิปชวนถาม — โชว์ก่อนถามคำแรก (เทมเพลต ฿0) */}
              {msgs.length === 0 && !needsLogin && (
                <div className={styles.chips}>
                  {suggestQuestions(ctx ? ctx.logicId : null).map((q) => (
                    <button key={q} type="button" className={styles.chip} onClick={() => void ask(q)} disabled={busy}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {needsLogin ? (
              <a href={`/login?next=${typeof window !== "undefined" ? window.location.pathname : "/"}`} className={styles.cta}>
                เข้าสู่ระบบเพื่อรับคำถามฟรี →
              </a>
            ) : topup ? (
              <a href="/account" className={styles.cta}>
                ⭐ เติมเครดิตเพื่อถามต่อ →
              </a>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(input.trim());
                }}
                className={styles.form}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ctx?.placeholder ?? "ถามแม่หมอได้เลย…"}
                  maxLength={500}
                  disabled={busy}
                  className={styles.input}
                />
                <button type="submit" disabled={busy || !input.trim()} className={styles.send} aria-label="ส่งคำถาม">
                  {busy ? "…" : "➤"}
                </button>
              </form>
            )}

            <p className={styles.hint}>
              คำถามฟรีใช้ร่วมกันทุกหน้า · หมดแล้วถามต่อด้วยเครดิต (1 เครดิต/คำถาม) ·
              AI ตอบจากผลที่คำนวณได้เท่านั้น
            </p>
          </>
        )}
      </section>
    );
  }

  // ---- ปุ่มลอย (ปิด) — ลากได้ ----
  const wrapStyle: React.CSSProperties = drag
    ? { left: drag.x - 30, top: drag.y - 30, right: "auto", bottom: "auto", transition: "none" }
    : pos
    ? pos.side === "left"
      ? { left: 12, right: "auto", top: pos.y, bottom: "auto", flexDirection: "row-reverse" }
      : { right: 12, left: "auto", top: pos.y, bottom: "auto" }
    : {}; // default: มุมขวาล่าง (จาก CSS)

  const bubble = ctx?.invite && msgs.length === 0 ? { title: null, chips: null, text: `🐾 ${ctx.invite}` } : nudge ? { title: "ลาลา~ อยากรู้เรื่องนี้ต่อไหมคะ", chips: nudge, text: null } : null;

  return (
    <div className={styles.launcherWrap} style={wrapStyle}>
      {bubble && !drag && (
        <div className={styles.nudge}>
          <button type="button" className={styles.nudgeClose} onClick={() => setNudge(null)} aria-label="ปิดคำแนะนำ">
            ✕
          </button>
          {bubble.text && (
            <button type="button" className={styles.nudgeText} onClick={show}>
              {bubble.text}
            </button>
          )}
          {bubble.title && <p className={styles.nudgeTitle}>{bubble.title}</p>}
          {bubble.chips?.map((q) => (
            <button
              key={q}
              type="button"
              className={styles.chip}
              onClick={() => {
                show();
                void ask(q);
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.launcher}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="เปิดแชทถามอาจารย์ลาลา ลักกี้ (ลากเพื่อย้ายตำแหน่ง)"
      >
        <MascotAvatar size={40} />
      </button>
    </div>
  );
}
