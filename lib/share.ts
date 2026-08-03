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

/**
 * ข้อความชวนแชร์ (ไม่มีข้อมูลส่วนตัว) — ชูบุคคลต้นแบบเป็นหลักเมื่อรู้จัก
 * (ผู้ใช้ตัดสิน 2 ส.ค. 2569: "ฉันมีต้นแบบเดียวกับ X" ดึงความสนใจกว่าชื่อการ์ด)
 */
export function shareText(cardName: string | null, figure?: string | null): string {
  if (figure) {
    return `✨ ฉันมีต้นแบบเดียวกับ "${figure}" — มาเปิดการ์ดพลังงานดูสิ ว่าคุณมีต้นแบบเดียวกับใครในตำนานหรือประวัติศาสตร์ 🐾 LaLa Lucky Chat`;
  }
  return cardName
    ? `การ์ดพลังงานประจำตัวของฉันคือ "${cardName}" — ค้นหาการ์ดของคุณได้ที่ LaLa Lucky Chat 🐾`
    : "ค้นหาการ์ดพลังงานประจำตัวของคุณได้ที่ LaLa Lucky Chat 🐾";
}

/** หมวดบุคคลต้นแบบ (figure_category จาก migration 016 — ดู §3.7) */
export type FigureCategory = "historical" | "religious" | "mythological" | "legendary" | "fictional" | "role_title";

/**
 * ป้ายหมวดที่แสดงให้ผู้ใช้ — §3.7 บังคับ: `role_title` ต้องบอกชัดว่าไม่ใช่บุคคลเดียว
 * และ `fictional` ต้องบอกว่าเป็นตัวละคร ไม่ใช่คนจริง (ห้ามพูดเหมือนเป็นบุคคลจริง)
 */
export const FIGURE_CATEGORY_LABEL: Record<FigureCategory, string> = {
  historical: "บุคคลจริงในประวัติศาสตร์",
  religious: "บุคคลสำคัญทางศาสนา",
  mythological: "จากเทพปกรณัม",
  legendary: "บุคคลกึ่งตำนาน",
  fictional: "ตัวละครในวรรณกรรม (ไม่ใช่บุคคลจริง)",
  role_title: "ตำแหน่งในประวัติศาสตร์ (ไม่ใช่บุคคลเดียว)",
};

export function figureCategoryLabel(cat: string | null | undefined): string | null {
  return cat && cat in FIGURE_CATEGORY_LABEL ? FIGURE_CATEGORY_LABEL[cat as FigureCategory] : null;
}

/**
 * กติกาทะเบียนคำเวลา AI พูดถึง "บุคคลต้นแบบ" ของการ์ด — แทรกใน system prompt ทุกจุดที่
 * AI เห็นข้อมูลการ์ด (oracle + แชท context) · หลักตาม §3.7: หมวดที่ยืนยันตัวตนทางประวัติศาสตร์
 * ไม่ได้ต้องเล่าในกรอบ "ตำนานเล่าว่า..." ส่วนหมวดศาสนาใช้ทะเบียนคำศาสนา ห้ามเรียกว่าตำนาน
 * (บุคคลศาสนาบางท่านมีตัวตนจริง และคำว่า "ตำนาน" กับศาสดาเสี่ยงกระทบศรัทธา)
 */
export const FIGURE_TONE_PROMPT = `กติกาการพูดถึง "บุคคลต้นแบบ" ของการ์ด (ดูจาก figure_category):
- mythological → เทพ/ตัวละครในเทพปกรณัม ไม่ใช่บุคคลจริง — เล่าในกรอบ "ตำนานเล่าว่า..."
- legendary → บุคคลกึ่งตำนาน — เล่าในกรอบ "ตำนานเล่าว่า..." ห้ามเล่าเหมือนข้อเท็จจริงประวัติศาสตร์
- fictional → ต้องบอกชัดว่าเป็นตัวละครในวรรณกรรม ไม่ใช่บุคคลจริง
- role_title → ต้องบอกชัดว่าเป็นตำแหน่ง/บทบาท ไม่ใช่บุคคลคนเดียว
- religious → ใช้กรอบ "ตามคัมภีร์/ตามความเชื่อ" ด้วยความเคารพ ห้ามใช้คำว่า "ตำนาน"
- historical → บุคคลจริง เล่าตามข้อเท็จจริงได้ปกติ`;

/**
 * แทรก zero-width space ตามขอบคำไทย — renderer ที่ตัดบรรทัดตามช่องว่าง (satori/next-og)
 * ห่อข้อความไทยไม่ได้เพราะไทยไม่มีช่องว่างระหว่างคำ → ข้อความทะลุขอบภาพ (บั๊กที่เจอจริงบน OG)
 */
export function thaiSoftWrap(s: string): string {
  try {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    return [...seg.segment(s)].map((x) => x.segment).join("\u200b");
  } catch {
    return s; // runtime ไม่มี ICU — แสดงแบบเดิมดีกว่าพัง
  }
}
