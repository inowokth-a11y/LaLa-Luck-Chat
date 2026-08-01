// เครื่องมือแชร์การ์ด (เฟส 2) — ตรรกะล้วน ไม่แตะ network (เทสต์ตรงๆ ได้)
//
// 🔴 นโยบายความเป็นส่วนตัว: หน้าแชร์/รูป OG มีได้แค่ "ข้อมูลการ์ดสาธารณะ" (เลข/ชื่อ/แก่น
//    จาก master_energy_cards ซึ่งเปิดอ่านสาธารณะอยู่แล้ว §17) — **ห้ามมีวันเกิด เวลาเกิด
//    ชื่อผู้ใช้ หรือข้อมูลส่วนตัวใดๆ** URL จึงเป็นแค่ /card/<เลข 00-99> ไม่ผูกกับบุคคล

/** รางวัลกดแชร์ +2 คำถามฟรี — ครั้งเดียวต่อบัญชี (ตรงกับ claim_share_reward ใน migration 031) */
export const SHARE_REWARD_QUESTIONS = 2;

/** ตรวจ id การ์ดที่แชร์ได้ — เลข 2 หลัก 00-99 เท่านั้น (กัน path แปลกๆ เข้าเพจสาธารณะ) */
export function isValidCardId(id: string): boolean {
  return /^\d{2}$/.test(id);
}

/** URL หน้าแชร์สาธารณะของการ์ด */
export function cardShareUrl(origin: string, cardId: string): string {
  return `${origin.replace(/\/$/, "")}/card/${cardId}`;
}

/** ลิงก์แชร์ต่อแพลตฟอร์ม — ใช้เมื่อเบราว์เซอร์ไม่มี navigator.share (desktop) */
export function shareLinks(url: string, text: string): { line: string; facebook: string; x: string } {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    line: `https://social-plugins.line.me/lineit/share?url=${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
  };
}

/** ข้อความชวนแชร์มาตรฐาน (ไม่มีข้อมูลส่วนตัว) */
export function shareText(cardName: string | null): string {
  return cardName
    ? `การ์ดพลังงานประจำตัวของฉันคือ "${cardName}" — ค้นหาการ์ดของคุณได้ที่ LaLa Lucky Chat 🐾`
    : "ค้นหาการ์ดพลังงานประจำตัวของคุณได้ที่ LaLa Lucky Chat 🐾";
}
