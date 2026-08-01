// มาสคอต "LALA LUCKY CHAT" (แมวกวักลายโมเสก) — อนิเมชัน CSS ล้วน ไม่มี JS
// ใช้เป็น server component ได้เลย · ต้นฉบับความละเอียดเต็มอยู่ docs/design-assets/lala-lucky-chat-mascot.png
// ภาพเป็นของตกแต่ง (มีข้อความแบรนด์ในตัว) — aria-hidden กัน screen reader อ่านซ้ำกับ h1

import styles from "./mascot.module.css";

/** อวตารหัวแมวกลม — ใช้ข้างคำตอบของ "อาจารย์ลาลา ลักกี้" (ครอปหัวด้วย CSS จากภาพเดียวกัน) */
export function MascotAvatar({ size = 32 }: { size?: number }) {
  return <span className={styles.avatar} style={{ width: size, height: size }} aria-hidden="true" />;
}

export default function MascotLogo({ size = 160 }: { size?: number }) {
  return (
    <span className={styles.wrap} style={{ width: size }} aria-hidden="true">
      <span className={styles.body} style={{ display: "block" }}>
        {/* ใช้ <img> ตรงๆ — ไฟล์ static ใน public/ ขนาดคงที่ ไม่ต้องผ่าน next/image optimizer */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.png" alt="" width={529} height={472} className={styles.img} />
        <span className={`${styles.lid} ${styles.lidLeft}`} />
        <span className={`${styles.lid} ${styles.lidRight}`} />
      </span>
    </span>
  );
}
