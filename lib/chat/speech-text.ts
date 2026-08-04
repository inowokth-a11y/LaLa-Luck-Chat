// เตรียมข้อความสำหรับอ่านออกเสียง (TTS v1 — Web Speech API, ผู้ใช้ตัดสิน 4 ส.ค. 2569: ฿0)
// pure — ตัด markdown/อีโมจิ/สัญลักษณ์ที่เครื่องอ่านแล้วเพี้ยน ("ดอกจันดอกจัน", อ่านชื่ออีโมจิ)

export function speechText(text: string): string {
  return (
    text
      // markdown: **bold** *italic* `code` ## header
      .replace(/\*\*|\*|`|#{1,4}\s?/g, "")
      // ลิงก์ markdown [ป้าย](url) → ป้าย
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // URL ดิบ
      .replace(/https?:\/\/\S+/g, "")
      // อีโมจิ/สัญลักษณ์ภาพ (ช่วงหลักที่ระบบใช้: emoticon, symbols, transport, supplemental, dingbat)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
      // ZWSP ที่แทรกไว้เพื่อ soft-wrap
      .replace(/​/g, "")
      // bullet/เส้นคั่น → หยุดหายใจ
      .replace(/^[•·*-]\s*/gm, "")
      .replace(/[—·|]/g, ", ")
      // ช่องว่าง/บรรทัดซ้อน
      .replace(/\n{2,}/g, ". ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
