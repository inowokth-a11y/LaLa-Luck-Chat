/**
 * scripts/reupload-card-images.js
 * =================================
 * ✅ สถานะ: ไม่จำเป็นต้องรันแล้ว — ผู้ใช้อัปโหลดรูปทั้ง 100 ใบเข้า Supabase Storage
 * ด้วยมือโดยตรงผ่าน Dashboard สำเร็จแล้ว (bucket "master_energy_cards", ไฟล์
 * {energy_id}-removebg-preview.png ยืนยันครบ 100 ไฟล์ 00-99 ไม่มีเลขเลื่อน)
 * เก็บสคริปต์นี้ไว้เป็นข้อมูลอ้างอิง/แผนสำรอง เผื่อต้องตั้งโปรเจกต์ Supabase ใหม่
 * ในอนาคตแล้วรูปต้นฉบับหายอีกครั้ง (เคยเกิดขึ้นแล้ว 1 ครั้งกับ URL ชุดแรก)
 *
 * ดึงรูปต้นฉบับจาก Google Drive (แหล่งเดิมก่อนย้ายไป Supabase ครั้งแรก) แล้ว
 * อัปโหลดเข้า bucket "master_energy_cards"
 *
 * ⚠️ ต้องรันด้วย credentials จริง (SUPABASE_SERVICE_ROLE_KEY) — รันในเครื่อง/
 * เซิร์ฟเวอร์ของคุณเอง ไม่ใช่ในแชทนี้ (ไม่มี network access ไปยัง Supabase/
 * Google Drive จาก sandbox นี้)
 *
 * วิธีรัน (ถ้าจำเป็นต้องรันซ้ำในอนาคต):
 *   1. สร้าง bucket "master_energy_cards" ใน Supabase Dashboard ก่อน (public read) —
 *      หรือรัน migration 013_card_storage_bucket.sql ส่วน policy หลังสร้าง
 *      bucket ผ่าน Dashboard/CLI แล้ว (SQL สร้าง bucket ตรงๆ ไม่ได้)
 *   2. ตั้ง env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   3. npm install @supabase/supabase-js node-fetch
 *   4. node scripts/reupload-card-images.js
 *
 * ⚠️ ความเสี่ยง: ไฟล์ต้นฉบับใน Google Drive ต้องยังตั้งค่า "ใครมีลิงก์ก็ดูได้"
 * อยู่ ถ้าเจ้าของไฟล์ปิดสิทธิ์แชร์ไปแล้ว สคริปต์นี้จะดาวน์โหลดไม่ได้เช่นกัน
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ ต้องตั้ง env SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนรัน');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ข้อมูล Google Drive file ID ต่อการ์ด (สกัดมาจากไฟล์ CSV ต้นฉบับ)
const sourceData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/card_image_drive_source.json'), 'utf-8')
);

function driveDirectDownloadUrl(fileId) {
  // Google Drive direct-download pattern (ใช้ได้เมื่อไฟล์ตั้งเป็น "ใครมีลิงก์ก็ดูได้")
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

async function reuploadOne(record) {
  const { energy_id, drive_file_id } = record;
  if (!drive_file_id) {
    console.warn(`⚠️  ${energy_id}: ไม่มี drive_file_id ข้าม`);
    return { energy_id, status: 'skipped_no_source' };
  }

  try {
    const res = await fetch(driveDirectDownloadUrl(drive_file_id));
    if (!res.ok) {
      console.error(`❌ ${energy_id}: ดาวน์โหลดจาก Drive ไม่สำเร็จ (HTTP ${res.status})`);
      return { energy_id, status: 'download_failed', http_status: res.status };
    }
    const buffer = await res.buffer();

    const { error } = await supabase.storage
      .from('master_energy_cards')
      .upload(`${energy_id}-removebg-preview.png`, buffer, { contentType: 'image/png', upsert: true });

    if (error) {
      console.error(`❌ ${energy_id}: อัปโหลดขึ้น Supabase ไม่สำเร็จ —`, error.message);
      return { energy_id, status: 'upload_failed', error: error.message };
    }

    console.log(`✅ ${energy_id}: สำเร็จ`);
    return { energy_id, status: 'ok' };
  } catch (err) {
    console.error(`❌ ${energy_id}: error —`, err.message);
    return { energy_id, status: 'error', error: err.message };
  }
}

async function main() {
  console.log(`เริ่ม re-upload การ์ด ${sourceData.length} ใบ...`);
  const results = [];
  // ทำทีละใบ (ไม่ทำพร้อมกันหมด) กัน rate-limit ทั้งฝั่ง Drive และ Supabase
  for (const record of sourceData) {
    const result = await reuploadOne(record);
    results.push(result);
    await new Promise((r) => setTimeout(r, 300)); // เว้นจังหวะเบาๆ
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status !== 'ok'),
  };
  console.log('\n--- สรุปผล ---');
  console.log(`สำเร็จ: ${summary.ok}/${summary.total}`);
  if (summary.failed.length) {
    console.log('ที่ล้มเหลว:', JSON.stringify(summary.failed, null, 2));
    fs.writeFileSync(
      path.join(__dirname, 'reupload-failures.json'),
      JSON.stringify(summary.failed, null, 2)
    );
    console.log('บันทึกรายการที่ล้มเหลวไว้ที่ scripts/reupload-failures.json');
  }
}

main();
