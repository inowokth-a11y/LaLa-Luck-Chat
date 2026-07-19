// จุดคำนวณ URL รูปการ์ด 00-99 ที่เดียวของทั้งแอป (CLAUDE.md §1.5 + migration 013)
//
// ห้าม hardcode URL เต็มที่ไหนอีก — ทุกจุดที่ต้องการรูปการ์ดให้เรียก cardImageUrl()
// เปลี่ยน Supabase project ใหม่ = แก้ NEXT_PUBLIC_SUPABASE_URL ตัวเดียว ไม่ต้องแก้โค้ด/ข้อมูล
//
// ✅ ยืนยันจากของจริงที่ผู้ใช้อัปโหลดแล้ว (migration 013): bucket "master_energy_cards" (public),
//    ไฟล์ชื่อ {energy_id}-removebg-preview.png (00-removebg-preview.png ... 99-removebg-preview.png)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** energyId เป็นสองหลักเสมอ เช่น "00", "07", "42", "99" */
export function cardImageUrl(energyId: string): string {
  if (!SUPABASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set — ตั้งค่าใน .env.local ก่อน (ดู .env.example)"
    );
  }
  const id = normalizeEnergyId(energyId);
  return `${SUPABASE_URL}/storage/v1/object/public/master_energy_cards/${id}-removebg-preview.png`;
}

/** รับได้ทั้ง number (7) และ string ("7"/"07") คืนสองหลักเสมอ ("07") */
export function normalizeEnergyId(energyId: string | number): string {
  const n = typeof energyId === "number" ? energyId : parseInt(energyId, 10);
  if (Number.isNaN(n) || n < 0 || n > 99) {
    throw new Error(`energyId ไม่ถูกต้อง: ${energyId} (ต้องเป็น 0-99)`);
  }
  return String(n).padStart(2, "0");
}
