"use client";

// วงแหวนคู่สำหรับเสี่ยงทาย — พอร์ตกลไกจาก legacy-artifacts/oracle_dual_ring.html
//
// วงละ 10 ช่อง (เลข 0-9 สลับที่) · ปัดเพื่อหมุน · เข็มที่ 12 นาฬิกาชี้ช่องไหน = ได้เลขนั้น
// สองวงรวมกันเป็นเลขการ์ด 00-99
//
// ตรรกะทั้งหมด (สลับเลข, อ่านค่าที่เข็ม, คำนวณองศา, easing) อยู่ใน lib/engine/oracle.ts
// ไฟล์นี้รับผิดชอบแค่ "การแสดงผลและรับสัมผัส" เท่านั้น

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SLOT_COUNT,
  shuffleDigits,
  digitAtReticle,
  slotPosition,
  spinTarget,
  easeOutQuint,
  cardIdFromDigits,
  SPIN_DURATION_MS,
} from "@/lib/engine/oracle";
import styles from "./oracle.module.css";

/**
 * รัศมีที่วางไพ่ในวง — ต้องเผื่อครึ่งทแยงมุมของไพ่ไม่ให้ล้นขอบวง
 * ไพ่ 40×56 → ครึ่งทแยง ≈ 34px · วงรัศมี 120 → 82 + 34 = 116 < 120 ✅
 */
const SLOT_RADIUS = 82;

type RingKey = "A" | "B";

interface RingState {
  map: number[];
  rotation: number;
  spinning: boolean;
  landed: number | null;
}

const initRing = (): RingState => ({ map: shuffleDigits(), rotation: 0, spinning: false, landed: null });

interface Props {
  /** เรียกเมื่อหมุนครบทั้งสองวง — ส่งเลขการ์ด 2 หลักออกไป */
  onComplete: (cardId: string) => void;
  /** เปลี่ยนค่านี้เพื่อสั่งเริ่มรอบใหม่ (สลับเลขใหม่ ล้างผลเดิม) */
  round: number;
  disabled?: boolean;
}

