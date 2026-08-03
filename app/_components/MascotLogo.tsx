// มาสคอต "LALA LUCKY CHAT" (แมวกวักลายโมเสก) — อนิเมชัน CSS ล้วน ไม่มี JS
// ใช้เป็น server component ได้เลย · ต้นฉบับความละเอียดเต็มอยู่ docs/design-assets/lala-lucky-chat-mascot.png
// ภาพเป็นของตกแต่ง (มีข้อความแบรนด์ในตัว) — aria-hidden กัน screen reader อ่านซ้ำกับ h1

import styles from "./mascot.module.css";

/** อวตารหัวแมวกลม — ใช้ข้างคำตอบของ "อาจารย์ลาลา ลักกี้" (ครอปหัวด้วย CSS จากภาพเดียวกัน)
 *  กระพริบตาเหมือนกำลังมอง (ผู้ใช้ขอ 2 ส.ค. 2569) — เปลือกตาซ้อนพิกัดตาในครอป */
export function MascotAvatar({ size = 32 }: { size?: number }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true">
      <span className={`${styles.avatarLid} ${styles.avatarLidLeft}`} />
      <span className={`${styles.avatarLid} ${styles.avatarLidRight}`} />
    </span>
  );
}

export default function MascotLogo({ size = 160, wave = true }: { size?: number; wave?: boolean }) {
  return (
    <span className={styles.wrap} style={{ width: size }} aria-hidden="true">
      <span className={styles.body} style={{ display: "block", position: "relative" }}>
        {/* ใช้ <img> ตรงๆ — ไฟล์ static ใน public/ ขนาดคงที่ ไม่ต้องผ่าน next/image optimizer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.png" alt="" width={529} height={472} className={`${styles.img} ${wave ? styles.clipPaw : ""}`} />
        {wave && (
          <span className={styles.paw}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot.png" alt="" />
          </span>
        )}
        <span className={`${styles.lid} ${styles.lidLeft}`} />
        <span className={`${styles.lid} ${styles.lidRight}`} />
      </span>
    </span>
  );
}

/**
 * แมวเกาะขอบกล่องแชท — วางใน container ที่ position:relative แล้วแมวจะโผล่เหนือช่องพิมพ์
 * เหมือนกำลังคุยกับผู้ใช้ (pointer-events: none ไม่บังการพิมพ์)
 */
export function MascotPerch({ size = 62 }: { size?: number }) {
  return (
    <span className={styles.perch} style={{ top: -Math.round(size * 0.86) }}>
      <MascotLogo size={size} />
    </span>
  );
}
