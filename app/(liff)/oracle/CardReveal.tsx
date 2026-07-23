"use client";

// จังหวะเปิดการ์ด — พอร์ตจาก playZoomRevealSequence() ใน oracle_dual_ring.html
//
// ลำดับ: overlay จางเข้า + การ์ดซูมจากเล็กเป็นใหญ่ → รอ 900ms → พลิกจากด้านหลังเป็นด้านหน้า
// เป็น "จังหวะพิธีกรรม" ของหน้านี้ (CLAUDE.md §2 โทนมืด = สร้างบรรยากาศขณะทำนาย)
//
// ⚠️ ผู้ใช้ต้องปิดเองด้วยการแตะ — ไม่ปิดอัตโนมัติ เพราะเป็นช่วงที่ตั้งใจให้หยุดดู

import { useEffect, useState } from "react";
import { cardImageUrl } from "@/lib/cards";
import { supabase } from "@/lib/supabase/client";
import styles from "./oracle.module.css";

/** หน่วงก่อนพลิกการ์ด — ตรงกับต้นฉบับ ให้ผู้ใช้เห็นด้านหลังก่อนสักครู่ */
const FLIP_DELAY_MS = 900;

interface Props {
  cardId: string;
  onClose: () => void;
}

export default function CardReveal({ cardId, onClose }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [essence, setEssence] = useState<string | null>(null);

  useEffect(() => {
    setFlipped(false);
    const t = setTimeout(() => setFlipped(true), FLIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [cardId]);

  /**
   * ดึงข้อมูลการ์ดเอง — ตอนเปิดรอบที่ 1 และ 2 ยังไม่ได้เรียก /api/oracle
   * (API ถูกเรียกตอนจบเท่านั้น) ถ้ารอข้อมูลจากหน้าแม่จะขึ้น "ไม่พบข้อมูลการ์ด"
   * ตาราง master_energy_cards เปิดให้อ่านสาธารณะอยู่แล้ว (migration 017)
   */
  useEffect(() => {
    let alive = true;
    setName(null);
    setEssence(null);
    supabase
      .from("master_energy_cards")
      .select("energy_name, core_essence")
      .eq("energy_id", cardId)
      .single()
      .then(({ data }) => {
        if (!alive || !data) return;
        setName(data.energy_name);
        setEssence(data.core_essence);
      });
    return () => { alive = false; };
  }, [cardId]);

  // ปิดด้วย Escape ได้ด้วย (คนใช้คีย์บอร์ด/อ่านหน้าจอ)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.revealOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`การ์ดหมายเลข ${cardId}`}
    >
      <div className={styles.revealCard3d}>
        <div className={`${styles.revealInner} ${flipped ? styles.revealFlipped : ""}`}>
          {/* ด้านหลัง — เห็นก่อน */}
          <div className={styles.revealBack} aria-hidden />
          {/* ด้านหน้า — พลิกมาเห็นทีหลัง */}
          <div className={styles.revealFront}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cardImageUrl(cardId)} alt="" className={styles.revealImg} />
            <div className={styles.revealId}>{cardId}</div>
          </div>
        </div>
      </div>

      <div className={styles.revealText}>
        <div className={styles.revealName}>{name ?? "…"}</div>
        {essence && <div className={styles.revealEssence}>{essence}</div>}
      </div>

      <div className={styles.revealCloseHint}>แตะเพื่อดูต่อ</div>
    </div>
  );
}