export default function DualRing({ onComplete, round, disabled }: Props) {
  const [rings, setRings] = useState<Record<RingKey, RingState>>({ A: initRing(), B: initRing() });
  const [done, setDone] = useState(false);
  /** ผู้ใช้เคยแตะวงแล้วหรือยัง — ใช้ซ่อนคำใบ้ 'ปัดเพื่อหมุน' */
  const [touched, setTouched] = useState(false);

  // เก็บ state ล่าสุดไว้ใน ref — animation loop อ่านค่าปัจจุบันได้โดยไม่ต้องผูก dependency
  const ringsRef = useRef(rings);
  ringsRef.current = rings;
  const doneRef = useRef(false);
  const dragRef = useRef<{ key: RingKey; lastAngle: number; velocity: number; lastT: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** แยก timer ต่อวง — เดิมใช้ ref ตัวเดียวร่วมกัน ทำให้เคลียร์ของอีกวงไม่ได้ */
  const timersRef = useRef<Record<RingKey, { raf: number | null; timeout: ReturnType<typeof setTimeout> | null }>>({
    A: { raf: null, timeout: null },
    B: { raf: null, timeout: null },
  });

  // เริ่มรอบใหม่
  useEffect(() => {
    setRings({ A: initRing(), B: initRing() });
    setDone(false);
    setTouched(false);
    doneRef.current = false;
  }, [round]);

  const finishIfBothLanded = useCallback(
    (next: Record<RingKey, RingState>) => {
      if (doneRef.current) return;
      if (next.A.landed === null || next.B.landed === null) return;
      doneRef.current = true;
      setDone(true);
      onComplete(cardIdFromDigits(next.A.landed, next.B.landed));
    },
    [onComplete]
  );

  /** หมุนวงหนึ่งวงด้วยความเร็วที่กำหนด แล้วชะลอจนหยุด */
  const spin = useCallback(
    (key: RingKey, velocity: number) => {
      const s = ringsRef.current[key];
      if (s.spinning || doneRef.current || disabled) return;

      const from = s.rotation;
      const to = spinTarget(from, velocity);
      const t0 = performance.now();
      const timers = timersRef.current[key];

      setRings((r) => ({ ...r, [key]: { ...r[key], spinning: true, landed: null } }));

      /**
       * จบการหมุน — เรียกได้จากทั้ง rAF และ timeout แต่ทำงานจริงครั้งเดียว
       *
       * 🔴 ทำไมต้องมี timeout สำรอง: `requestAnimationFrame` **หยุดทำงานเมื่อแท็บถูกซ่อน**
       *    (เบราว์เซอร์พักเฟรมเพื่อประหยัดแบตเตอรี่) ถ้าพึ่ง rAF อย่างเดียว ผู้ใช้ที่สลับแท็บ
       *    หรือล็อกหน้าจอกลางคันจะเจอวงค้างที่ "กำลังหมุน" ตลอดไป ไม่ได้ผลลัพธ์
       *    timeout จึงเป็นตัวรับประกันว่าผลจะออกเสมอ ส่วน rAF มีไว้ให้ภาพลื่นเท่านั้น
       */
      const finish = () => {
        if (timers.raf !== null) { cancelAnimationFrame(timers.raf); timers.raf = null; }
        if (timers.timeout !== null) { clearTimeout(timers.timeout); timers.timeout = null; }
        if (!ringsRef.current[key].spinning) return; // จบไปแล้ว

        const landed = digitAtReticle(ringsRef.current[key].map, to);
        setRings((r) => {
          const next = { ...r, [key]: { ...r[key], rotation: to, spinning: false, landed } };
          queueMicrotask(() => finishIfBothLanded(next));
          return next;
        });
      };

      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / SPIN_DURATION_MS);
        if (t < 1) {
          setRings((r) => ({ ...r, [key]: { ...r[key], rotation: from + (to - from) * easeOutQuint(t) } }));
          timers.raf = requestAnimationFrame(step);
        } else {
          finish();
        }
      };

      timers.raf = requestAnimationFrame(step);
      // +120ms กันเคสที่ rAF จบพอดีเป๊ะ จะได้ไม่ตัดกันเอง
      timers.timeout = setTimeout(finish, SPIN_DURATION_MS + 120);
    },
    [disabled, finishIfBothLanded]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const k of ["A", "B"] as RingKey[]) {
        if (timers[k].raf !== null) cancelAnimationFrame(timers[k].raf!);
        if (timers[k].timeout !== null) clearTimeout(timers[k].timeout!);
      }
    };
  }, []);

  // ---- รับการปัด ----
  const angleFrom = (key: RingKey, clientX: number, clientY: number): number => {
    const el = containerRef.current?.querySelector(`[data-ring="${key}"]`) as HTMLElement | null;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  function onPointerDown(key: RingKey, e: React.PointerEvent) {
    if (disabled || done || ringsRef.current[key].spinning) return;
    setTouched(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { key, lastAngle: angleFrom(key, e.clientX, e.clientY), velocity: 0, lastT: performance.now() };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const a = angleFrom(d.key, e.clientX, e.clientY);
    let delta = a - d.lastAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.velocity = delta / dt; // องศาต่อ ms
    d.lastAngle = a;
    d.lastT = now;

    setRings((r) => ({ ...r, [d.key]: { ...r[d.key], rotation: r[d.key].rotation + delta } }));
  }

  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    spin(d.key, d.velocity * 100); // แปลงเป็นหน่วยที่ spinTarget คาดหวัง
  }

  const ringView = (key: RingKey, label: string) => {
    const s = rings[key];
    return (
      <div className={styles.ringWrap}>
        <div className={styles.ringLabel}>{label}</div>
        <div
          className={styles.ring}
          data-ring={key}
          onPointerDown={(e) => onPointerDown(key, e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="button"
          tabIndex={0}
          aria-label={`${label} — ปัดเพื่อหมุน หรือกด Enter เพื่อหมุนอัตโนมัติ`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spin(key, 0);
            }
          }}
        >
          <div className={styles.reticle} aria-hidden />

          {/*
            ตัวบอกให้ใช้นิ้วปัดหมุน — แทน swipe-finger/dir-arrows ของ HTML ต้นฉบับ
            แสดงเฉพาะตอนที่ "ยังไม่เคยแตะและยังไม่หมุน" เท่านั้น พอผู้ใช้เริ่มปัดก็หายไป
            (ถ้าค้างอยู่ตลอดจะบังตัวเลขและกวนสายตา)
          */}
          {!s.spinning && s.landed === null && !touched && (
            <div className={styles.swipeHint} aria-hidden>
              <div className={styles.swipeArc} />
              <div className={styles.swipeFinger}>👆</div>
              <div className={styles.swipeWord}>ปัดเพื่อหมุน</div>
            </div>
          )}

          <div className={styles.face} style={{ transform: `rotate(${s.rotation}deg)` }}>
            {Array.from({ length: SLOT_COUNT }, (_, i) => {
              const p = slotPosition(i, SLOT_RADIUS);
              const isLanded = s.landed !== null && s.map[i] === s.landed;
              return (
                <div
                  key={i}
                  className={`${styles.slot} ${isLanded ? styles.slotLanded : ""}`}
                  style={{
                    // หมุนสวนกลับ -rotation เพื่อให้ไพ่ตั้งตรงเสมอ ไม่หมุนตามวง
                    transform: `translate(-50%,-50%) translate(${p.x}px, ${p.y}px) rotate(${-s.rotation}deg)`,
                  }}
                >
                  {isLanded ? (
                    <span className={styles.slotNumber}>{s.map[i]}</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/cardback-sm.png" alt="" className={styles.slotBack} draggable={false} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.ringDigit}>{s.landed ?? "–"}</div>
      </div>
    );
  };

  const bothIdle = !rings.A.spinning && !rings.B.spinning;

  return (
    <div ref={containerRef}>
      <div className={styles.ringRow}>
        {ringView("A", "วงนอก (หลักสิบ)")}
        {ringView("B", "วงใน (หลักหน่วย)")}
      </div>

      {!done && (
        <button
          type="button"
          className={styles.spinAll}
          disabled={disabled || !bothIdle}
          onClick={() => {
            setTouched(true);
            spin("A", 0);
            setTimeout(() => spin("B", 0), 180);
          }}
        >
          {bothIdle ? "🌀 หมุนทั้งสองวง" : "กำลังหมุน…"}
        </button>
      )}

      <p className={styles.ringHint}>
        ปัดที่วงแหวนเพื่อหมุนเอง หรือกดปุ่มให้ระบบหมุนให้ · ตั้งจิตถามในใจขณะหมุน
      </p>
    </div>
  );
}
