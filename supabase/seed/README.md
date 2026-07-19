# วิธีรัน Seed Data

⚠️ **ต้องรันหลัง migration ทั้งหมด (000-017) เสมอ โดยเฉพาะ 013 + 016** — ตาราง
`master_energy_cards` ถูกสร้างครั้งแรกใน migration 011 พร้อม `image_url NOT NULL`
แล้ว migration 013 มา DROP คอลัมน์นั้นทีหลัง (แก้ปัญหา URL ตายพร้อมกันทั้งชุด) —
ถ้ารัน seed 01 ก่อน 013 จะ insert ไม่ผ่านเพราะ seed เวอร์ชันล่าสุดไม่มี image_url แล้ว

```bash
# รัน migration ให้ครบ 000-017 ก่อนเสมอ แล้วค่อย seed
# (016 เพิ่มคอลัมน์ figure_bio/figure_category/figure_bio_verified ที่ seed 01 ใช้)
supabase db execute -f seed/01_master_energy_cards.sql
supabase db execute -f seed/02_dream_symbols.sql
supabase db execute -f seed/03_dream_psychology_themes.sql
supabase db execute -f seed/04_ubakong_time_chart.sql
supabase db execute -f seed/05_personal_year_guidance.sql
supabase db execute -f seed/06_wellness_activities.sql

# หรือผ่าน psql ตรงๆ
psql "$DATABASE_URL" -f seed/01_master_energy_cards.sql
psql "$DATABASE_URL" -f seed/02_dream_symbols.sql
psql "$DATABASE_URL" -f seed/03_dream_psychology_themes.sql
psql "$DATABASE_URL" -f seed/04_ubakong_time_chart.sql
psql "$DATABASE_URL" -f seed/05_personal_year_guidance.sql
psql "$DATABASE_URL" -f seed/06_wellness_activities.sql
```

## รูปการ์ด (แยกขั้นตอนจาก seed ข้อมูลข้อความ)

รูปภาพ 100 ใบ **ไม่ได้อยู่ใน seed SQL** เพราะเป็นไฟล์ไบนารี ต้องอัปโหลดแยกผ่าน
Supabase Storage API:

1. สร้าง bucket ชื่อ `cards` ใน Supabase Dashboard (ตั้ง public read)
2. รันส่วน policy ใน `supabase/migrations/013_card_storage_bucket.sql`
3. ตั้ง env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
4. รัน `node scripts/reupload-card-images.js` — ดึงรูปจาก Google Drive ต้นฉบับ
   (แหล่งก่อนย้ายมา Supabase ครั้งแรกที่เพิ่งตายไป) มาอัปโหลดใหม่
5. ⚠️ ควรรันเร็วที่สุด เพราะไฟล์ต้นฉบับใน Drive อาจถูกปิดสิทธิ์แชร์ในอนาคตเหมือนที่
   Supabase link ตายมาแล้วครั้งหนึ่ง — ยิ่งรอยิ่งเสี่ยง

ข้อมูลแปลงมาจาก `data/*.json` ตรงๆ ด้วยสคริปต์ Python ครั้งเดียว — ถ้า `data/*.json`
มีการแก้ไขหลังจากนี้ ต้อง generate seed ใหม่ ไม่ใช่แก้ .sql ตรงๆ (จะไม่ sync กัน)

**ยังไม่ได้ทำ seed ให้:** `data/raw-uploads/*.csv` ที่เหลือ (Master_Energy_3_Digits,
Unified_Kaekled_DB, Planet/Zodiac tables) — ต้องตรวจสอบเนื้อหาและเช็คว่าซ้อนทับกับ
ของที่มีอยู่แล้วไหมก่อน (ดู CLAUDE.md §8) ค่อยสร้างตารางเพิ่ม
