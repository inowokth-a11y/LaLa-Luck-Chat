# KRUTH ELEMENT (Platform E) — Project Brief for Claude Code

> อ่านไฟล์นี้ก่อนเริ่มงานใดๆ — เป็นบันทึกการตัดสินใจทั้งหมดจากการออกแบบร่วมกับผู้ใช้
> (สนทนายาวหลายชั่วโมง) สิ่งที่ระบุว่า "ตัดสินใจแล้ว" ห้ามเปลี่ยนโดยไม่ถามผู้ใช้ก่อน
> สิ่งที่ระบุว่า "ยังไม่ยืนยัน/ประมาณการ" ต้องบอกผู้ใช้ทุกครั้งที่แตะโค้ดส่วนนั้น

## 0. ภาพรวมโปรเจกต์

**KRUTH ELEMENT (Platform E)** คือแพลตฟอร์มดูดวง/ไลฟ์สไตล์ของ KRUTH APEX / Di Vi Jitr
เน้น "การคำนวณจริง" (ธาตุ, โหราศาสตร์ไทย, ตัวเลข) ไม่ใช่การเดา — แยกจาก **Platform D
(KRUTH MIND)** ซึ่งเป็นระบบ coach บุคลิกภาพสำหรับองค์กร/esports (คนละโดเมน คนละฐานข้อมูล
เชิงลึก แต่แชร์ users/Bridge API บางส่วน)

**Stack ที่ตัดสินใจแล้ว:** Next.js (App Router) + Vercel + Supabase (Postgres)
**ปฏิเสธแล้ว:** FastAPI/Python บน production (ใช้แค่ตอนพัฒนา/ทดสอบสูตรในเซสชันนี้ —
ทุกเอนจินใน `legacy-python-engines/` ต้อง**พอร์ตเป็น TypeScript** ก่อนขึ้น production)
**ช่องทางผู้ใช้:** LINE OA (หลัก, chat-first) + LIFF mini-app (สำหรับหน้าที่ต้องโต้ตอบ/เห็นภาพ)

---

## 1. สถาปัตยกรรมระบบ

```
LINE OA → Logic 0 (AI Router, ยังไม่เขียนโค้ด — ต้องสร้างใหม่)
   ├─ ตอบในแชทตรงๆ:      Logic 4 (ฝัน), Logic 18 (ทั่วไป)
   └─ เปิด LIFF mini-app:  Logic 1 (โปรไฟล์), 8-11 (ดวง), 20 (ความสัมพันธ์), 21 (เสี่ยงทาย)
                                    ↓
                          Supabase (แหล่งข้อมูลเดียว)
```

**หลักการแบ่ง chat vs LIFF:** งานที่ "ทำให้เสร็จเร็ว ไม่ต้องเห็นภาพ" → ตอบในแชท
งานที่ "ต้องโต้ตอบ/ลากปัด/ดูกราฟ" → เปิด LIFF (อ้างอิงงานวิจัย UX ที่คุยกันไว้:
Conversational UI สำหรับงานที่มีเป้าหมายชัด, Visual GUI สำหรับงานสำรวจ/เปรียบเทียบ)

---

## 1.5 ✅ Card Image URL — แก้เสร็จสมบูรณ์แล้ว (เดิมเคยตายทั้งชุด)

**อัปเดตล่าสุด: ผู้ใช้อัปโหลดรูปครบ 100 ใบเข้า Supabase Storage จริงแล้วด้วยตัวเอง**
(ยืนยันจาก screenshot Dashboard) — รายละเอียดจริงที่ต้องใช้ในโค้ด:

- **ชื่อ bucket จริง: `master_energy_cards`** (ไม่ใช่ `cards` ตามแผนตั้งต้น)
- **รูปแบบชื่อไฟล์จริง: `{energy_id}-removebg-preview.png`** (ไม่ใช่ `{energy_id}.jpg`)
  เช่น `00-removebg-preview.png`, `37-removebg-preview.png`, ..., `99-removebg-preview.png`
- **ยืนยันแล้วว่าเลขไม่เลื่อน** — ไฟล์ `00-...` มีอยู่จริงและตรงกับ `energy_id="00"`
  (ฤษี) พอดี ไม่ต้องกังวลเรื่อง off-by-one ที่เคยตั้งข้อสงสัยไว้

**สูตร URL ที่ถูกต้อง (ใช้สูตรนี้ในโค้ดแอปจริง):**
```js
const cardImageUrl = (energyId: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/master_energy_cards/${energyId}-removebg-preview.png`;
```

**ไฟล์ที่อัปเดตให้ตรงกับของจริงแล้ว:** `supabase/migrations/013_card_storage_bucket.sql`
(policy ใช้ bucket_id ถูกต้องแล้ว), `scripts/reupload-card-images.js` (มาร์คว่าไม่จำเป็น
ต้องรันแล้ว เก็บไว้เป็นแผนสำรองเท่านั้น)

**สิ่งที่ยังไม่ได้แก้ (ต้องทำต่อ):**
- `legacy-artifacts/intake_form.html` และไฟล์อื่นที่เคย embed URL การ์ดแบบ JS literal
  ยังมี URL ตายฝังอยู่ (ทั้งจาก Google Drive เวอร์ชันแรกสุด และ Supabase เวอร์ชันที่ตาย
  ไปแล้ว) — ต้องแก้ตอนพอร์ตเป็น React component ให้เรียกสูตร URL ข้างบนแทน
- ตาราง `master_energy_cards` (migration 011) มีคอลัมน์ `has_image BOOLEAN` จาก
  migration 013 — ยังไม่ได้ set เป็น `true` จริงผ่าน UPDATE statement (คอลัมน์นี้มี
  default เป็น true อยู่แล้วตอนสร้างแถวใหม่ แต่ควร verify ว่า 100 แถวที่มีอยู่ค่านี้ถูก)

## 2. ระบบดีไซน์ (ตัดสินใจแล้ว — ใช้ 2 โทนตามหน้าที่ ไม่ใช่ความผิดพลาด)

| โทน | ใช้กับ | เหตุผล |
|---|---|---|
| 🌑 **มืด** (`--bg:#14101c`, gold accent, ลูกแก้ว/starfield) | พิธีกรรม/โต้ตอบสด: Oracle Draw, Dream Chat | สร้างบรรยากาศ "ขณะทำนาย" |
| ☀️ **สว่างหินอ่อน** (`--marble-bg:#f4f0e6`, gold facet-panel, clip-path เหลี่ยม) | ข้อมูล/ผลลัพธ์ถาวร: Profile, Fortune Dashboard | น่าเชื่อถือ อ่านง่าย เหมือนเอกสารทางการ |

**Typography ทุกหน้า (คงที่):** Noto Serif Thai (หัวข้อ) + Noto Sans Thai (เนื้อหา) +
JetBrains Mono (ตัวเลข/โค้ด) — โหลดจาก Google Fonts CDN

**⚠️ TODO ที่ค้างอยู่:** `legacy-artifacts/compatibility_dashboard.html` ยังเป็นโทนมืด
ทั้งที่ตามกฎควรเป็นสว่าง (มันคือหน้าข้อมูล ไม่ใช่พิธีกรรม) — **ต้องแปลงเป็นโทนสว่างตอนพอร์ต
เป็น LIFF page** อย่าคัดลอกสีมืดเดิมไป

**สิ่งที่ควรทำตอนพอร์ต:** สกัดค่าสีทั้งสองโทนออกเป็น `lib/design-tokens.ts` หรือ
`app/globals.css` (CSS variables) ไฟล์เดียว ให้ทุกหน้า import ใช้ร่วมกัน — ตอนนี้แต่ละ
`legacy-artifacts/*.html` copy-paste ค่าสีซ้ำกันเอง เสี่ยง drift ถ้าแก้ทีละไฟล์

---

## 3. สถานะ 21 Logic Modules

อ้างอิงเอกสารทางการ: `docs/KRUTH_21_Logic_Modules_v1.1.docx` (มีสเปกครบทุก Logic รวม
Layer Weights, Input/Output, สมการ, Knowledge Base, Router guideline)

**อัปเดตล่าสุด:** Logic 0, 2, 3(บางส่วน), 19, 20, 21 ทำเพิ่มจนครบ/เกือบครบแล้วในรอบนี้

| Logic | ชื่อ | สถานะ | ไฟล์อ้างอิง |
|---|---|---|---|
| 0 | **Router** | ✅ ทำงานจริงครบ 3 ชั้น | `lib/engine/router.ts` + `app/api/logic/router/route.ts` — Safety gate → keyword → **AI จริง (Haiku 4.5)** แทน `claude_classify_stub()` แล้ว ดู §10 · ⚠️ ยังไม่ได้ต่อสายเรียก Logic ปลายทาง |
| 1 | พลังงานส่วนบุคคล | ✅ ทำงานจริง | `legacy-python-engines/kruth_element_engine.py` + `legacy-artifacts/intake_form.html` |
| 2 | เบอร์โทร/ทะเบียน/วัตถุ | ✅ ทำงานจริง | `legacy-python-engines/artifact_numerology_engine.py` — 2-digit lookup ตรง 100%, 3-digit fallback รายหลักเมื่อไม่พบใน 14 แถวตัวอย่าง, เบอร์โทร ⚠️ สูตรออกแบบเสริมเอง ไม่ verify |
| 3 | ฤกษ์ยาม | ✅ **ทำงานจริงแล้ว 2 ระดับ** (Ubakong รายชั่วโมง + Kala Yoke รายปี) | `legacy-python-engines/auspicious_timing_engine.py` (ยามกลางวัน) + `kala_yoke_engine.py` (ธงชัย/อธิบดี/อุบาทว์/โลกาวินาศ, verify กับวิกิพีเดีย) — ดู §3.6 |
| 4 | ทำนายฝัน | ✅ ทำงานจริง | `legacy-python-engines/dream_interpretation_engine.py` + `legacy-artifacts/dream_chat.html` |
| 5,6 | ใบหน้า/รูปทิพย์ | ❌ ยังไม่ทำ | ต้องใช้ Vision API |
| **7** | **ฮวงจุ้ย** | ✅ **ทำแล้ว** | `lib/engine/fengshui.ts` + `app/(liff)/fengshui/` — **ไม่ต้องใช้ Vision API** (สเปกจริงเป็นฟอร์ม) ดู §11 |
| 8 | ดวงรายวัน | ✅ ทำงานจริง | `legacy-python-engines/daily_prediction_engine.py` |
| 9,10,11 | เดือน/ปี/วันเกิด(ทักษาจร) | ✅ ทำงานจริง | `legacy-python-engines/transit_engine.py` |
| 12,16 | อาหาร/สุขภาพ/กิจกรรม | ⚠️ มีตารางเฉยๆ | TTM_LIFESTYLE ใน kruth_element_engine.py ไม่มีหน้า |
| 13,15 | ลงทุน/ท่องเที่ยว | ❌ ยังไม่ทำ | — |
| 17 | ความรัก(คู่รัก, face matching) | ❌ ยังไม่ทำ | ต่างจาก Logic 20 |
| 18 | เสี่ยงทายทั่วไป | ✅ ทำงานจริง | ใช้ engine เดียวกับ 21 |
| 19 | ตั้งชื่อ/โลโก้ | ✅ ทำงานจริง (ยกเว้นภาพ) | `legacy-python-engines/naming_branding_engine.py` — คำนวณชื่อ+aggregate+reverse generation ครบ ไม่มี image-gen (ได้แค่ prompt ข้อความ) ⚠️ ตาราง 9 กลุ่มอักษร→5 ธาตุ ยังไม่ verify กับตำรา |
| 20 | ความสัมพันธ์หลาย entity | ✅ เป็นหน้า React แล้ว | `app/(liff)/compatibility/` + `lib/engine/compatibility.ts` — โทนสว่าง, Productive Clash, คะแนนรวม 0-100 (ดู §10) ⚠️ ไม่ใช่ golden parity port |
| 21 | เสี่ยงทายผูกบริบท | ✅ ทำงานจริง สมบูรณ์แล้ว | `legacy-artifacts/oracle_dual_ring.html` — เพิ่มขั้นตอน "เลือกเลเยอร์ก่อนหมุน" (self/place/vehicle/organization/other_person) + คำนวณ oracle_element จากเลขหลักหน่วยที่ออก + เทียบ wu_xing_score กับทุกเลเยอร์ที่ผูกไว้ แสดงผลใน layer-result-card |

**8, 9, 10, 11 ใช้ลัคนาเดียวกัน** (คำนวณครั้งเดียว, ใช้ร่วมกันทุก Logic ในกลุ่มนี้)

**สิ่งที่ยังไม่ได้ทำในรอบนี้ (ตามที่ผู้ใช้สั่งให้เว้นไว้เฟส 2):** Logic 5,6,7,12,13,15,16,17
และการเชื่อม Logic 0 Router เข้ากับ Logic 1/4/8-11/19/20/21 จริง (ตอนนี้แต่ละ Logic ยัง
เป็นไฟล์แยกกัน Router แค่ "บอกว่าควรไป Logic ไหน" ยังไม่ได้ต่อสายเรียกจริง)

---

## 3.5 ✅ Wellness Activity Engine — เชื่อมครบ 3 จุดที่เคยค้างไว้แล้ว

1. **รวมเป็นระบบเดียวกับ TTM_LIFESTYLE**: `kruth_element_engine.ttm_remedy_for_missing()`
   ตอนนี้เป็น**จุดเรียกเดียว** — คืนทั้งรส/อาหาร/สี (ของเดิม) + `wellness_practice`
   (เทคนิคภายใน/ภายนอก/combo_routine/งานวิจัยอ้างอิง จาก `wellness_activity_engine.py`)
   ไม่ต้อง import สองไฟล์แยกกันอีกต่อไป
2. **เชื่อมกับ Dream Recurring แล้ว** (`dream_interpretation_engine.py`):
   `log_dream_occurrence()` เก็บแค่ `{user_id, theme, year_month, count}` — **ห้ามเพิ่ม
   field ตีความเด็ดขาด** (มี assert ในเทสต์คอยเช็คโครงสร้างนี้) `check_dream_recurring()`
   ตรวจเกณฑ์ ≥3 ครั้ง/เดือน ติดกัน 2 เดือนจริง (ไม่ใช่แค่นับเดือนรวม) แล้ว
   `get_recurring_theme_suggestion()` ดึง `element_connection` จาก dream_psychology_50
   → แปลงเป็น element → เรียก wellness engine คืนเป็น "กิจกรรมแนะนำ" เท่านั้น
   ไม่ใช่ข้อความวินิจฉัย
3. **ย้ายเข้า Supabase แล้ว**: `supabase/migrations/014_wellness_and_dream_recurring.sql`
   + `supabase/seed/06_wellness_activities.sql` — ตาราง `dream_occurrence_log` มี RLS
   บังคับเห็นแค่ข้อมูลตัวเอง และมี comment เตือนไว้ในตัว SQL เองว่าห้ามเพิ่มคอลัมน์
   ตีความ

**ยังไม่ได้ทำ:** ปีนักษัตรจริงในฟอร์ม oracle_dual_ring.html (ยังคงที่ "มะเส็ง"),
`other_person` layer ยังใช้ Element Seed แบบย่อ (วันเกิดอย่างเดียว), ยังไม่มี AI
orchestration จริงสำหรับบทสนทนา 5 ช่วงที่ออกแบบไว้ (เปิดใจ→ถามชัดเจน→ผูกเลเยอร์→
ทำนาย→ถามต่อ 3 ครั้ง) — เป็นแค่ UI เปล่าที่รอต่อ API จริง

## 3.6 ✅ Kala Yoke (กาลโยค) — เพิ่มระดับ "วันประจำปี" ให้ Logic 3

พบสูตรสมบูรณ์จากวิกิพีเดียภาษาไทย (https://th.wikipedia.org/wiki/กาลโยค) พร้อม
ตัวอย่างเฉลยตัวเลขจริง (จ.ศ. 1369) — **verify แล้วตรงเป๊ะ 100% ยกเว้น 1 จุดที่
ต้นฉบับวิกิพีเดียเองพิมพ์ผิด** (ยามธงชัย: บทความเขียนเศษ 6 แต่ 1711×8+5=13693
พิสูจน์ด้วยเลขคณิตตรงๆ ว่าเศษที่ถูกคือ 5 — ใช้ค่าที่ถูกต้องทางคณิตศาสตร์ ไม่ใช่ค่าที่
บทความเขียนไว้)

**หลักการ:** ปี จ.ศ. (จุลศักราช = ค.ศ. - 638 = พ.ศ. - 1181) แต่ละปีมี "วันประจำปี"
ตายตัว 4 แบบ ตลอดทั้งปี (16 เม.ย. - 15 เม.ย. ปีถัดไป):
- **ธงชัย, อธิบดี** = วันดี (ธงชัยใช้กับสิ่งของ/สถานที่, อธิบดีใช้กับบุคคล/อำนาจ)
- **อุบาทว์, โลกาวินาศ** = วันร้าย

**คนละระบบกับ Ubakong** — Ubakong แบ่งช่วงเวลา*ภายใน 1 วัน* (10 ยาม, กลางวันเท่านั้น),
Kala Yoke กำหนด*วันในสัปดาห์*ที่ดี/ร้ายตลอดทั้งปี จ.ศ. — ใช้ประกอบกัน ไม่ใช่แทนกัน

**ฟังก์ชันรวม** `check_combined_auspicious_time()` ผสาน Kala Yoke (ระดับปี) +
Ubakong (ระดับชั่วโมง) เป็นคำตอบเดียว ตามหลักถ่วงดุลที่พบในตำรา ("วันดีแต่เจอยาม
ร้ายก็ไม่เป็นมงคล, วันร้ายแต่เจอยามดีก็สลายผลร้ายได้") — ไม่ใช่แค่บวกคะแนนกัน

⚠️ **แก้ไขแล้ว (เดิม Known limitation)** — กรณีวันหนึ่งมีทั้งกาลโยคดีและร้ายพร้อมกัน:
ค้นข้อมูลเพิ่มพบหลักที่ถูกต้องจากอาศรมศรีจักรวาล: **"วันโลกาวินาศไม่ได้วินาศทั้งวัน
หากยามอธิบดีไม่เสียก็ใช้ได้"** — ตัวชี้ขาดคือ **"ยามของกาลโยคเอง"** (sub-level, คนละ
ระบบจาก Ubakong) ไม่ใช่แค่นับจำนวนวันดี/ร้าย (นับแบบเดิมเป็นความเข้าใจผิดที่บทความ
เตือนไว้ตรงๆ ว่า "ผิดหลักการกาลโยคโดยสิ้นเชิง") — แก้ `check_combined_auspicious_
time()` ให้ใช้ยามกาลโยคตัดสินกรณีนี้แล้ว มีเทสต์ยืนยัน

⚠️ **สำคัญที่พบระหว่างค้นข้อมูล:** นักโหราศาสตร์ไทยระดับอาจารย์ใหญ่หลายท่าน**เลิกใช้
กาลโยคเป็นเกณฑ์หลักแล้ว** เพราะยังไม่มีข้อพิสูจน์ความแม่นยำเพียงพอ — ใส่ caveat นี้
ไว้ในทุก response ของฟังก์ชันแล้ว ไม่ใช่แค่บอกในเอกสาร

✅ **เชื่อมกับ Logic 8 แล้ว** — `check_full_auspicious_time()` รวม 3 ชั้น (Kala Yoke +
Ubakong + ดวงส่วนบุคคลจาก Lagna/ดวงจันทร์จร/กาลกิณี) ด้วยวิธีนับเสียงส่วนใหญ่ (2/3
สัญญาณตรงกัน = ชี้ขาด) แทนการถ่วงน้ำหนักซับซ้อน เพราะแต่ละชั้นมาจากคนละที่มา
ความเชื่อมั่นกัน ให้น้ำหนักเท่ากันตรงไปตรงมาที่สุด — gracefully degrade เป็น 2 ชั้น
ถ้าไม่มีข้อมูลลัคนา (มีเทสต์ยืนยันทั้ง 2 กรณี)

❌ **ยังไม่ได้ทำ — Flying Stars + ฤกษ์บน 27 ฤกษ์ (ขอบเขตใหญ่กว่ามาก ไม่ใช่แค่เพิ่ม
ฟังก์ชัน):**
- **Flying Stars (ทิศดาวเหิน 9 ยุค)**: ต้องมีตารางดาว 9 ยุค (แต่ละยุค ~20 ปี) + กฎ
  การผูกทิศบ้าน/ผังเรือน + กฎตีความ 81 คู่ (ดาวปี×ดาวเดือน) — เป็นศาสตร์ฮวงจุ้ยแยก
  ทั้งระบบ ไม่ใช่สูตรเดียวแบบกาลโยค ต้องวิจัยแยกเป็นโปรเจกต์ย่อยของตัวเอง
- **ฤกษ์บน 27 ฤกษ์ (นภดล/ภูมิดล)**: ต้องมีตำแหน่งดวงจันทร์ผ่านกลุ่มดาวฤกษ์จริง (ต่าง
  จาก moon sign ที่มีอยู่แล้ว) + กฎการตีความทั้ง 27 ฤกษ์ (ราชาฤกษ์/ทลิทโทฤกษ์ ฯลฯ) —
  พบตัวอย่างบางส่วนระหว่างค้น (เช่น ทลิทโทฤกษ์=ผู้ขอ, ดาวเกตุเป็นเจ้าฤกษ์) แต่ไม่ครบ
  ทั้ง 27 ฤกษ์ ต้องค้นเพิ่มเติมจริงจัง

**คำแนะนำ:** ถ้าจะทำ Flying Stars/27 ฤกษ์ ควรเปิดเป็นงานวิจัยแยกรอบใหม่ (เหมือนที่ทำ
กับ Ubakong/Kala Yoke ที่ผ่านมา) ไม่ใช่ทำต่อในเซสชันเดียวกับสิ่งที่ทำไปแล้ว เพราะขนาด
ข้อมูลที่ต้องหาใหญ่กว่ามาก

## 3.7 ✅ ประวัติ/เรื่องราวบุคคลต้นแบบ (archetype_figure) — ครบทั้ง 100 ใบ

เพิ่มคอลัมน์ `figure_bio` (ประวัติสั้น 2-3 ประโยค), `figure_category`, `figure_bio_verified`
เข้า `master_energy_cards` แล้ว (`data/figure_bios.py`, migration 016, seed 01 อัปเดตแล้ว)

**สำคัญมาก — ต้องรู้ก่อนใช้จริง:**
- **ตรวจสอบแล้วว่าไฟล์ต้นฉบับไม่มีข้อมูลนี้เลย** (`detailed_profile`/`challenges_shadow`
  เป็นเรื่องพลังงานตัวเลข ไม่ใช่ประวัติบุคคล) — ข้อมูลนี้ Claude ค้นคว้า+เขียนขึ้นใหม่ทั้งหมด
- **ยืนยันด้วย web search จริงแค่ 2/100**: "เทพีไพเธีย" (พบว่าเป็นตำแหน่งนักบวช ไม่ใช่
  บุคคลเดียว) และ "เจ้าชายมิชกิน" (พบว่าเป็นตัวละครนิยาย Dostoevsky ไม่ใช่บุคคล/ตำนาน)
  — ทั้งสองกรณีถ้าไม่ค้นจะเขียนผิดประเภทไปเลย
- **อีก 98 รายการเขียนจากความรู้ทั่วไปที่เชื่อถือได้ ไม่ได้ผ่านการค้นเว็บเจาะจงทีละคน**
  (ปริมาณ 100 คนเกินขอบเขตที่จะค้นเว็บยืนยันทุกคนในรอบเดียวได้ไหว) — ส่วนใหญ่เป็นบุคคล
  ประวัติศาสตร์ที่มีชื่อเสียงระดับโลก (เทสลา, นโปเลียน, พระพุทธเจ้า ฯลฯ) ซึ่งความเสี่ยง
  ผิดพลาดต่ำ แต่**ยังไม่ผ่านการ verify แบบเป็นระบบ** — ก่อนใช้จริงจัง ควรสุ่มตรวจหรือ
  ให้ผู้เชี่ยวชาญอ่านทานอีกรอบ โดยเฉพาะกลุ่ม `mythological`/`legendary` (24 รายการ) ที่มี
  หลายเวอร์ชันในตำนานต่างสำนัก
- **แบ่งหมวดหมู่ (`figure_category`) สำคัญมากสำหรับ AI ตอนสร้างคำทำนาย**: `role_title`
  (2 รายการ) ต้องบอกผู้ใช้ชัดว่า "ไม่ใช่บุคคลเดียว", `fictional` (1 รายการ) ต้องบอกว่า
  "เป็นตัวละครในนิยาย" ไม่ใช่คนจริง — ถ้า AI พูดถึงคนกลุ่มนี้เหมือนเป็นบุคคลจริงเฉยๆ
  จะผิดข้อเท็จจริง

**แจกแจง 100 รายการ:** historical 65, mythological 17, religious 8, legendary 7,
role_title 2, fictional 1

## 4. การตัดสินใจสำคัญที่ห้ามย้อน (พร้อมเหตุผล — สำคัญมาก อย่าถามผู้ใช้ซ้ำ)

1. **การ์ด Master_Energy_00_99 (Track A) มาจาก BirthPower เพียงอย่างเดียว**
   ไม่ใช่ Birth+Name+Time+Day รวมกัน (ตามที่เอกสารรุ่นเก่าเคยเขียนไว้) — verify แล้วจาก
   ตำราต้นฉบับ (ภาคผนวกท้ายสุด) ว่า "เลขตัวตน 00-99" คือ BirthPower ล้วนๆ ผ่าน
   `reduceToInterpretivePower` (หยุดที่ 2-3 หลัก ไม่ลดทอนต่อ)
   **ข้อยกเว้นสำคัญ:** ถ้าระบบจริงที่ deploy อยู่ตอนนี้ใช้สูตร Birth+Name+Time+Day
   (Prompt_Lala_Lucky) อยู่แล้วและผลออกมาดี ผู้ใช้ยืนยันให้ **คงสูตรเดิมไว้** เพราะเป็น
   ระบบทดลองที่ใช้งานจริงแล้ว — **อย่าเปลี่ยนสูตรนี้เองเด็ดขาด** ถามผู้ใช้ก่อนทุกครั้ง

2. **role_card_id (เลขการ์ดอีกระบบจาก Logic 1 V2/V3) — เลิกใช้แล้ว**
   เหลือแค่ `core_number` เป็นข้อมูลตัวเลขเสริม ไม่ใช้เป็นระบบการ์ด

3. **digit-bridge (ธาตุจากเลขโดดของการ์ด 00-99) — เลิกใช้แล้ว**
   การ์ด 00-99 มีหน้าที่เป็น archetype/เรื่องราวเท่านั้น **ไม่ใช่ตัวกำหนดธาตุ**
   ธาตุจริงมาจาก `calculate_element_seed()` (5 แหล่งข้อมูลจริง ดู §6)

4. **Logic 1 (Suriyayart % matrix) ยึดเวอร์ชัน V2** (L1:L2:L3:L4 = 40:20:25:15)
   ไม่ใช่ V3 "Precision Edition" (70:25:5, บังคับกรุ๊ปเลือด) — V3 เพิ่ม friction
   ตอนสมัครสมาชิกโดยไม่จำเป็น

5. **Track A / B / C แยกกันเสมอ ห้ามเฉลี่ยรวมเป็นค่าเดียว**
   - Track A = การ์ด archetype (เรื่องราว, จาก BirthPower)
   - Track B = Suriyayart % matrix (สมดุลธาตุ, จาก Logic 1 V2)
   - Track C = ธาตุจากเลขเสี่ยงทาย (Logic 21, จากตาราง §5.4 เลข→ธาตุ)
   - pDCR (Bridge จาก Platform D) = ธาตุไทย 4 ธาตุจาก Big Five inference (ตัวตนปัจจุบัน)
   ใช้ `calc_deviation()` (ดู §6) เทียบสองแทร็กใดๆ แทนการเขียน if/else ใหม่ทุกครั้ง

6. **ตัวอักษร "อ" ขัดแย้งกันเองในเอกสารต้นฉบับ** (ภาคผนวกให้กลุ่ม 6, โค้ดจริงให้กลุ่ม 4)
   ยังไม่ได้แก้ — ใช้กลุ่ม 4 ตามโค้ดจริง (เชื่อโค้ดมากกว่า prose) แต่ควรถามเจ้าของระบบ

7. **Dream Psychology 22 vs 50 themes ขัดกันระหว่างเอกสาร** — Handbook บอกมี 50 เสร็จแล้ว
   Calculation Manual (พ.ค. 2569) บอกมีแค่ 22 ⚠️ **ต้องตรวจไฟล์จริงก่อน launch**
   (ไฟล์ที่มีอยู่ตอนนี้ใน `data/dream_psychology_50.json` มี 50 records จริง — น่าจะแก้ไขแล้ว
   แต่ควร cross-check กับต้นทางอีกครั้ง)

---

## 5. สูตรที่ verify แล้ว vs ยังไม่ verify (สำคัญมาก — บอกผู้ใช้เสมอเมื่อแตะส่วนที่ยังไม่ verify)

### ✅ Verify แล้ว (มีหลักฐาน/ทดสอบแล้ว)
- **BirthPower/NamePower calculation**: ตรงกับตัวอย่างคำนวณจริงในตำรา ("สมชาย รักดี" → 11)
- **Longitude correction (Suriyayart)**: ตรงกับตัวอย่างกรุงเทพฯ ในตำรา (-18.0 นาที)
- **Kalakini table (ทักษาปกรณ์)**: cross-check กับตารางมาตรฐานที่เผยแพร่ทั่วไป ตรงทุกวัน
- **Friction Score formula**: รันกับข้อมูลจริง (users_rows.csv + results_rows.csv +
  category_flags_rows.csv) ได้ผล Fog Flag rate สูงกว่า 5 เท่าในกลุ่ม friction สูง
  (เอกสารอ้าง 3 เท่า, n=42 vs ข้อมูลจริงที่ join ได้ n=79/64 unique — **n ไม่ตรงกัน
  ต้องสืบเพิ่ม**)
- **12 ภพ (house names)**: cross-check เว็บหลายแหล่งตรงกัน
- **Wu Xing Score + Productive Clash**: ตรงตาม Calculation Manual สมการ 2-3 เป๊ะ
- **ตาราง `DAY_ELEMENT` (ธาตุประจำวันเกิด)**: ✅ **แก้แล้ว ก.ค. 2569** — ตรงกับ
  `KRUTH_ELEMENT_Platform_E_v1.docx` ("อังคาร/อาทิตย์=ไฟ | จันทร์/ศุกร์=น้ำ | พุธ/เสาร์=ดิน
  | พฤหัส=ลม") ค้นทุกเอกสารแล้วพบตารางนี้แหล่งเดียว ไม่มีฉบับขัดแย้ง — ดู §5.1
- **ธาตุจีนตามเลขท้ายปี + ขอบเขตลี่ชุน**: ✅ ตรงกับข้อมูลผู้ใช้จริงของ Platform D
  **80/80 แถว** (เดิม 75/80) หลังเพิ่มขอบเขตลี่ชุน — ดู §5.1

### ⚠️ ยังไม่ verify / เป็นการประมาณการ (ต้องบอกผู้ใช้ทุกครั้งที่แตะ)
- ~~**Lagna (ลัคนา) — ไม่เคยตรวจกับดวงจริง**~~ → ✅ **แก้แล้ว ก.ค. 2569 ดู §5.2**
- **ตำแหน่งดวงจันทร์**: สูตรย่อ (~15 พจน์ Meeus) แม่นระดับลิปดา ไม่ใช่ ephemeris เต็ม
- **ตำแหน่งพฤหัส/เสาร์**: ใช้ mean-motion ล้วนๆ (ไม่มี perturbation) แม่นระดับปี ไม่แม่น
  ระดับวัน/องศา — Logic 10 (รายปี) จึงหยาบกว่า Logic 8-9
- **"Age_Element" (Logic 11)**: สเปกเดิมไม่นิยามชัด — **จงใจไม่ implement** ดีกว่าเดา
- **ราหู (วันศุกร์เกิด) ไม่มีเรือนคงที่**: Kalakini/Logic 8 ตรวจไม่ได้สำหรับกลุ่มนี้
- **Dream symbol matching เป็น substring แบบง่าย**: อาจ over-match คำสั้นๆ
- **AI-1 enrichment (Kangxi stroke formula)**: ทดสอบแล้วว่า**ทั้ง 2 สำนักจีนไม่ตรงกับ
  ฐานข้อมูลจริง** (~20% = สุ่มเดา) — ธาตุคำใหม่ต้องมาจาก "การตัดสินเชิงความหมาย" ไม่ใช่
  นับขีด ดู `get_ai1_system_prompt()` ใน dream_interpretation_engine.py
- **Logic 2 — สูตรวิเคราะห์เบอร์โทร**: ไม่มีสูตรทางการระบุไว้ที่ไหนเลย ออกแบบเสริมเอง
  (ดูเลข 3 หลักท้าย + ผลรวมทั้งเบอร์) — ต้องหาสูตรจริงมา verify ก่อนใช้จริง
- **Logic 2 — 3-digit fallback**: `Master_Energy_3_Digits` มีแค่ 14 แถวตัวอย่าง (ไม่ครบ
  000-999) เลขที่ไม่อยู่ใน 14 แถวนี้จะ fallback ไปวิเคราะห์รายหลักแทน (ออกแบบเอง)
- **Logic 3 — ยามอุบากอง**: ✅ **แก้แล้ว** — ผู้ใช้อัปโหลด `Ubakong_Time_Chart.xlsx` (35
  แถวจริง ครบ 7 วัน × 5 ยามกลางวัน พร้อม meaning/verdict/score) เข้าไปที่
  `data/ubakong_time_chart.json` + `supabase/migrations/012_ubakong_and_personal_year.sql`
  + `supabase/seed/04_ubakong_time_chart.sql` แล้ว — ยามกลางคืน (18:01-06:00) และ Flying
  Stars (ทิศดาวเหิน 9 ยุค) ยังไม่มีข้อมูล ต้องหาเพิ่มแยกต่างหาก
- **Logic 19 — ตาราง 9 กลุ่มอักษร → 5 ธาตุจีน (`GROUP_TO_ELEMENT`)**: ออกแบบเองตาม
  สัดส่วนกลุ่ม/ธาตุ ยังไม่ verify กับตำรา (ต่างจาก NamePower/BirthPower ที่มีตัวอย่าง
  คำนวณจริงให้เทียบ) — ควรตรวจสอบก่อนใช้แนะนำชื่อจริงจัง
- **Element Seed ของคนเกิดเดือน ก.พ. ที่ไม่มี `birth_day`**: ลี่ชุนตกวันที่ 3-5 ก.พ.
  ถ้าไม่รู้วันที่จะตัดสินขอบปีจีนไม่ได้ → ระบบใช้ปีเดิมตามสเปก **ฟอร์มรับข้อมูลจริงควรเก็บ
  วันเกิดเต็มเสมอ** (ดู §5.1 B1)

---

## 5.2 🔴 ลัคนาคำนวณผิดมาตลอด — แก้ด้วยสูตรดาราศาสตร์แล้ว (19 ก.ค. 2569)

**พบตอนทดสอบว่าพิกัดจังหวัดมีผลกับลัคนาจริงไหม** (หลังเพิ่มจังหวัดครบ 77)

### หลักฐานว่าของเดิมผิด
ตรึงพิกัดกรุงเทพ ไล่ลัคนาตลอด 24 ชม. → ได้แค่ **9 ราศี** ไม่ใช่ 12
**กรกฎ/สิงห์/กันย์ หายไป** ถูกบีบอัดในช่วง 06:00-06:30 ส่วนราศีอื่นกินราศีละ ~3 ชม.

**ต้นตอ:** `ANTO_NATEE` รวมกันได้ **2,028 นาที** แต่ลัคนาต้องวนครบ 12 ราศีใน 1 วัน =
**1,440 นาที** → เกิน 41% → วนได้แค่ 8.5 ราศี/วัน

🔴 **โค้ดไม่ได้พอร์ตผิด** — เปิด `ตำราจตุพลวัตร_V_10.docx` ตารางที่ 5 แล้ว ตัวเลข
(150/160/175/183/178/168/168/178/183/175/160/150) **ตรงกับโค้ดทุกตัว ตัวตำราเองที่ผลรวมไม่ลงตัว**

### วิธีที่ใช้แทน (ผู้ใช้เลือกทางเลือก "ค")
`lib/engine/ascendant.ts` — สูตรมาตรฐานสากล: LST → obliquity → `atan2` → ลบอายนางศะลาหิรี

**พิสูจน์ความถูกต้อง 3 ชั้น (9 เทสต์):**
1. วนครบ 12 ราศี/วัน · รวมเวลา **1,440 นาทีพอดี** · ราศีละ 1.65-2.25 ชม.
2. ไล่ราศีตามลำดับ ไม่กระโดดข้าม (เปลี่ยน 12 ครั้ง/วันพอดี)
3. 🔴 **ข้อพิสูจน์ชี้ขาด: ตอนอาทิตย์ขึ้น ลัคนา ≈ ลองจิจูดอาทิตย์** ส่วนต่าง **−0.85°
   คงที่ทุกวันที่ทดสอบ** ซึ่งตรงกับนิยามอาทิตย์ขึ้น (หักเหแสง −0.833° + รัศมีจานสุริยะ) พอดี

ตัวอย่างจริง: เกิด 7 ต.ค. 1986 06:28 กรุงเทพฯ → เดิมได้ **ตุลย์ (ผิด)** ตอนนี้ได้ **กันย์ (ถูก)**

⚠️ **ยังเก็บ `calculateLagna()` เดิมไว้** เพราะหน้า fortune ใช้ค่าอาทิตย์ขึ้น/ชดเชยเวลาจากมัน
— แต่ **ไม่ใช้ `lagna_sign` ของมันแล้ว**

### ✅ แก้แล้ว — ระบบราศีเป็นนิรายนะ (ไทย) ทั้งระบบ (ผู้ใช้สั่ง 19 ก.ค. 2569)

เดิม `getZodiacSign()` ไม่ลบอายนางศะ = ใช้ราศีสายนะ (ตะวันตก) ซึ่ง**ผิดสำหรับโหราศาสตร์ไทย**
(ต่างกัน ~24° เกือบเต็มราศี) พอร์ตตรงจาก Python ซึ่งก็ผิดมาแต่แรก

**วิธีแก้:** `getZodiacSign(longitudeDeg, jd?)` — ใส่ `jd` → ลบอายนางศะลาหิรี ได้ราศีไทย
· ไม่ใส่ → คืนค่าสายนะแบบเดิม (ใช้เฉพาะเทียบ Python)

**จุดที่เปลี่ยนเป็นนิรายนะแล้ว:** ราศีอาทิตย์รายเดือน · ราศีพฤหัส/เสาร์รายปี (`transit.ts`)
· ราศีดวงจันทร์ (`daily.ts`) · ลัคนา (`ascendant.ts` ทำไปแล้ว)
→ **ทั้ง 4 ตัวใช้ระบบเดียวกันแล้ว**

**golden test ปรับให้แยกสองเรื่องออกจากกัน** (ไม่ใช่ลบทิ้ง):
1. **ลองจิจูดยังเทียบกับ Python เป๊ะ** — พิสูจน์ว่าคณิตศาสตร์ที่พอร์ตมาไม่ได้เปลี่ยน
2. **ราศีเทียบว่า "ถอยจาก Python 1 ราศี"** — พิสูจน์ว่าลบอายนางศะจริง
3. เพิ่มเทสต์: 1 ม.ค. 2569 สายนะ=มังกร → ไทยต้องเป็น**ธนู** · และตรวจว่าทั้งปี
   ราศีต่างจากแบบตะวันตก **81% ของวัน** (ตรงกับ 24.2°/30° ที่ควรเป็น)

## 5.1 ✅ แก้บั๊ก Element Seed 2 จุด (ก.ค. 2569) — พบจากการตรวจข้อมูลผู้ใช้จริง 90 แถว

พบระหว่างทำ data-quality report ของ `users` export จาก Platform D
(สคริปต์: `scripts/gen-users-dq-report.mjs` → ผลอยู่ใน `data/sensitive/`, gitignored)
**แก้ทั้ง `legacy-python-engines/kruth_element_engine.py` และ `lib/engine/element.ts` พร้อมกัน**
เพื่อรักษา golden-test harness — regenerate fixtures แล้ว, tests 82/82 ผ่าน

### B2 — ตาราง `DAY_ELEMENT` ผิด 2 จุด (สลับวันกัน)

ต้นฉบับ `KRUTH_ELEMENT_Platform_E_v1.docx`: **"อังคาร/อาทิตย์=ไฟ | จันทร์/ศุกร์=น้ำ |
พุธ/เสาร์=ดิน | พฤหัส=ลม"**

| วัน | ของเดิมในโค้ด | แก้เป็น |
|---|---|---|
| พุธ | ลม (Wood) ❌ | **ดิน (Earth)** |
| พฤหัสบดี | *หายไปทั้งวัน* ❌ | **ลม (Wood)** |

ผลกระทบเดิม: คนเกิด**วันพฤหัสบดีถูกข้าม Source 1 ของ Element Seed แบบเงียบๆ** (คะแนนมาจาก
4 แหล่งแทน 5) — ในข้อมูลจริงมีถึง 11/90 แถว (12%) ไม่ใช่เคสหายาก

### B1 — ธาตุจีนไม่ได้คิดขอบเขต "ลี่ชุน" (立春)

⚠️ **สำคัญ: นี่คือส่วนที่ "ต่างจากสเปกเดิม" โดยตั้งใจ** — เอกสารเขียนแค่ *"เบญจธาตุจีน
ตามเลขท้ายปี"* ไม่ได้ระบุขอบเขตปี แต่ปีจีนไม่ได้เริ่ม 1 ม.ค.

- ระบบเลขท้ายปีนี้คือ **ทศกัณฑ์ฟ้า (Heavenly Stem)** ซึ่งตามหลัก BaZi ปีเปลี่ยนที่
  **ลี่ชุน (3-5 ก.พ.)** ไม่ใช่ตรุษจีนและไม่ใช่ 1 ม.ค.
- **หลักฐาน:** ทุกเคสที่ข้อมูล Platform D ต่างจากสูตรเลขท้ายปีล้วนเป็นคนเกิดเดือน ม.ค.
  และใช้ธาตุปีก่อนหน้า — ตรงหลักลี่ชุน **5/5 เคส** ส่วนคนเกิด ก.พ. (หลังลี่ชุน) ตรงทุกแถว
- **วิธีคำนวณ:** หาวันที่ดวงอาทิตย์ถึงลองจิจูดสุริยวิถี 315° ด้วย `solarEclipticLongitude()`
  ที่ verify แล้วใน `lagna.ts` — **ไม่ต้องมีตาราง lookup วันตรุษจีน/ลี่ชุนเลย**
- **Backward compatible:** ไม่ส่ง `birth_month` → ใช้สูตรเดิมตามสเปกเป๊ะ;
  ส่ง month/day → ใช้ขอบเขตลี่ชุน (`calculate_element_seed` ส่งให้อัตโนมัติ)

### 🟠 ยังค้าง — `users.thai_element` ของ Platform D นิยามไม่ตรงกับธาตุประจำวัน

ไม่ตรงกับตาราง `DAY_ELEMENT` ถึง 60/79 แถว และคนเกิดวันพฤหัสฯ ได้ค่าหลากหลาย (น้ำ/ดิน/ลม/ไฟ)
→ แปลว่าฟิลด์นี้ของ D **คำนวณจากกฎอื่น** **ต้องสอบถามทีม D ว่านิยามคืออะไรก่อนที่ Platform E
จะนำฟิลด์นี้ไปใช้** ห้ามสมมติว่าเป็นธาตุประจำวัน

---

## 6. Engine หลักที่ต้องพอร์ต Python → TypeScript

ทุกไฟล์ใน `legacy-python-engines/` มี self-test (`if __name__ == "__main__":`) ที่ผ่านแล้ว
— ใช้เป็น**ชุดทดสอบอ้างอิง**ตอนพอร์ต (พอร์ตเสร็จต้องได้ผลลัพธ์ตรงกันทุกตัวเลข ไม่ใช่แค่
"ดูสมเหตุสมผล") หลายไฟล์มีเวอร์ชัน JS ที่ port และ test แล้วอยู่ใน `legacy-artifacts/*.html`
(ฝังอยู่ใน `<script>`) — เอาโค้ด JS ตรงนั้นมาแยกเป็นโมดูลได้เลย ไม่ต้องพอร์ตใหม่จาก Python

### ✅ พอร์ตครบแล้ว (ก.ค. 2569) — 82 golden tests ผ่านหมด

| Python file | → TypeScript | สถานะ |
|---|---|---|
| `kruth_element_engine.py` | `lib/engine/element.ts` | ✅ |
| `wellness_activity_engine.py` | `lib/engine/wellness.ts` | ✅ |
| `suriyayart_lagna_engine.py` | `lib/engine/lagna.ts` | ✅ (ดาราศาสตร์ — เทียบด้วย tolerance 1e-6) |
| `daily_prediction_engine.py` | `lib/engine/daily.ts` | ✅ |
| `transit_engine.py` | `lib/engine/transit.ts` | ✅ |
| `artifact_numerology_engine.py` | `lib/engine/numerology.ts` | ✅ |
| `auspicious_timing_engine.py` | `lib/engine/auspicious.ts` | ✅ |
| `kala_yoke_engine.py` | `lib/engine/kalayoke.ts` | ✅ |
| `dream_interpretation_engine.py` | `lib/engine/dream.ts` | ✅ (ยังใช้ substring matching — ย้ายไป FTS เป็นงานแยก) |
| `naming_branding_engine.py` | `lib/engine/naming.ts` | ✅ |
| `router_engine.py` | `lib/engine/router.ts` | ✅ (ต่อ AI จริงแล้ว ดู §10) |

**Golden-test harness (สำคัญ — ใช้ซ้ำเมื่อพอร์ต/แก้ engine):**
```
engine.py (แหล่งอ้างอิง) → tests/fixtures/gen_*_fixtures.py → *.fixture.json
lib/engine/*.ts          → npm test (tsx + node:test) → deepEqual เทียบ
```
- แก้สูตรเมื่อไหร่ **ต้องแก้ทั้ง .py และ .ts พร้อมกัน** แล้ว `npm run test:fixtures` regenerate
- gotcha ที่เจอมาแล้ว: Python `%` เลขลบให้ผลบวก (ต้องมี `pymod`) · `round()` เป็น half-to-even
  (`pyRound`) · `Counter.most_common` tie-break = insertion order · trig ต่าง ULP ระหว่าง
  libm/V8 (ใช้ tolerance) · engine ใช้ syntax 3.10+ แต่เครื่องมี Python 3.9 → loader
  prepend `from __future__ import annotations` โดยไม่แตะไฟล์ต้นฉบับ

**Safety Gate ต้องอยู่หน้าสุดของทุก endpoint ที่รับ free-text** (dream, oracle question field)
— ห้ามมีข้อยกเว้น ตรงกับหลักการจาก KRUTH Chatbot Detection Logic Manual (Platform D)

---

## 7. ✅ Supabase — รันจริงบน instance production แล้ว (ก.ค. 2569)

ไฟล์อยู่ใน `supabase/migrations/` เรียงลำดับตามชื่อไฟล์ — ดูรายละเอียดแต่ละตารางใน
`docs/KRUTH_21_Logic_Modules_v1.1.docx` §Database Log ของแต่ละ Logic

**สถานะจริง: migration 000-017 (19 ไฟล์) + seed 01-06 รันครบแล้ว** → 22 ตาราง
ข้อมูลยืนยัน: การ์ด 100 · สัญลักษณ์ฝัน 457 · ธีมจิตวิทยา 50 · อุบากอง 35 · personal year 12 ·
wellness 5 · รูปการ์ดใน Storage เข้าถึงได้จริง (HTTP 200)

**เครื่องมือ:** `scripts/db-migrate.mjs` (รันทีละไฟล์ ห่อ transaction, ระบุชื่อไฟล์เพื่อรันเฉพาะบางตัวได้)
+ `scripts/verify-db.mjs` (ตรวจยอด 100/457/50) — ต้องมี `SUPABASE_DB_URL` ใน `.env.local`

### ⚠️ ตาราง `users` — ไฟล์ 001 ของ Platform D หายไป (ธง §7 เดิมคลี่คลายแล้ว)

migration 002-008/010 ของ E มี FK `REFERENCES users(id)` แต่**ไม่มีไฟล์ไหนสร้างตาราง `users` เลย**
(ชุด migration ของ Platform D ที่มีอยู่เริ่มที่ 002 — ไฟล์ 001 หายไป, และไม่มี
`006_add_delusion_columns.sql` ตามที่ธงเดิมอ้าง)

แก้โดยสร้าง **`000_users_from_platform_d.sql`** ประกอบขึ้นจาก:
- ✅ **ชื่อคอลัมน์จริง 41 ตัว** จาก export ตาราง users ของ D
- ✅ `id` เป็น **TEXT** (dvjId เช่น `DEM-XXXX`) — ยืนยันจาก FK ทั้งสองแพลตฟอร์ม
- ✅ `line_user_id UNIQUE` (D migration 031), `occupation/special_skills/interests` (D migration 034)
- ⚠️ **ชนิดข้อมูลเป็นการอนุมานจากค่าจริง 90 แถว ไม่ใช่ DDL ต้นฉบับ** — จุดที่ยังไม่ชัดคือ
  `screen_width/screen_height` (ว่างทั้ง 90 แถว) **ถ้าได้ DDL จริงจาก D ควรเทียบและปรับ**
- 🔒 สร้างแค่โครงตารางเปล่า **ไม่มีการคัดลอกข้อมูลผู้ใช้ข้าม D↔E**

ตาราง `longitudinal_snapshots_e` (ที่ 008 ALTER) ก็ไม่มีนิยามเช่นกัน → สร้าง
**`007b_influence_tracking_e.sql`** โดย**คัดลอก DDL ตรงจากเอกสารทางการ**
`KRUTH_ELEMENT_E_Influence_Tracking_v1.docx §8` (ต่างจาก users — อันนี้ไม่ได้อนุมาน)

### ✅ RLS — ออกแบบและใช้งานจริงแล้ว

RLS เปิดครบทั้ง 22 ตาราง แบ่ง 2 กลุ่มตามที่ตกลงไว้:
- **ฐานความรู้สาธารณะ** (การ์ด/ฝัน/ธีม/อุบากอง/personal year/wellness/kala yoke) →
  `017_public_read_knowledge_base.sql` ให้ **SELECT ได้ทุกคน แต่เขียนไม่ได้** (service role ข้าม RLS อยู่แล้ว)
- **ตารางข้อมูลผู้ใช้** (users, subscriptions, chat_sessions, `*_e` ฯลฯ) → **ล็อกตามเดิม**
  (ทดสอบด้วย anon key แล้วอ่านไม่ได้จริง)

> 🔴 **บทเรียนสำคัญ:** migration 010 เปิด RLS ทุกตารางแต่สร้าง policy เฉพาะตารางผู้ใช้ ทำให้
> ฐานความรู้ถูกล็อกไปด้วย → client อ่านได้ **0 แถวแบบเงียบๆ ไม่ error** ตรวจเจอตอน verify
> เท่านั้น **หลังแก้ RLS ทุกครั้งต้องทดสอบด้วย anon key จริง อย่าดูแค่ว่า policy ถูกสร้าง**

**หมายเหตุ clinical fields:** ฐานข้อมูล Platform E **ไม่มีตาราง `results`/`category_flags`
เลย** (เป็นของ Platform D) ความเสี่ยงข้อมูลคลินิกรั่วข้ามแพลตฟอร์มจึงเป็นศูนย์ในตอนนี้ —
ถ้าอนาคตจะดึงผ่าน Bridge API ต้องกรอง clinical fields ออกที่ต้นทางเสมอ

**Migration 011 + seed (§8) เป็นตารางฐานความรู้ (content), ไม่ใช่ user data** — ไม่ต้องมี
RLS แบบเข้มเท่าตารางอื่น (การ์ด/สัญลักษณ์ฝัน/ธีมเป็นข้อมูลสาธารณะที่ทุก user อ่านได้หมด)
แต่การเขียน (INSERT/UPDATE) ควรจำกัดเฉพาะ service role หรือ admin เท่านั้น — ผู้ใช้ทั่วไป
เขียนได้แค่ทาง `dream_pending_discoveries` (ผ่าน AI-1 pipeline) ไม่ใช่ตารางหลักโดยตรง

---

## 8. ข้อมูลจริงที่มีอยู่แล้ว (อย่าสร้างใหม่ ใช้ของใน `data/` และ `docs/`)

### เอกสารต้นทาง (`docs/source-materials/`) — อ่านก่อนแก้สูตรใดๆ ที่เกี่ยวข้อง
- `KRUTH_Element_System_Calculation_Manual.pdf` — **เอกสารทางการที่ยึดเป็นสูตรหลัก**
  (สมการ 1-5, ตาราง §5.4 เลข→ธาตุ) — ทุกครั้งที่สงสัยเรื่องสูตรธาตุ ให้เปิดไฟล์นี้ก่อน
- `ตำราจตุพลวัตร_V_10.docx` — ตำรา 151 หน้า ต้นทางของ: ตารางอันโตนาที (ภาคผนวก ข.1),
  อัลกอริทึมลัคนา, ตัวอย่างคำนวณ BirthPower/NamePower ที่ verify ได้จริง, ตาราง ข.2
  "คุณลักษณะ 12 ลัคนาราศี" (**พบว่ามีแต่ไม่เคยเอามาใช้ตลอดเซสชันนี้ — โอกาสต่อยอด**)
- `Prompt_Lala_Lucky_chat.pdf` — system prompt ตัวจริงของแชทบอท "อาจารย์ลาลา" พร้อม
  response template 4 แบบ (A: รหัสชีวิต, B: ทำนายฝัน, C: เลขทะเบียน/เบอร์โทร,
  D: ลายเซ็น) — ใช้เป็นต้นแบบตอนเขียน Logic 0 Router ตอบกลับผู้ใช้
- `KRUTH_Chatbot_Detection_Logic_Manual.pdf` — ต้นทางของ Safety Gate + Deviation Engine
  ที่พอร์ตมาใช้แล้ว (ดู §6) มีรายละเอียดเพิ่มเติมเรื่อง Intent Router 14 ประเภท,
  Adaptive Question Selection (4 lens), Pattern Detection (8 patterns) ที่ยังไม่ได้
  เอามาใช้กับ Platform E — อาจนำมาปรับใช้กับการสนทนาแบบ adaptive แทน Mini
  Assessment 10 ข้อคงที่ได้ในอนาคต
- ไฟล์อื่นใน `docs/source-materials/` (18_โลจิคเดิม, Logic_1_V4, การบูรณาการฯ,
  KRUTH_ELEMENT_Platform_E_v1, Handoff.md, Influence_Tracking_v1,
  Platform_Handbook_v1) — เอกสารพัฒนาการที่ถูกสังเคราะห์รวมเข้า
  `docs/KRUTH_21_Logic_Modules_v1.1.docx` แล้ว เก็บไว้เพื่อ traceability เท่านั้น
  ถ้าขัดกับ v1.1 ให้ยึด v1.1 เป็นหลักเสมอ

### ข้อมูลตาราง (`data/raw-uploads/`) — ยังไม่เคยเปิดเนื้อหาเลยตลอดเซสชันนี้
- ~~`Personal_Year_Guidance_csv.csv`~~ — ✅ **แก้แล้ว**: ผู้ใช้อัปโหลด `.xlsx` เวอร์ชันจริง
  (12 แถว: 1-9 + Master Number 11,22,33) เข้า `data/personal_year_guidance.json` +
  `kruth_element_engine.calculate_personal_year()` / `get_personal_year_guidance()` แล้ว
  — Logic 1 CASE 1 ใช้งานได้ครบตอนนี้ (เดิม CSV เวอร์ชันนี้ค้างอยู่ ไม่เคยเปิดใช้)
- `Master_Energy_3_Digits_csv.csv` — ✅ ใช้แล้วใน `artifact_numerology_engine.py`
  (Logic 2) แต่มีแค่ 14 แถวตัวอย่าง ไม่ครบ 000-999 (ดู fallback mechanism)
- `Unified_Kaekled_DB_csv.csv` — ฐานข้อมูลวิธีแก้เคล็ด (Sheet: Dream/Objects/Food/
  Activities) — **ยังใช้ตาราง `TTM_LIFESTYLE` ที่พิมพ์มือแทนอยู่** ยังไม่เปิดเทียบ
- `Planet_Meanings_csv.csv`, `Planetary_Relationships_csv.csv`, `Zodiac_Signs_csv.csv`
  — ตาราง "Thai Astrology Logic" ต้นฉบับจาก Prompt_Lala_Lucky — **ระบบภพ+มุมสัมพันธ์ที่
  สร้างในเซสชันนี้ (transit_engine.py) เป็นแนวทางคู่ขนานที่พัฒนาขึ้นเอง ไม่ได้อิงไฟล์นี้
  โดยตรง** ควรเทียบว่าขัดกันหรือเสริมกันก่อนรวมระบบ

### ข้อมูลสำเร็จรูป (`data/*.json`) — พร้อมใช้เลย + มี Supabase migration/seed แล้ว
- `data/master_energy_00_99.json` — 100 การ์ด (id, name, essence, figure, img URL จริง)
- `data/dream_master_db.json` — 457 สัญลักษณ์ฝัน
- `data/dream_psychology_50.json` — 50 ธีมจิตวิทยาความฝัน
- `data/dream_pending_discoveries.json` — ตัวอย่าง AI-1 pipeline (โดรน) รอรีวิว

**อัปเดต:** ทั้ง 3 ฐานความรู้แรก (การ์ด, สัญลักษณ์ฝัน, ธีมจิตวิทยา) ย้ายเข้า Supabase แล้ว
ผ่าน `supabase/migrations/011_content_knowledge_base.sql` (schema) +
`supabase/seed/01-03_*.sql` (data, generate จาก JSON ตรงๆ) — ดูวิธีรันใน
`supabase/seed/README.md` เหตุผลที่ย้าย: (1) AI-1 ต้องเขียนข้อมูลใหม่ได้จริงไม่ใช่แค่
local JSON, (2) compute ต้องอยู่ฝั่ง server ตามสถาปัตยกรรมที่ตัดสินใจไว้ §1, (3) เปิดทาง
ใช้ Postgres Full-Text Search (`tsvector` + `pg_trgm`, ใส่ไว้ใน schema แล้ว) แก้ปัญหา
"substring matching over-match คำสั้น" ที่ตั้งธงไว้ — **แต่ยังไม่ได้แก้โค้ด matching ให้ใช้
FTS จริง** (ตอนนี้ schema พร้อมแล้วเฉยๆ ยังใช้ logic substring แบบเดิมอยู่ ต้องเปลี่ยนตอน
พอร์ต `dream_interpretation_engine.py` เป็น TS ให้ query ผ่าน `search_vector` แทน)

### ⚠️ ข้อมูลอ่อนไหว (`data/sensitive/`)
`results_rows.csv`, `users_rows.csv`, `category_flags_rows.csv` — ข้อมูลผู้ใช้จริง
69-90 คน รวมฟิลด์คลินิก **อ่าน `data/sensitive/README.md` ก่อนแตะไฟล์กลุ่มนี้เสมอ**
มี `.gitignore` กันไว้แล้วที่ root — อย่าลบ/แก้ gitignore บรรทัดนี้โดยไม่ถามผู้ใช้ก่อน

**`users_data_quality_report.md`** (สร้างด้วย `scripts/gen-users-dq-report.mjs`) — รายงาน
คุณภาพข้อมูล users ของ Platform D 90 แถว สรุปปัญหาที่ต้องแก้**ที่ต้นทาง**:
- 🔴 `dob` เก็บเป็น **พ.ศ. ปนกับ ค.ศ. 9 แถว** + เสียหาย 1 แถว → `age` ติดลบ 10 แถว
  **อันตรายที่สุด: เอนจิน E รับ `birth_year_ad` (ค.ศ.) ถ้าป้อน พ.ศ. เข้าไปจะคำนวณผิดทั้งหมด
  แบบไม่ error** → ต้องมี normalization layer ฝั่ง E เสมอ (ปี > 2400 → ลบ 543, นอกช่วง → fail loudly)
- 🟠 `zodiac_animal` ว่าง 63/90 → Element Seed เหลือ 4 แหล่งจาก 5 (คำนวณจากปีเกิดได้ ควร backfill)
- 🟡 ซ้ำ: 90 แถว = 78 คนจริง
- ✅ `day_of_week` ตรงกับวันในสัปดาห์ของ `dob` ครบ 80/80 — ฟิลด์นี้เชื่อถือได้

### Design asset
`docs/design-assets/lala-lucky-chat-cardback.png` — โลโก้การ์ดหลังต้นฉบับความละเอียดสูง
(1414×2000) ที่ผู้ใช้ออกแบบเอง — เวอร์ชันครอป/ย่อขนาดถูกฝังเป็น base64 ไว้แล้วใน
`legacy-artifacts/oracle_dual_ring.html` (ทั้งไอคอนเล็กสำหรับการ์ดในวงแหวน และเวอร์ชัน
ใหญ่สำหรับ zoom-reveal overlay) — ถ้าต้องใช้ที่ความละเอียดอื่น ใช้ไฟล์ต้นฉบับนี้แทนการ
ครอปจาก base64 ที่ฝังไว้ (คุณภาพจะลดลงถ้าครอปซ้ำจากเวอร์ชันย่อ)

---

## 9. ลำดับงานที่แนะนำสำหรับ Claude Code

### ✅ เสร็จแล้ว (ก.ค. 2569)
1. ~~`create-next-app`~~ → โครง Next.js 15 + TS + Tailwind พร้อม (`npm run build` ผ่าน)
   *หมายเหตุ: เครื่อง dev ไม่มี Node มาก่อน — ติดตั้ง Node v24 LTS ไว้ที่ `~/.local/node/bin`
   (ไม่ได้อยู่ใน PATH ถาวร ต้อง `export PATH="$HOME/.local/node/bin:$PATH"` ก่อนรันคำสั่ง npm/node)*
2. ~~ตั้ง Supabase + รัน migration/seed~~ → **รันจริงครบแล้ว** (ดู §7)
3. ~~รูปการ์ด~~ → bucket `master_energy_cards` ครบ 100 ใบ ยืนยัน HTTP 200 (ดู §1.5)
4. ~~`lib/design-tokens.ts`~~ → สร้างแล้ว + CSS variables 2 โทนใน `app/globals.css` (ดู §2)
5. ~~พอร์ต engine~~ → **ครบทุกตัวยกเว้น router, 82 golden tests ผ่าน** (ดู §6)

6. ~~แปลง HTML → React~~ → **ทำแล้ว 4/5 หน้า** (ดู §10) เหลือ `compatibility` (Logic 20)
7. ~~ต่อ AI จริง~~ → **ทำแล้ว: `lib/ai/` ต่อครบ 3 เจ้า + dream/oracle ใช้งานได้** (ดู §10)
   เหลือ **Logic 0 Router** (`app/api/logic/router/route.ts`) — engine ยังไม่ได้พอร์ต
8. ตั้ง LINE OA webhook (`app/api/line/webhook/route.ts`) — key มีครบใน `.env.local` แล้ว
9. ทดสอบ end-to-end ก่อน deploy จริง โดยเฉพาะ Safety Gate ต้องทำงานทุก entry point ที่รับ
   free-text

**ถามผู้ใช้ก่อนเสมอ** ถ้าเจอจุดที่ระบุว่า "ยังไม่ verify" ใน §5 หรือ "ตัดสินใจสำคัญ" ใน §4
ที่ต้องเปลี่ยน — อย่าตัดสินใจเองโดยไม่แจ้ง เพราะผู้ใช้ต้องการรู้ทุกจุดที่เป็นการประมาณการ
vs ของจริงที่ตรวจสอบแล้ว (เป็นหลักการที่ยึดมาตลอดการออกแบบระบบนี้)

---

## 10. 📍 สถานะล่าสุด + วิธีทำงานต่อ (อัปเดต 19 ก.ค. 2569)

### สิ่งแวดล้อม — อ่านก่อนรันคำสั่งใดๆ
```bash
export PATH="$HOME/.local/node/bin:$PATH"   # ⚠️ Node v24 ไม่อยู่ใน PATH ถาวร ต้อง export ก่อนเสมอ
cd /Users/freeman/Desktop/kruth-element
```
- **ตรวจสุขภาพระบบ:** `npx tsc --noEmit && npm test && npm run build` (ควรได้ 237/237 tests)
- **dev server:** ใช้ `.claude/launch.json` (ชี้ node binary ตรงๆ เพราะ npm shebang หา node ไม่เจอ)
- 🐛 **ถ้าหน้า React ฟอร์มรีโหลดเอง/ปุ่มไม่ทำงาน → สงสัย `.next` เสียก่อน** ให้ `rm -rf .next`
  แล้วรีสตาร์ท (เจอ 2 ครั้งแล้ว อาการหลอกมาก: log แสดง `GET /page?` = ฟอร์ม submit แบบ native
  เพราะ React ไม่ hydrate) **อย่าไปไล่แก้โค้ด**
- `.env.local` มี key ครบแล้ว: Supabase (URL/anon/service_role/DB_URL) · ANTHROPIC · OPENAI · GEMINI · LINE

### ✅ ทำเสร็จแล้ว
| ส่วน | สถานะ |
|---|---|
| Engine ทั้งหมด (รวม router) | ✅ 237 tests ผ่าน (พอร์ตครบทุกตัวแล้ว) |
| Supabase | ✅ migration 000-017 + seed รันจริง 22 ตาราง (§7) |
| หน้า `/profile` (Logic 1) | ✅ ทดสอบใน browser จริง — การ์ด+ธาตุ+ประวัติบุคคล |
| หน้า `/fortune` (Logic 8-11) | ✅ ทดสอบจริง — ลัคนา/รายวัน/เดือน/ปี/ทักษาจร |
| หน้า `/dream` + `/api/dream` | ✅ Safety Gate → engine → AI-1 → AI-2 |
| หน้า `/oracle` + `/api/oracle` | ✅ สุ่มการ์ด → ธาตุ → Wu Xing → AI-2 |
| `lib/ai/` (3 providers) | ✅ ต่อครบ + พิสูจน์ fallback chain แล้ว |

### 🤖 ชั้น AI — `lib/ai/` (ต่อครบแล้ว ทดสอบยิงจริงทุกตัว)
| บทบาท | Chain (primary → สำรอง) |
|---|---|
| Router | Claude Haiku 4.5 → Gemini 3.5 Flash → Claude Sonnet 5 |
| AI-1 นักค้นคว้า | Claude Sonnet 5 (web search) → Gemini 3.5 Flash → Claude Opus 4.8 |
| AI-2 อาจารย์ลาลา | **OpenAI gpt-5.5** → Gemini 3.5 Flash → Claude Opus 4.8 → template non-LLM |

⚠️ **model id ทุกตัว verify แล้วว่ามีจริง — อย่าเดาเอง:**
- `gpt-5` **ไม่มีอยู่จริง** (เคยตั้งผิด) ตัวที่ใช้ได้คือ `gpt-5.5` · field ต้องเป็น `max_completion_tokens`
- **Gemini รุ่น Pro ทุกตัวคืน 429** (key อยู่ free tier) ใช้ได้เฉพาะ **Flash**
- ตรวจรุ่นที่ใช้ได้: `GET /v1/models` (OpenAI) · `GET /v1beta/models` (Gemini)

### 💰 ต้นทุนจริง (วัดจาก API จริง ก.ค. 2569, @36 บาท/USD)
| Flow | Token | บาท/ครั้ง |
|---|---|---|
| Profile · Fortune | ไม่ใช้ AI | **฿0** |
| Oracle | 341 in / 648 out | ฿0.76 |
| Dream ปกติ | 432 in / 568 out | ฿0.69 |
| **Dream + AI-1** 🔴 | **52,046 in** / 4,207 out + 4 web search | **฿10.02** |

ราคา: gpt-5.5 $5/$30 · Sonnet 5 $3/$15 · Opus 4.8 $5/$25 · Gemini Flash $1.50/$9 · web search $10/1000

**โครงสร้างเครดิตที่เสนอไว้:** Profile/Fortune ฟรีไม่จำกัด (ต้นทุน ฿0 = แม่เหล็กดึงผู้ใช้) ·
Dream/Oracle = 1 เครดิต · ขาย ฿3-5/เครดิต (margin 3-5x เพราะยังไม่รวม infra/การตลาด)

### ✅ Cache ผล AI-1 — ทำแล้ว (19 ก.ค. 2569)

`lib/dream/discovery-cache.ts` + `migration 018` + wire เข้า `app/api/dream/route.ts`
(ข้อสังเกต: ธงเดิมเขียนว่า "เขียนอย่างเดียวไม่เคยอ่าน" — ของจริงคือ route **ไม่เคยเขียนเลย**
ตารางว่างเปล่า ตอนนี้เขียนแล้วทั้งสองทาง)

- ลำดับใหม่ใน route: engine ไม่พบ → **อ่านแคช** → ไม่มีจึงเรียก AI-1 → บันทึกกลับเข้าแคช
- response เพิ่ม field `discovery_source`: `"none" | "cache" | "ai1"` (ดูได้ว่าประหยัดจริงไหม)
- migration 018: unique index บน `dream_object` (เดิมไม่มี เขียนซ้ำได้ไม่จำกัด) +
  `hit_count`/`last_used_at` + RPC `bump_dream_discovery_hit()` (นับแบบ atomic, service role เท่านั้น)
- upsert ใช้ `ignoreDuplicates` — **แถวที่มนุษย์รีวิว/แก้แล้วจะไม่ถูก AI-1 ทับ**
- ⚠️ แคชใช้ substring match แบบเดียวกับ engine เพื่อให้จับคำตรงกัน → **สืบทอดปัญหา
  over-match คำสั้นมาด้วย** กันไว้แค่ 2 ชั้น (ข้ามคำ < 3 ตัวอักษรฐาน, เลือกคำยาวสุด)
  ยังไม่ใช่ทางแก้จริง — ต้องย้าย engine + แคชไป FTS พร้อมกัน (งานข้อ 6 ด้านล่าง)
- ⚠️ `thaiBaseLength()` — `.length` ของ JS ใช้กับไทยไม่ได้ ("ข้า" = 3 code unit แต่ 2 ตัวอักษร)
  ถ้าเขียนโค้ดวัดความยาวคำไทยที่อื่นอีก ให้ใช้ฟังก์ชันนี้
- `lib/supabase/server.ts` เปลี่ยนเช็ค env จากตอน import → ตอนเรียก `createServiceClient()`
  (เดิมแค่ import ก็ throw ทำให้เทสต์ตรรกะ pure รันไม่ได้)

**พิสูจน์แล้วด้วยการยิง API จริง:** ฝัน "เล่นสเกตบอร์ด" รอบแรกเรียก AI-1 จริง **98 วินาที
(~฿10)** → รอบสองคำตอบเดิมเป๊ะจากแคช **10 วินาที (฿0 ส่วน AI-1)** `hit_count` ขึ้นเป็น 1
เทสต์ 94/94 ผ่าน (เพิ่ม `tests/discovery-cache.test.ts` 6 เทสต์)

### ✅ ลดต้นทุน AI-1 รอบสอง — ทำแล้ว (19 ก.ค. 2569)

**สลับ web search กลับเป็นรุ่นพื้นฐาน** (`lib/ai/claude.ts`) — วัด A/B ด้วยฝันประโยคเดียวกัน
`max_uses=2` เท่ากัน บน Sonnet 5:

| tool variant | input | output | เวลา | ต้นทุน |
|---|---|---|---|---|
| `web_search_20260209` (dynamic filtering) | 61,515 | 6,725 | 117 วิ | ฿11.00 |
| **`web_search_20250305` (พื้นฐาน) ← ใช้ตัวนี้** | **33,904** | 5,706 | **82 วิ** | **฿7.46** |

**สาเหตุที่รุ่นใหม่แพงกว่า:** dynamic filtering รัน `code_execution` **6-9 รอบ**เบื้องหลังเพื่อ
กรองผลค้น → input token เกือบเท่าตัว งานของ AI-1 คือตัดสินธาตุของคำเดียว ไม่ใช่งานวิจัยที่
ต้องกรองผลค้นเยอะ จึงไม่คุ้ม — **ห้ามอัป tool variant กลับโดยไม่วัดใหม่**

`max_uses: 2` **พิสูจน์แล้วว่าบังคับได้จริง** (นับแยกตาม `block.name` เห็น `web_search: 2`)
⚠️ เวลานับจำนวนครั้งค้น อย่านับ `server_tool_use` รวม — บล็อกพวกนั้นรวม `code_execution`
ของ dynamic filtering ด้วย เคยนับผิดเป็น 11 ครั้งมาแล้ว

⚠️ **คุณภาพยัง n=1** — เทสต์เดียวได้ JSON ครบ ธาตุ+meaning_keyword สมเหตุสมผล แต่ยังไม่ได้
เทียบคุณภาพเชิงระบบว่าการไม่มี dynamic filtering ทำให้ตัดสินธาตุแย่ลงไหม ควรสุ่มดูผลใน
`dream_pending_discoveries` ช่วงแรก

### ❌ Prompt caching — วัดแล้วว่าทำไม่ได้ อย่าเสียเวลาลอง

นับ token จริงด้วย `messages.countTokens()`:
- `LALA_SYSTEM` (AI-2) = **566 token** · AI-1 system prompt = **1,691 token**

**ขั้นต่ำที่ Anthropic จะแคชได้คือ 4,096 token** (Opus 4.8/Haiku 4.5) หรือ 2,048 (Sonnet 4.6/Fable 5)
— prompt ทั้งสองตัว**ต่ำกว่าเกณฑ์ทั้งคู่** ใส่ `cache_control` ไปก็จะ**ไม่แคชแบบเงียบๆ ไม่ error**
(`cache_creation_input_tokens: 0`) และถ้าบังเอิญติดก็จ่ายค่าเขียน 1.25× ฟรีๆ
ฝั่ง OpenAI ก็เช่นกัน — auto prompt caching เริ่มที่ 1,024 token, LALA_SYSTEM 566 ไม่ถึง

**ตัวกินต้นทุนจริงไม่ใช่ system prompt** แต่คือผลค้นเว็บที่ไหลเข้า context (30-60k token) ซึ่ง
ต่างกันทุกคำถาม แคชไม่ได้อยู่แล้ว → ทางลดต้นทุนที่เหลือคือแคชผล AI-1 (ทำแล้ว) กับลดผลค้น (ทำแล้ว)

### ✅ Logic 0 Router — พอร์ตครบแล้ว + ต่อ AI จริง (19 ก.ค. 2569)

`lib/engine/router.ts` (pure, 11 golden tests) + `app/api/logic/router/route.ts` (ชั้น AI)
**เอนจินพอร์ตครบทุกตัวแล้ว** — ไม่เหลือ engine ที่ยังเป็น Python อย่างเดียวอีก

3 ชั้นตามสเปกเดิม: Safety Gate → keyword → **AI จริง** (แทน `claude_classify_stub()`)
- ชั้น 1-2 ตอบโดย**ไม่เสียค่า AI เลย** (`via: "engine"`) — ทดสอบแล้วทั้ง safety/keyword
- ชั้น 3 ใช้ Claude Haiku 4.5 · วัดจริง **in 1,073 / out 81 = ฿0.053/ครั้ง** (~฿53/1,000 ครั้ง)
- `validateAiClassification()` กัน AI ตอบเพี้ยน: logic_id ที่ไม่มีจริง/ยังไม่ทำ (5,6,7,13,15)
  หรือ JSON พัง → ตกกลับไป 18 · **AI ห้ามสั่ง safety (-1) เอง** เด็ดขาด
- AI ล่ม/ไม่มี key → degrade เป็น 18 เงียบๆ ตามสเปก ไม่ทำให้ request พัง

**ทดสอบจริงผ่าน route:** safety ชนะแม้ปนคำ Logic อื่น · "เมื่อคืนนอนแล้วเห็นภาพแปลกๆ"→4 ·
"อยากได้ชื่อร้านกาแฟ"→19 · "พรุ่งนี้ควรออกรถกี่โมง"→3 · "สวัสดีครับ"→18 (conf 0.3)

⚠️ **`ROUTER_HINTS` — อย่าลบ** พบตอนทดสอบว่า AI จัด "คนนี้เข้ากับบ้านฉันไหม" เป็น Logic 17
(ความรัก) เพราะชื่อ "ข่ายความสัมพันธ์หลาย entity" ไม่บอกว่า entity รวมบ้าน/รถ/องค์กร
เพิ่มคำอธิบายแยกแยะคู่ที่สับสน (17↔20, 18, 21, 12, 3) แล้วถูกทั้ง 4 เคส
**ห้ามยัด hint ลง `LOGIC_NAMES`** — ตารางนั้นถูกล็อกด้วย golden test ให้ตรงกับ Python

⚠️ **ข้อจำกัดของชั้น keyword ที่รู้ตัวแล้ว (มีเทสต์ล็อกไว้):**
- **ตัวชนะคือ Logic ที่ id น้อยกว่า ไม่ใช่คำที่อยู่ซ้ายกว่าในประโยค** —
  "ฝันว่าได้เบอร์โทรใหม่" → Logic **2** ไม่ใช่ 4 (พฤติกรรมต้นฉบับ ไม่ใช่พอร์ตพลาด)
- **วลี keyword ยาวเกินไป แทรกคำเดียวก็หลุด** — "เข้ากับบ้าน**ฉัน**ไหม" ไม่ match
  "เข้ากับบ้านไหม" → ตกไปชั้น AI (ซึ่งจับถูก) เป็นเหตุผลว่าทำไมต้องมีชั้น AI

**ยังไม่ได้ทำ:** route นี้ "บอกปลายทาง" เท่านั้น **ยังไม่ได้ต่อสายเรียก Logic ปลายทางจริง**
(Logic 1/4/8-11/19/20/21 ยังเป็น endpoint แยกกัน) — การต่อสายเป็นงานของ LINE webhook

### ✅ หน้า `/compatibility` (Logic 20) — ทำแล้ว (19 ก.ค. 2569)

`lib/engine/compatibility.ts` + `app/(liff)/compatibility/` — **หน้า LIFF ครบ 5/5 แล้ว**
โทนสว่างหินอ่อน (`.tone-marble`) ตามกฎ §2 · สีทั้งหมดมาจาก CSS variable ไม่ hardcode

⚠️ **`lib/engine/compatibility.ts` ไม่ใช่ golden parity port** (ต่างจาก engine อื่นทุกตัว)
Logic 20 ไม่เคยมี engine ฝั่ง Python — ต้นฉบับคือ JS ที่ฝังใน HTML จึงเป็นการ "ยกออกมา
เป็นโมดูล" แล้วเขียน unit test คุมพฤติกรรมเอง (11 เทสต์) ไม่ได้เทียบ fixture ภาษาอื่น

🔴 **HTML เดิมมีสำเนาสูตรที่ล้าสมัย — ห้ามลอกกลับมา** `compatibility_dashboard.html` มี
`DAY_ELEMENT` เวอร์ชันบั๊ก B2 (พุธ=ลม, **ไม่มีพฤหัสบดีเลย**) และ `yearEndElement` ที่ยังไม่คิด
ลี่ชุน (B1) ทั้งคู่แก้ไปแล้วใน `lib/engine/element.ts` — หน้าใหม่เรียก `calculateElementSeed()`
ตัวจริงเท่านั้น (ดู §5.1) ธาตุวัตถุก็เรียก `artifactElement()` ของ Logic 2 ที่ผ่าน golden test แล้ว

⚠️ **คะแนนรวม 0-100 เป็นสูตรที่ออกแบบเอง ไม่มีในตำรา** (ค่าเฉลี่ยถ่วงน้ำหนัก shared=1.5×)
มี caveat แสดงบนหน้าจอจริงแล้ว ห้ามนำไปแสดงเป็น "คะแนนดวง" ที่ฟันธง

⚠️ **ธาตุจากเลขไม่มีวันเป็น "ทอง"** — ตาราง digit→element ของ Logic 2 ให้แค่ 4 ธาตุไทย
(ไฟ/ดิน/ลม/น้ำ) เป็นข้อจำกัดของตารางต้นฉบับ ไม่ใช่บั๊ก (มีเทสต์ล็อกไว้)

**ทดสอบใน browser จริงครบทุกทาง:** คำนวณธาตุ (1990-03-15 → ไฟเด่น ขาดน้ำ) · เพิ่ม 5 entity ·
กราฟ SVG เส้น/สี/คะแนน · คลิกดูรายละเอียด · **Productive Clash พลิก −2 → +2 จริง** ·
ลบแล้ว detail หายตามและคะแนนคำนวณใหม่ (82→78) · คะแนนรวมตรงกับสูตรที่คำนวณมือ

🐛 **บันทึกไว้กันเสียเวลา:** `mcp__Claude_Browser__get_page_text` **คืนค่าค้าง (stale)** หลัง
React re-render ทำให้ดูเหมือนปุ่มไม่ทำงานทั้งที่ทำงานปกติ — ตรวจ DOM จริงด้วย
`javascript_tool` แทน · และ `form_input` ตั้งค่า DOM โดยไม่ปลุก onChange ของ React
(state ไม่อัปเดต) ต้องใช้ native setter + `dispatchEvent(new Event('input',{bubbles:true}))`

### ✅ LINE webhook — ทำแล้ว (19 ก.ค. 2569)

`app/api/line/webhook/route.ts` + `lib/line/{client,reply}.ts` (12 เทสต์)

ลำดับ: **ตรวจลายเซ็น → Safety Gate → Router → Logic ปลายทาง**
- ลายเซ็นใช้ `validateSignature` ของ @line/bot-sdk บน **raw body** — parse แล้ว stringify ใหม่
  ลายเซ็นจะไม่ตรงทันที (byte เปลี่ยน) ทดสอบแล้ว: ไม่มีลายเซ็น/ลายเซ็นมั่ว → **401** ทั้งคู่
- **คืน 200 เสมอแม้ประมวลผลพัง** (ยกเว้น 401) — ถ้าคืน 5xx LINE จะ retry เหตุการณ์เดิม
  ผู้ใช้ได้ข้อความซ้ำและเสียค่า AI ซ้ำ
- `chat` → ตอบในแชท · `liff` → ส่งปุ่มเปิด mini-app (ลิงก์ประกอบจาก header ไม่ hardcode โดเมน
  ตั้ง `NEXT_PUBLIC_LIFF_BASE_URL` ทับได้)
- Safety Gate → **ส่งข้อความช่วยเหลืออย่างเดียว ห้ามพ่วงปุ่ม/การตลาด** (มีเทสต์บังคับ)
- Logic ที่ยังไม่ทำ → บอกตรงๆ ว่ายังไม่เปิด **ห้ามแต่งคำทำนายมั่ว** (มีเทสต์บังคับ)
- clamp ข้อความที่ 5,000 ตัวอักษร + จำกัด 5 ข้อความ/reply ตามลิมิต LINE

**ทดสอบด้วย webhook จำลองที่เซ็นลายเซ็นถูกต้อง** (ใช้ `replyToken` ปลอม → **ไม่มีข้อความถึง
ผู้ใช้จริงคนไหน**): safety · keyword→LIFF · logic ที่ยังไม่ทำ · fallback→เมนู · follow ·
sticker · image · unfollow · Logic 4 ฝันเต็มสาย (8.2 วิ)

#### 🔴 แก้เป็น async แล้ว (19 ก.ค. 2569) — เดิมออกแบบผิด จะพังบน production

**LINE บังคับให้ตอบ HTTP 200 ภายใน 2 วินาที** (ถ้าไม่ทันจะขึ้น `request_timeout` แล้ว **retry
เหตุการณ์เดิม** → ผู้ใช้ได้ข้อความซ้ำ + เสียค่า AI ซ้ำ) เวอร์ชันแรกทำงานทุกอย่างแบบ sync
ก่อนตอบ — วัดได้ **8,200 ms** (ฝันจากแคช) และ ~100,000 ms (ปลุก AI-1) **เกินลิมิตทั้งคู่**
ตอนทดสอบไม่เจอเพราะใช้ replyToken ปลอม เลยไม่มีอะไรมาบังคับเรื่องเวลา

**โครงใหม่:** ตรวจลายเซ็น → **คืน 200 ทันที** → ทำงานต่อใน `after()` ของ Next.js

| ทางเดิน | กลไก | ค่าใช้จ่าย |
|---|---|---|
| งานเร็ว (safety / LIFF / เมนู / ยังไม่เปิด) | `replyMessage` | **ฟรี** |
| งานช้า (ทำนายฝัน) | `replyMessage` ตอบรับทันที → `pushMessage` คำตอบจริง | 💰 push กินโควตา LINE OA |

⚠️ **ห้ามเก็บ replyToken ไว้ใช้ตอนงานเสร็จ** — LINE ระบุว่า *"don't rely on the time limit
for implementation, and use reply tokens as soon as possible"* อายุ token เปลี่ยนได้โดยไม่แจ้ง
งานที่นานต้องใช้ push เท่านั้น (`CHAT_IMPLEMENTED` มีเทสต์ล็อกไว้ว่ามีแค่ Logic 4 — ถ้าเพิ่ม
Logic เข้าไปจะรู้ตัวว่ากำลังเพิ่มต้นทุน push)

`export const maxDuration = 300` — งานใน `after()` นับรวมในเวลานี้ (Hobby/Pro = 300s)

**วัดหลังแก้:**

| เคส | ก่อน | หลัง |
|---|---|---|
| ฝัน (จากแคช) | 8,200 ms ❌ | **29 ms** ✅ |
| keyword → LIFF | ~300 ms | 496 ms ✅ |
| safety | ~250 ms | 10 ms ✅ |
| fallback (เรียก AI router) | ~1,600 ms | 7 ms ✅ |

ยืนยันว่างานเบื้องหลังยังทำงานจริง: log แสดงว่าไปถึงขั้น push คำตอบ (fail เพราะ userId ปลอม
ตามคาด) · หลายเหตุการณ์ในก้อนเดียวรับได้ (`accepted: 2`) · ลายเซ็นมั่วยัง 401

🔴 **ยังไม่ได้ทำ — ต้องทำเองบน LINE Console:** ยังไม่ได้ตั้ง Webhook URL จริงในบัญชี LINE OA
(เป็นการตั้งค่าบนบัญชีจริงของผู้ใช้ ผมไม่ทำให้เอง) ต้อง deploy ขึ้น public URL ก่อน แล้วเอา
`https://<โดเมน>/api/line/webhook` ไปใส่ใน LINE Developers Console → Verify

### ✅ dream matching — แก้แล้ว แต่ **ไม่ใช่ด้วย FTS** (19 ก.ค. 2569)

🔴 **แผนเดิม "ย้ายไป Postgres FTS" เป็นทางตัน — ทดสอบกับ Supabase production จริงแล้ว
อย่าไปลองซ้ำ:**
- `to_tsvector('simple','ฝันว่างูเลื้อยเข้ามาในบ้าน')` → `'ฝันว่างูเลื้อยเข้ามาในบ้าน':1`
  **ได้ token เดียวทั้งประโยค** เพราะไทยไม่มีช่องว่างและ config `simple` ไม่ตัดคำไทย
  → query ด้วย `search_vector @@ plainto_tsquery(...)` คืน **0 แถว**
- `pg_trgm` ก็ไม่รอด: `word_similarity()` จัดอันดับ **"ฝันซ้อนฝัน" เป็นที่ 1** สำหรับฝันเรื่องงู
- คอลัมน์ `search_vector` + GIN index ใน migration 011 จึง**ยังไม่ถูกใช้งาน** — ไม่ลบทิ้ง
  เผื่อวันหนึ่งติดตั้ง extension ตัดคำไทยได้

✅ **ทางที่ใช้จริง: `Intl.Segmenter`** — ICU ที่ติดมากับ Node มีพจนานุกรมตัดคำไทยอยู่แล้ว
ไม่ต้องลง dependency: `"ฝันว่างูเลื้อยเข้ามาในบ้าน"` → `ฝัน|ว่า|งู|เลื้อย|เข้า|มา|ใน|บ้าน`

**ยืนยันว่าบั๊กมีจริงและแก้ได้จริง:** ฝัน "งูเลื้อยเข้ามาในบ้าน" เดิมจับ **"กระโดด / ข้าม"** ผิด
(เพราะ "ข้าม" อยู่ใน "เ**ข้าม**า") ตอนนี้ไม่จับแล้ว ส่วน "กระโดดข้ามรั้ว" ของจริงยังจับได้ครบ

⚠️ **จงใจไม่ parity กับ Python** — `dream_interpretation_engine.py` ยังใช้ substring และ Python
ไม่มีตัวตัดคำไทยในตัว การบังคับให้ตรงกัน = **คงบั๊กไว้** จึงทำเป็น:
`interpretDream(text, day, deep, useSegmentation)` — default `false` (golden test เทียบ Python
ได้เหมือนเดิม) และ **production ทุกจุดส่ง `true`** (`/api/dream` + LINE webhook)
ถ้า runtime ไม่มี ICU เต็ม จะ fallback กลับ substring อัตโนมัติ

### 🎯 งานถัดไป
1. Logic ที่ยังไม่ทำ: 5, 6 (Vision API) · 12, 16 (มีตารางแต่ไม่มีหน้า) · 13, 15, 17
3. หนี้ความถูกต้อง: **ลัคนายังไม่เคยตรวจกับดวงจริง** · normalization พ.ศ./ค.ศ. · `users.thai_element` ของ D

### 📁 ไฟล์สำคัญที่เพิ่มในเซสชันนี้
```
lib/ai/{index,types,claude,openai,gemini}.ts   ชั้น AI + fallback chain
lib/engine/card-id.ts                          สูตรเลขการ์ด A (§4.1) + golden test
lib/provinces.ts                               พิกัดจังหวัด (คำนวณลัคนา)
app/(liff)/{profile,fortune,dream,oracle}/     หน้า LIFF 4 หน้า
app/api/{dream,oracle}/route.ts                API ที่ต่อ AI
scripts/db-migrate.mjs                         รัน migration/seed (ทีละไฟล์ + transaction)
scripts/gen-users-dq-report.mjs                data-quality report
tests/ (87 tests)                              golden tests ทุก engine
```

---

## 11. 🧭 ฮวงจุ้ย (Logic 7) — ผลสำรวจก่อนลงมือ (19 ก.ค. 2569)

### 🔴 §3 ของเอกสารนี้เขียนผิด — Logic 7 **ไม่ต้องใช้ Vision API**

ตาราง §3 จัด "5,6,7 = ใบหน้า/รูปทิพย์/ฮวงจุ้ย → ต้องใช้ Vision API" ไว้ก้อนเดียวกัน แต่สเปกจริง
ใน `docs/source-materials/KRUTH_ELEMENT_Platform_E_Handoff_v1.md` §Logic 7 เป็น **ฟอร์มกรอกข้อมูล**
ล้วนๆ ไม่มีการอ่านภาพเลย: `space = {direction, room_shape, main_color, purpose}`
→ **ทำได้เลยด้วยเครื่องมือที่มีอยู่แล้ว ไม่ต้องรอ Vision API**

### ✅ ข้อมูลที่ "มีครบแล้ว" ในเอกสาร (ตรวจแล้ว ไม่ต้องหาเพิ่ม)

| ตาราง | บรรทัดใน Handoff | ครบไหม |
|---|---|---|
| `DIRECTION_TO_ELEMENT` | §4.3 (บรรทัด ~372) | ✅ 9 ทิศ (8 ทิศ + กลาง) |
| `COLOR_TO_ELEMENT` | บรรทัด 315 | ✅ ~28 สี |
| `SHAPE_TO_ELEMENT` | บรรทัด 346 | ✅ |
| อัลกอริทึม `analyze_feng_shui()` | บรรทัด 681 | ✅ เขียนเป็น pseudocode ครบ |

เครื่องมือฝั่งเราพร้อมหมดแล้ว: `wuXingScore()` (golden test ผ่าน) · Productive Clash ·
`calculateElementSeed()` · หน้า `/compatibility` เป็นแม่แบบ UI ที่ใช้ตรรกะเดียวกันเป๊ะ

### ⚠️ จุดที่ต้องให้ผู้ใช้ตัดสินก่อนเขียนโค้ด (เป็นการตัดสินใจระดับ §4)

**เอกสารยุบธาตุ "ทอง" ทิ้ง** — `DIRECTION_TO_ELEMENT` แปลง ทอง→ดิน ตามระบบ 4 ธาตุไทย
ผลคือ **4 ใน 9 ทิศกลายเป็น "ดิน" เหมือนกันหมด** (ตะวันตก, ตะวันตกเฉียงเหนือ,
ตะวันออกเฉียงเหนือ, ตะวันตกเฉียงใต้) ทั้งที่ตำราฮวงจุ้ยจีนแยก ตะวันตก/ตะวันตกเฉียงเหนือ = ทอง
ชัดเจน — และ `wuXingScore()` ของเรา**รองรับ 5 ธาตุรวมทองอยู่แล้ว**
→ ต้องเลือก: ตามเอกสาร (4 ธาตุ, ทิศซ้ำกันเยอะ) หรือคงทองไว้ (ตรงตำราจีนกว่า แต่ต่างจากสเปก)

### ❌ Flying Stars (ดาวเหิน 9 ยุค) — ยังคงเป็นงานวิจัยแยก ไม่ใช่ส่วนหนึ่งของ Logic 7

ตาม §3.6 เดิม: ต้องมีตารางดาว 9 ยุค + กฎผูกผังเรือน + กฎตีความ 81 คู่ **เป็นคนละขนาดกับ
ตารางทิศข้างบน** อย่าเอามารวมกันเป็นงานเดียว

### ⚠️ เลข Logic ขัดกันระหว่างเอกสาร (พบตอนสำรวจ)

`Handoff_v1` ให้ Logic 5=Compatibility, 6=Color, 13=Name แต่ `v1.1` (ที่ยึดเป็นหลัก) ให้
5,6=ใบหน้า/รูปทิพย์, 19=ตั้งชื่อ, 13=ลงทุน — **ยึด v1.1 ตามกฎเดิม** แต่เวลาอ่าน Handoff
ต้องระวังว่าเลขไม่ตรงกัน (เนื้อหาสูตรใน Handoff ยังใช้ได้ แค่เลขกำกับใช้ไม่ได้)

### ✅ Logic 7 ฮวงจุ้ย — ทำเสร็จแล้ว (19 ก.ค. 2569)

`lib/engine/fengshui.ts` (14 เทสต์) + `app/(liff)/fengshui/` + ต่อเข้า Router/LINE แล้ว
**หน้า LIFF ครบ 6 หน้า** · ผู้ใช้พิมพ์ "ฮวงจุ้ยห้องนอน" / "อยากจัดห้องใหม่" /
"โต๊ะทำงานหันไปทางไหนดี" ใน LINE → เข้า Logic 7 ได้จริง (ทดสอบผ่าน webhook จำลองแล้ว)

**🔴 การตัดสินใจสำคัญ (ผู้ใช้เลือกเอง): คงธาตุ "ทอง" ไว้ ไม่ยุบเป็น "ดิน" ตามเอกสาร**
พิสูจน์แล้วว่าเรื่องนี้ไม่ใช่รายละเอียดปลีกย่อย — สำหรับผู้ใช้ธาตุไฟ:

| ทิศ | คงทอง (ที่ใช้จริง) | ยุบเป็นดิน (ตามเอกสาร) |
|---|---|---|
| ตะวันตก | **−2 ⚠️ ควรระวัง** | +2 ✅ ทิศมงคล |
| ตะวันตกเฉียงเหนือ | **−2 ⚠️ ควรระวัง** | +2 ✅ ทิศมงคล |

**กลับด้านกันคนละขั้ว** — ถ้ายุบทองตามเอกสาร ระบบจะบอกผู้ใช้ว่าทิศที่ควรเลี่ยงที่สุด
คือทิศมงคล มีเทสต์ล็อกไว้ไม่ให้ย้อนกลับโดยไม่ตั้งใจ

**ทดสอบใน browser จริง** (เกิด 1990-03-15 → ไฟเด่น ขาดน้ำ · ทิศตะวันตก · โต๊ะทำงาน):
ทิศ−2 พร้อมเหตุผล "ไฟพิฆาตทอง" · คำแนะนำแก้ด้วยธาตุดิน (สีเหลือง/น้ำตาล) ถูกตามวงจรกำเนิด ·
ทิศมงคล 4 ทิศ (รวม "เหนือ" ที่เป็น Productive Clash เพราะขาดน้ำ) · ทิศระวัง 2 ทิศ

**ยังไม่ครอบคลุม:** Flying Stars (ดาวเหิน 9 ยุค) — ยังเป็นงานวิจัยแยกตาม §3.6 มี caveat
แสดงบนหน้าจอจริงแล้วว่าผลนี้ยังไม่รวมดาวเหิน


---

## 12. 📊 ชั้นบันทึกต้นทุน + แผนแดชบอร์ด/แอฟฟิลิเอต (19 ก.ค. 2569)

### ✅ ชั้นบันทึกต้นทุน — ทำแล้ว (ฐานของทุกอย่างที่เหลือ)

`migration 019` + `lib/ai/pricing.ts` + `lib/usage/log.ts` (8 เทสต์) — **ทำงานอัตโนมัติทุกจุด**
เพราะฝังไว้ใน `generate()` ของ `lib/ai/index.ts` ซึ่งเป็นทางผ่านเดียวของ AI ทั้งระบบ

- provider ทั้ง 3 ตัวคืน `usage` แล้ว (เดิมคืนแค่ string) → เก็บ token/ค้นเว็บจริง
- บันทึกทั้งตอนสำเร็จและตอนล้มเหลว (จะได้รู้ว่า provider ไหนล่มบ่อย)
- `logCacheHit()` บันทึกตอน**ไม่ได้**เรียก AI ด้วย — เพราะ **cache hit rate คือตัวเลขที่
  กำหนดกำไรทั้งระบบ** ถ้าบันทึกแค่ตอนจ่ายเงินจะคำนวณอัตราไม่ได้เลย
- ⚠️ โมเดลที่ไม่มีในตารางราคา → ต้นทุน 0 **พร้อม log เตือน** ไม่ปล่อยให้หายเงียบ
- ⚠️ ต้นทุนถูก**เก็บค่าตายตัว**ตอนบันทึก ไม่คำนวณย้อนหลัง เพราะราคา/เรตเปลี่ยนได้
  (`USD_THB_RATE` ทับผ่าน env ได้ ค่าเริ่มต้น 36)
- 🔒 RLS ล็อกแล้ว **ทดสอบด้วย anon key จริง**: อ่าน 0 แถว · เขียนถูกปฏิเสธ

**ยืนยันด้วยการยิงจริง** — 3 คำขอ ได้ 3 แถวครบ: ai2/gpt-5.5 (in 499/out 443 = ฿0.57,
cache=true) · ai2 อีกครั้ง (฿0.58) · router/haiku (in 1,172/out 68 = ฿0.054)

### 🔴 ตัวเลขที่ต้องตัดสินใจก่อนเปิดขาย

| ทาง | ต้นทุนจริง | ขาย 1 เครดิต ฿3-5 |
|---|---|---|
| ฝัน — เจอในฐาน/แคช | ฿0.57-0.69 | ✅ กำไร |
| **ฝัน — ปลุก AI-1** | **฿7.46** | 🔴 **ขาดทุน ฿2.5-4.5** |

มีเทสต์ล็อกข้อเท็จจริงนี้ไว้ใน `tests/pricing.test.ts` แล้ว — **กำไรทั้งธุรกิจขึ้นกับ
cache hit rate** ซึ่งตอนนี้เพิ่งเริ่มวัดได้

### 🔴 ช่องว่างใหญ่: เว็บไม่มีระบบผู้ใช้เลย

ทั้ง 6 หน้าเป็นฟอร์มนิรนาม **ไม่มี login ไม่มี session ไม่เคยสร้าง record ผู้ใช้**
(`users`/`subscriptions`/`usage_logs`/`user_events_e` = 0 แถวทั้งหมด)
→ ผูกรายได้กับคนไม่ได้ = **แอฟฟิลิเอตและการขายเครดิตสร้างไม่ได้** จนกว่าจะมีระบบสมาชิก

### ตัดสินใจแล้ว (ผู้ใช้เลือก 19 ก.ค. 2569)

- **สมัครสมาชิก: ทั้ง LINE Login และอีเมล magic link** (LINE Login ได้ userId มาด้วย →
  เชื่อมบัญชีเว็บ↔LINE OA อัตโนมัติ · ต้องเปิด LINE Login channel เพิ่ม ตอนนี้มีแค่ Messaging API)
- **แดชบอร์ด: แอดมินอย่างเดียวก่อน** (หน้าของแอฟฟิลิเอตไว้ทีหลัง)
- **แอฟฟิลิเอตเน้นทางเว็บ** — ทำให้ข้อจำกัดของ LINE ไม่เป็นปัญหา

⚠️ **ข้อจำกัดของ LINE ที่ต้องรู้ถ้าวันหนึ่งจะทำแอฟฟิลิเอตฝั่ง LINE ด้วย:** LINE ระบุว่า
*"you can't use the Messaging API to confirm how the user added the LINE Official Account
as a friend"* — แจกลิงก์เพิ่มเพื่อนคนละลิงก์แล้วดูที่มา **ทำไม่ได้** ต้องให้ลิงก์ผ่านเว็บ
แล้วใช้ LINE Login (state) ผูกแทน

### ลำดับงานที่เหลือ

⏸️ **ระบบสมาชิกถูกเลื่อนไปหลัง deploy (ผู้ใช้ตัดสิน 19 ก.ค. 2569)** — เพราะ Callback URL
ของ LINE Login ต้องผูกกับโดเมนจริง ทำก่อนแล้วต้องมาแก้ใหม่ **อย่าเพิ่งเริ่มข้อ 1 จนกว่า
จะมีโดเมน** · ยังไม่ได้เปิด LINE Login channel (ตอนนี้มีแค่ Messaging API)
ตัวแปรที่จะใช้เมื่อถึงเวลา: `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET`
Callback: `https://<โดเมน>/api/auth/line/callback`

### ✅ ตรวจความพร้อม deploy แล้ว (19 ก.ค. 2569)

- `.gitignore` กัน `.env.local` + `data/sensitive/` ถูกต้อง
- **สแกนแล้วไม่มี API key หลุดในไฟล์ที่จะถูก commit** (ตรวจ `sk-proj-`/`sk-ant-`/`AIza`/JWT)
- `.env.example` มีอยู่แล้วและไม่มีค่าจริงปน
- ไฟล์ใหญ่สุด 6 MB (`ตำราจตุพลวัตร_V_10.docx`) — ไม่ชน GitHub limit 100 MB/ไฟล์
- ⚠️ **ยังไม่ได้ `git init`** — ต้องทำก่อนต่อ Vercel

1. ระบบสมาชิก (LINE Login + magic link) + ผูก `users`
2. แดชบอร์ดแอดมิน: cache hit rate · ต้นทุนเฉลี่ย/คำทำนาย · ผู้ใช้ที่แพงที่สุด
3. ตัดสินราคาใหม่จากข้อมูลจริง
4. ระบบเครดิต/ชำระเงิน (`subscriptions` มี `omise_customer_id` อยู่แล้ว)
5. แอฟฟิลิเอต — **จ่ายตามรายได้จริง ไม่ใช่จำนวนคนสมัคร** (Profile/Fortune ฟรีไม่จำกัด
   ถ้าจ่ายต่อหัวจะมีแรงจูงใจปั๊มบัญชีปลอม) + กัน self-referral


---

## 13. 💬 AI Chat ประจำฟังก์ชัน + โควตา (19 ก.ค. 2569)

`lib/chat/quota.ts` (11 เทสต์) + `app/api/chat/route.ts` + `app/(liff)/_components/FunctionChat.tsx`

**ช่วงทดลอง: ถามได้ฟังก์ชันละ 2 คำถาม** (`FREE_QUESTIONS_PER_LOGIC`) อนาคตเติมเครดิตเพื่อถามเพิ่ม

| Logic | หน้า | รูปแบบ |
|---|---|---|
| 1, 7, 8, 20, 21 | profile · fengshui · fortune · compatibility · oracle | กล่อง `FunctionChat` ใต้ผลลัพธ์ |
| **4** | dream | **ไม่ใส่กล่องซ้อน** — หน้านี้เป็นแชทอยู่แล้ว ใส่โควตาให้แชทเดิมใน `/api/dream` แทน |

### ลำดับใน `/api/chat` (ห้ามสลับ)
1. **Safety Gate** — รับ free-text จึงตรวจก่อน AI · **และก่อนหักโควตา**
   (คนส่งสัญญาณวิกฤตต้องไม่ถูกคิดโควตา — ทดสอบยืนยันแล้วว่าเหลือเท่าเดิม)
2. โควตา → 429 พร้อมข้อความบอกตรงๆ
3. AI (`role: ai2`) — ตอบจาก context ที่หน้าจอส่งมาเท่านั้น **ห้ามแต่งข้อเท็จจริงใหม่**

**หักโควตาหลัง AI ตอบสำเร็จเท่านั้น** — AI ล่มแล้วยังเสียสิทธิ์ถือว่าไม่ยุติธรรมกับผู้ใช้

### 🔴 ข้อจำกัดที่ต้องรู้ — โควตานี้ยังไม่ใช่ของจริง

นับจาก **cookie ต่อเบราว์เซอร์** (`kruth_chat_quota`, httpOnly, 30 วัน) เพราะ**ยังไม่มีระบบสมาชิก**
→ **ล้าง cookie แล้วได้โควตาใหม่ทันที** พอสำหรับตัวทดลอง แต่กันคนตั้งใจเลี่ยงไม่ได้
เมื่อทำระบบสมาชิกแล้ว **ต้องย้ายไปนับที่ `users` + `ai_usage_log` ฝั่ง DB** ถึงจะขายเครดิตได้จริง

**กันปลอมแปลงได้แล้วเท่าที่ทำได้** (ทดสอบยิงจริง): ค่าติดลบ/ค่าที่ไม่ใช่ตัวเลข/JSON พัง →
ปัดเป็น 0 ไม่ใช่เชื่อตาม · ทศนิยมปัดลง · `httpOnly` กัน JS ในหน้าแก้ตรงๆ

### 💰 ต้นทุนจริงที่วัดได้

เฉลี่ย **฿0.31/คำถาม** (gpt-5.5, in ~360 / out ~200)
→ โควตาเต็ม 2 คำถาม × 6 ฟังก์ชัน ≈ **฿3.72 ต่อผู้ใช้ 1 คน** (ยังไม่รวมฝันที่ปลุก AI-1 ฿7.46)
บันทึกอัตโนมัติลง `ai_usage_log` ทุกครั้ง (ดู §12)


---

## 14. 🎴 เสี่ยงทายวงแหวนคู่ (Logic 21) — พอร์ตตาม oracle_dual_ring.html (19 ก.ค. 2569)

`lib/engine/oracle.ts` (22 เทสต์) + `app/(liff)/oracle/DualRing.tsx` + `app/api/oracle/route.ts`

**กลไก:** วง 2 วง วงละ 10 ช่อง (เลข 0-9 สลับด้วย Fisher-Yates) · ปัดหมุน · เข็มที่ 12 นาฬิกา
ชี้ช่องไหน = ได้เลขนั้น · สองวงรวมเป็นเลขการ์ด 00-99 · **หมุน 2 รอบ**
(รอบ 1 = การ์ด "ตัวคุณ" · รอบ 2 = การ์ด "เรื่องที่ถาม") → ตีความรวม

🔴 **เปลี่ยนจากเดิม: การสุ่มย้ายจาก server มาที่มือผู้ใช้**
เดิม `/api/oracle` สุ่มด้วย `Math.random()` เอง ตอนนี้ผู้ใช้หมุนเองแล้วส่งเลขการ์ดมา
— เป็นแก่นของพิธีกรรมเสี่ยงทาย ผู้ถามต้องเป็นคนหมุน

### 🐛 บั๊กที่เจอและแก้ระหว่างทำ (สำคัญ — อย่าเขียนแบบเดิมอีก)

**`requestAnimationFrame` หยุดทำงานเมื่อแท็บถูกซ่อน** (เบราว์เซอร์พักเฟรมประหยัดแบต)
ถ้าพึ่ง rAF อย่างเดียว ผู้ใช้ที่สลับแท็บ/ล็อกหน้าจอกลางคัน **จะเจอวงค้างที่ "กำลังหมุน"
ตลอดไป ไม่ได้ผลลัพธ์** → ใส่ `setTimeout` สำรองเป็นตัวรับประกันว่าผลออกเสมอ
rAF มีไว้ให้ภาพลื่นเท่านั้น (พบตอนทดสอบเพราะ browser tool รัน `document.hidden = true`)

**timer ต้องแยกต่อวง** — เดิมใช้ ref ตัวเดียวร่วมกัน ทำให้เคลียร์ของอีกวงไม่ได้

### สูตรคะแนนรวม 5 องค์ประกอบ (น้ำหนักรวม 1.00)

| องค์ประกอบ | น้ำหนัก |
|---|---|
| พลังงานส่วนบุคคล (ขาดกี่ธาตุ) | 0.10 |
| พลังกาลเวลา (ธาตุประจำวัน) | 0.10 |
| พลังอื่นๆ (เลเยอร์ที่ผูก) | 0.10 |
| การ์ดใบที่ 1 (ตัวคุณ) | 0.30 |
| **การ์ดใบที่ 2 (เรื่องที่ถาม)** | **0.40** |

`aggregate = ((Σ score×weight) + 2) / 4 × 100` clamp 0-100
⚠️ **สูตรออกแบบเองใน HTML ต้นฉบับ ไม่มีในตำรา** — มี caveat บนหน้าจอแล้ว

### ⚠️ สิ่งที่จงใจไม่ลอกจาก HTML
- `DAY_ELEMENT` ใน HTML เป็นเวอร์ชันบั๊ก B2 (พุธ=Wood, **ไม่มีพฤหัสบดี**) → ใช้ของจริงจาก
  `lib/engine/element.ts` (มีเทสต์ล็อกว่าวันพฤหัสฯ ต้องไม่ถูกข้าม)
- `artifactElement5()` ใน HTML = `artifactElement()` ของ Logic 2 เป๊ะ → เรียกตัวจริงที่ผ่าน golden test

### 🔴 ข้อสังเกตที่ยังไม่แก้ — Productive Clash ไม่ทำงานในหน้าเสี่ยงทาย

ทุกองค์ประกอบเรียก `wuXingScore(อีกฝ่าย, dominant, missing)` → object คือ `dominant`
ซึ่ง**ไม่มีวันอยู่ใน missing** (ธาตุเด่น = คะแนนสูงสุด, missing = คะแนนศูนย์)
→ เงื่อนไข clash ไม่มีทางเป็นจริง **พอร์ตตามต้นฉบับไว้ก่อนตามที่ผู้ใช้สั่ง มีเทสต์ล็อกไว้**
ถ้าจะแก้ต้องสลับเป็น `wuXingScore(dominant, อีกฝ่าย, missing)` ซึ่งเปลี่ยนคะแนนทั้งระบบ
— เป็นการตัดสินใจระดับ §4 ต้องถามก่อน

### ✅ วงแหวนเป็น "ไพ่คว่ำ" + เปิดไพ่แบบทาโรต์ (ผู้ใช้สั่ง 19 ก.ค. 2569)

เดิมช่องในวงเป็นวงกลมมีดาว ✦ → เปลี่ยนเป็น **หลังไพ่จริง** ให้รู้สึกเหมือนกำลังเลือกไพ่

- ภาพต้นฉบับ `docs/design-assets/lala-lucky-chat-cardback.png` (1414×2000, 1.8 MB)
  **ย่อ 2 ขนาดด้วย `sips` ก่อนใช้** — ต้นฉบับหนักเกินไปเมื่อคูณ 20 ช่อง:
  | ไฟล์ | ขนาด | ใช้ที่ไหน |
  |---|---|---|
  | `public/cardback-sm.png` | 32 KB | ไพ่ 20 ใบในวงแหวน |
  | `public/cardback.png` | 408 KB | หลังไพ่ใน overlay ตอนเปิด |
- ไพ่ในวง 40×56 px (สัดส่วน 0.707 ตรงกับไพ่จริง) · หมุนสวน `-rotation` ให้ไพ่ตั้งตรงเสมอ
- ขยายวงจาก 210 → 240 px และวางไพ่ที่รัศมี 82 (เผื่อครึ่งทแยง 34 → 116 < 120 ไม่ล้นขอบ)
- ไพ่ที่เข็มชี้จะพลิกเปิดเผยตัวเลขบนพื้นทอง
- **overlay ใช้หลังไพ่ใบเดียวกัน** → ผู้ใช้รู้สึกว่า "ไพ่ที่เลือกไว้กำลังถูกเปิด" ไม่ใช่ไพ่คนละใบ

**ทดสอบจริง:** ไพ่ในวง 20 ใบโหลดครบ · overlay ใช้ `cardback.png` 220×311 ·
สถานะพลิก `matrix3d(-1,0,0,…)` = หมุน 180° จริง · หน้าไพ่โหลดจาก Supabase Storage สำเร็จ

### ✅ จังหวะเปิดการ์ด (CardReveal.tsx) — พอร์ตแล้ว

พอร์ตจาก `playZoomRevealSequence()` — overlay จางเข้า + การ์ดซูมจากเล็กเป็นใหญ่
→ รอ 900ms → พลิกจากด้านหลังเป็นด้านหน้า → ผู้ใช้แตะปิดเองแล้วจึงไปขั้นถัดไป
(ไม่ปิดอัตโนมัติ เพราะเป็นช่วงที่ตั้งใจให้หยุดดู) · รองรับ `prefers-reduced-motion`

⚠️ **CardReveal ดึงข้อมูลการ์ดเอง** ไม่รอจากหน้าแม่ — เพราะ `/api/oracle` ถูกเรียก
ตอนจบเท่านั้น ถ้ารอจะขึ้น "ไม่พบข้อมูลการ์ด" ตอนเปิดรอบ 1-2
(`master_energy_cards` เปิดอ่านสาธารณะอยู่แล้วตาม migration 017)

### ✅ คำใบ้ "ปัดเพื่อหมุน" — ทำแล้ว (แทน swipe-finger/dir-arrows)

นิ้ว 👆 เคลื่อนเป็นวงโค้ง + เส้นโค้งวิ่งรอบวง + ป้าย "ปัดเพื่อหมุน"
**แสดงเฉพาะก่อนผู้ใช้แตะครั้งแรก** หายทันทีที่แตะและไม่กลับมาอีก (ถ้าค้างจะบังตัวเลข)
· `pointer-events: none` ไม่บังการปัด · รองรับ `prefers-reduced-motion`
· ทดสอบจริง: ก่อนแตะ=แสดง · ระหว่างแตะ=หาย · หลังปล่อย=หาย · ปัดแล้ววงลงเลขได้จริง

**ยังไม่ได้พอร์ตจาก HTML:** crystal-ball · starfield · pray-prompt
(เป็นบรรยากาศประกอบ ไม่กระทบการทำงาน)

**ทดสอบใน browser จริง:** ใบที่ 1 = 12 (ศิลปินผู้เปราะบาง) · ใบที่ 2 = 71 (ผู้นำนักวิจัย) ·
คะแนน 57.5/100 **ตรวจมือแล้วตรงกับสูตร** · AI ตีความเชื่อมโยงการ์ด 2 ใบได้จริง ·
เปิดการ์ด 20 (ผู้ประสานงาน) เห็นรูปจาก Storage + ชื่อ/แก่นจาก DB · ปิดแล้วเข้ารอบ 2 ถูกต้อง


---

## 15. 🚀 จุดต่อสำหรับเซสชันถัดไป (เขียน 19 ก.ค. 2569 — อ่านหัวข้อนี้ก่อนเริ่มงาน)

### คำสั่งเปิดงาน (คัดลอกไปวางในเซสชันใหม่ได้เลย)

```
อ่าน CLAUDE.md §15 แล้วรัน health check (tsc + test + build) · รายงานสถานะ · แล้วทำงานถัดไปตามคิว
```

### สภาพแวดล้อม (ต้องทำก่อนรันคำสั่งใดๆ)
```bash
export PATH="$HOME/.local/node/bin:$PATH"   # Node v24 ไม่อยู่ใน PATH ถาวร
cd /Users/freeman/Desktop/kruth-element
npx tsc --noEmit && npm test && npm run build   # ควรได้ 237/237
```

### สถานะล่าสุด (อัปเดต 24 ก.ค. 2569)

| ส่วน | สถานะ |
|---|---|
| Engine ทุกตัว (รวม router, ascendant, oracle, compatibility) | ✅ **237 tests** (เดิม 209 + 28 ของ chat-plan) |
| หน้า LIFF 6 หน้า | ✅ profile · fortune · dream · oracle · compatibility · fengshui |
| API | ✅ dream · oracle · chat · logic/router · line/webhook |
| **AI Chat แบบยืดหยุ่น เฟส 1** | ✅ `lib/chat/plan.ts` — ชั้น validate เสร็จ **ยังไม่ต่อ AI** (§16) |
| Supabase | ✅ migration 000-019 รันจริงแล้ว |
| GitHub | ✅ `inowokth-a11y/LaLa-Luck-Chat` |
| Vercel | ✅ deploy สำเร็จ (Hobby) — ⚠️ ยังไม่มีโดเมนจริง |

### ก่อน commit ทุกครั้ง

```bash
git status                    # ตรวจว่าไม่มี .env.local / data/sensitive/ หลุด
```
ตรวจก่อน push เสมอ: `git ls-files | grep -E "sensitive|env.local"` ต้องว่าง

---

### คิวงานถัดไป (เรียงตามที่ตกลงกับผู้ใช้)

**1. ระบบสมาชิก — รอผู้ใช้เอา OAuth key มา**

ผู้ใช้เลือก: **Google + Facebook + LINE Login** (Instagram ทำไม่ได้ — Basic Display API
ปิดถาวร 4 ธ.ค. 2024 และ Meta ไม่อนุมัติแอปที่ใช้ IG ทำ authentication)

🔴 **คีย์ไปอยู่ที่ Supabase Dashboard ไม่ใช่ `.env.local`** (เคยบอกผู้ใช้ผิด แก้แล้ว)
Callback URL ที่ใช้ทุกเจ้า: `https://umffopbnkqyvzbbjyrum.supabase.co/auth/v1/callback`

#### สถานะการตั้งค่า OAuth (อัปเดต 23 ก.ค. 2569 — ผู้ใช้ทำเองบน dashboard แล้ว)

| เจ้า | สถานะ | หมายเหตุ |
|---|---|---|
| **Facebook** | ✅ ตั้ง Redirect URI + เปิด OAuth เว็บ/ไคลเอ็นต์ + บังคับ HTTPS แล้ว | ⚠️ **แอปยังไม่เผยแพร่** → ล็อกอินได้เฉพาะ Admin/Developer/Tester · ต้องผ่าน App Review ขอ `email`+`public_profile` ก่อนเปิดสาธารณะ (หลายวัน) |
| **LINE** | ✅ สร้าง Custom Auth Provider แล้ว | Channel ID `2008551146` |
| **Google** | ❓ ยังไม่ยืนยันว่าทำแล้วหรือยัง | ทำเร็วสุด ~10 นาที ไม่ต้องรอ review |

✅ **ยืนยันแล้วว่า Supabase มี Custom Auth Provider ให้ใช้จริง** (เดิมธงไว้ว่าไม่แน่ใจเรื่องแผนฟรี)

**ค่าที่ใช้ตั้ง LINE (ยืนยันจาก `access.line.me/.well-known/openid-configuration` จริง):**
```
Provider Identifier : line          → เรียกใน SDK เป็น provider: 'custom:line'
Issuer URL          : https://access.line.me
Discovery URL       : (เว้นว่าง — LINE ใช้ path มาตรฐาน)
Scopes              : openid, profile, email
```
🔴 **กับดักที่เจอจริง:** ตอนแรกผู้ใช้ใส่ Issuer เป็น `https://lin.ee/UBzB0WO` ซึ่งเป็น
**ลิงก์ย่อเพิ่มเพื่อน LINE OA** ไม่ใช่ OAuth server → discovery จะล้มเหลว

⚠️ **LINE ไม่ให้อีเมลอัตโนมัติ** — ต้องขอสิทธิ์แยกที่ LINE Console
(Basic settings → OpenID Connect → Email address permission → Apply + อัปโหลด privacy policy)
ถ้ายังไม่ได้สิทธิ์ ใส่ scope `email` ไปก็ได้ค่าว่าง **ไม่ error** → **ต้องออกแบบเผื่อผู้ใช้ที่ไม่มีอีเมล**

**ที่เหลือต้องทำ:**
- เอา App ID/Secret ของ Facebook ไปใส่ Supabase → Authentication → Providers
- Google → console.cloud.google.com → Credentials → OAuth client ID (Web)

**สิ่งที่ทำได้เลยโดยไม่ต้องรอคีย์:** migration `user_identities` (เชื่อม `auth.uid` UUID ↔
`users.id` ที่เป็น TEXT `DEM-XXXX` ของ Platform D — **ห้ามแก้ตาราง `users` ตรงๆ**) + หน้า login เปล่า

**2. ย้ายโควตาแชทไป DB** — ตอนนี้นับจาก cookie (`kruth_chat_quota`) ล้างแล้วได้ใหม่
ต้องย้ายไป `users` + `ai_usage_log` ถึงจะขายเครดิตได้จริง (ทำหลังมีระบบสมาชิก)

**3. แดชบอร์ดแอดมิน** — ข้อมูลพร้อมแล้วใน `ai_usage_log` (ดู §12)
ตัวเลขที่ต้องดู: cache hit rate · ต้นทุนเฉลี่ย/คำทำนาย · ผู้ใช้ที่แพงที่สุด

**4. dream matching → Intl.Segmenter/FTS** — ยังใช้ substring อยู่ (over-match คำสั้น)

**5. AI Chat แบบยืดหยุ่น + กราฟเปรียบเทียบ** — ✅ **เฟส 1 (ชั้น validate) เสร็จแล้ว** ดู §16
เหลือเฟส 2: ต่อ AI จริง + กราฟ + UI ⏸️ ทำหลังมีระบบสมาชิก + แดชบอร์ดต้นทุน
(ควรเป็นฟีเจอร์พรีเมียม 2-3 เครดิต)

**6. Logic ที่ยังไม่ทำ:** 5, 6 (Vision API) · 12, 16 (มีตารางแต่ไม่มีหน้า) · 13, 15, 17

---

### 🔴 การตัดสินใจที่ค้างอยู่ — ต้องถามผู้ใช้ก่อนแตะ

**ก) Productive Clash ไม่ทำงานในหน้าเสี่ยงทาย** (§14)
ต้นฉบับเรียก `wuXingScore(อีกฝ่าย, dominant, missing)` → object คือ `dominant` ซึ่งไม่มีวัน
อยู่ใน `missing` → เงื่อนไข clash เป็นจริงไม่ได้เลย **พอร์ตตามต้นฉบับไว้ มีเทสต์ล็อก**
ถ้าแก้ต้องสลับอาร์กิวเมนต์ ซึ่งเปลี่ยนคะแนนทั้งระบบ

**ข) ลัคนายังไม่เคยตรวจกับดวงจริง** (§5.2)
สูตรถูกต้องทางดาราศาสตร์แล้ว (พิสูจน์ 3 ชั้น) แต่**ยังไม่มีดวงจริงที่โหรผูกไว้มาเทียบ**
ควรขอจากผู้ใช้ 2-3 ดวงเพื่อยืนยันว่าตรงกับที่โหราจารย์ไทยคำนวณ

**ค) normalization พ.ศ./ค.ศ.** — ข้อมูล D มี `dob` เป็น พ.ศ. ปน 9 แถว
หน้าเว็บกันไว้แล้ว (`year > 2400` → error) แต่ยังไม่มี layer กลางถ้าดึงข้อมูลผ่าน Bridge API

**ง) `users.thai_element` ของ Platform D** — ไม่ตรงกับ `DAY_ELEMENT` 60/79 แถว
**ต้องถามทีม D ว่านิยามคืออะไรก่อนใช้ฟิลด์นี้**

---

### 💰 ตัวเลขต้นทุนที่วัดจริงแล้ว (ใช้ตัดสินราคา)

| Flow | ต้นทุน/ครั้ง |
|---|---|
| Profile · Fortune · Compatibility · Fengshui | **฿0** (ไม่ใช้ AI) |
| แชทถามต่อ 1 คำถาม | ฿0.31 |
| Oracle (เสี่ยงทาย) | ~฿0.76 |
| Dream — เจอในฐาน/แคช | ฿0.57-0.69 |
| **Dream — ปลุก AI-1** 🔴 | **฿7.46** (ขาดทุนถ้าขาย 1 เครดิต ฿3-5) |

**กำไรทั้งธุรกิจขึ้นกับ cache hit rate** — เริ่มวัดได้แล้วใน `ai_usage_log`

---

### 🐛 บทเรียนเครื่องมือ (กันเสียเวลาซ้ำ)

- `mcp__Claude_Browser__get_page_text` **คืนค่าค้าง** หลัง React re-render → ใช้ `javascript_tool` อ่าน DOM แทน
- **screenshot ตามหลังสถานะจริง 1 จังหวะ** → ยืนยันด้วย DOM ควบคู่เสมอ
- `form_input` ไม่ปลุก onChange ของ React → ใช้ native setter + `dispatchEvent(new Event('input',{bubbles:true}))`
- browser tool รันด้วย `document.hidden = true` → **`requestAnimationFrame` ไม่ทำงาน**
  (บั๊กนี้เจอของจริงในวงแหวน ต้องมี `setTimeout` สำรองเสมอ)
- `scripts/db-migrate.mjs` ต้องรันด้วย `node --env-file=.env.local`
- ถ้าหน้า React ฟอร์มรีโหลดเอง → `rm -rf .next` ก่อนไล่แก้โค้ด


---

## 16. 🧠 AI Chat แบบยืดหยุ่น + กราฟเปรียบเทียบ — โครงที่ตกลงไว้ (23 ก.ค. 2569)

> **สถานะ: ✅ เฟส 1 (ชั้น validate) เขียนเสร็จแล้ว 24 ก.ค. 2569** — `lib/chat/plan.ts` +
> `tests/chat-plan.test.ts` (28 เทสต์) · **ยังไม่ได้ต่อ AI จริง และยังไม่ได้แตะ
> `app/api/chat/route.ts`** (ตั้งใจหยุดตรงนี้ตามที่ผู้ใช้สั่ง — ให้ด่าน validate ผ่านเทสต์ก่อน)
> ⏸️ ส่วนที่เหลือ (ต่อ AI + กราฟ + UI) **ทำหลังระบบสมาชิก + แดชบอร์ดต้นทุน** เพราะควรเป็น
> ฟีเจอร์พรีเมียม (คิด 2-3 เครดิต)

### ปัญหาที่จะแก้
ตอนนี้ `/api/chat` ตอบได้เฉพาะจาก context ที่หน้าจอส่งมา — คำถามที่ไม่ตรง Logic ไหนเลย
จะตกไป Logic 18 (ตอบกว้างๆ) ทั้งที่ระบบมี engine 70 ฟังก์ชันที่ตอบได้จริง

### 🔴 เส้นแบ่งที่ห้ามข้าม (สำคัญที่สุดในหัวข้อนี้)

| | |
|---|---|
| ✅ **AI เลือกว่าจะเรียกฟังก์ชันไหน ด้วยค่าอะไร** → engine คำนวณ → AI เรียบเรียง | ปลอดภัย |
| ❌ **AI คำนวณเอง / คิดสูตรผสมใหม่เอง** | คือการเดาที่แต่งตัวเป็นการคำนวณ |

เหตุผลเชิงธุรกิจ ไม่ใช่เชิงเทคนิค: §0 บอกว่าจุดขายคือ *"การคำนวณจริง ไม่ใช่การเดา"*
ถ้า AI คำนวณเอง ข้อได้เปรียบข้อเดียวที่แยกจากแชทบอทดูดวงทั่วไปก็หายไป

### สถาปัตยกรรม — "แผน JSON" ไม่ใช่ tool-use loop

ตัดสินใจใช้ **แผน JSON** (แพทเทิร์นเดียวกับ Router ที่มี `extractJson` + `validateAiClassification` อยู่แล้ว)

```
1. Claude Haiku  → คืน JSON "แผน"           ~฿0.05
2. server        → validate + รันฟังก์ชันจริง   ฿0
3. gpt-5.5       → เล่าจากตัวเลขจริง (มีสีสัน)  ~฿0.30
```

| | tool-use loop | **แผน JSON (เลือกอันนี้)** |
|---|---|---|
| เรียก AI | 4-6 ครั้ง | **2 ครั้ง** |
| ต้นทุน | ฿0.6-1.2 | **~฿0.35** |
| provider | Claude เป็นหลัก | **ใช้ได้ทั้ง 3 เจ้า** |
| validate ก่อนรัน | ยาก | **ง่าย — ตรวจทั้งแผนทีเดียว** |

ข้อเสียเดียว: AI ปรับแผนกลางทางไม่ได้ — แต่ engine/input ของโดเมนนี้คงที่ แทบไม่ต้องใช้

**บทบาท AI (ผู้ใช้เลือกเอง):** Claude = คนเลือก · **OpenAI gpt-5.5 = คนเล่า** (สีสันดีกว่า)

### รูปแบบแผน JSON

```jsonc
{
  "calls": [
    { "fn": "lookup2digit",  "args": { "num": 99 } },
    { "fn": "artifactElement","args": { "num": 8899 } }
  ],
  "chart": {                       // ไม่บังคับ — ใส่เมื่อเป็นคำถามเปรียบเทียบ
    "type": "bar",                 // bar | radar | table | scale
    "label": "เทียบทะเบียนรถ 3 คัน",
    "series": "wuXingScore"        // ต้องเป็น engine เดียวกันทั้งกราฟ
  },
  "missingInputs": ["birthDate"]   // ถ้ามี → ถามผู้ใช้ ห้ามเดาแล้วคำนวณ
}
```

### ฟังก์ชันที่เปิดให้ AI เรียกได้ในเฟส 1

เลือกเฉพาะตัวที่ **ไม่ต้องใช้วันเกิด** → ทดสอบได้ทันทีโดยไม่ต้องรื้อชั้น AI

| fn | args | หมายเหตุ |
|---|---|---|
| `lookup2digit` | `num: number` | ตรง 100% กับตาราง |
| `lookup3digit` | `num: number` | ⚠️ มี 14 แถวตัวอย่าง ที่เหลือ fallback |
| `analyzePhoneNumber` | `phone: string` | ⚠️ สูตรออกแบบเสริมเอง ไม่ verify (§5) |
| `artifactElement` | `num: number` | ⚠️ ไม่มีวันคืน "ทอง" (ตาราง 4 ธาตุ) |
| `digitSumReduce` | `n, stopAt?` | |
| `wuXingScore` | `userElement, objectElement, userMissingElements[]` | golden test ผ่านแล้ว |

**เฟส 2** ค่อยเปิดตัวที่ต้องใช้วันเกิด (`calculateElementSeed`, `dailyPrediction`,
`analyzeFengShui`, `checkFullAuspiciousTime` ฯลฯ) — ต้องมี `missingInputs` ทำงานก่อน

### ✅ กฎ validate ที่ server (ห้ามข้าม) — บังคับได้จริงแล้ว มีเทสต์ล็อกทุกข้อ

| กฎ | ตัวอย่างที่ถูกปฏิเสธจริงในเทสต์ |
|---|---|
| 1. **fn ต้องอยู่ใน allowlist** — ไม่ใช่ `eval` หรือเรียกอะไรก็ได้ | `eval` · `calculateElementSeed` · `LOOKUP2DIGIT` (case ต่างถือว่าไม่ตรง) |
| 2. **args ต้องตรง type** — เลขต้องเป็นเลข ธาตุต้องอยู่ใน 5 ตัวจริง | `{num:"99"}` (สตริง — **ไม่แปลงให้**) · `1.5` · `NaN` · `1e999` · ธาตุ `"Lightning"` |
| 3. **ห้ามใช้ฟังก์ชันข้ามบริบท** | `lookup2digit(1990)` → error บอกตรงๆ ว่าปีเกิดเป็นคนละบริบท · `lookup3digit(2569)` |
| 4. **`missingInputs` ไม่ว่าง → ถามผู้ใช้ ห้ามรันแล้วเดา** | คืน `kind:"needs_input"` **ไม่รัน calls แม้ AI ส่ง calls มาพร้อมกัน** |
| 5. **จำกัดจำนวน calls ต่อแผน** = `MAX_CALLS_PER_PLAN` 5 | 6 calls ถูกปฏิเสธ |

**ผลลัพธ์ของ `validateChatPlan()` เป็น 3 ทาง ไม่ใช่ boolean** —
`{ok:true, plan}` · `{ok:false, kind:"needs_input", missingInputs}` · `{ok:false, kind:"invalid", errors}`
เพราะ "ข้อมูลไม่พอ" กับ "แผนผิด" ต้องตอบผู้ใช้คนละแบบ (ถามเพิ่ม vs ให้ AI วางแผนใหม่)

**การตัดสินใจที่เพิ่มระหว่างเขียน (ไม่ได้อยู่ในแบบร่างเดิม):**
- **ธาตุภาษาไทย normalize ให้** — `"ไฟ"`→Fire, `"ทอง"`→Metal, และ **`"ลม"`→Wood**
  (มาจากระบบ 4 bucket ที่ `THAI_LABEL_4.Wood = "ลม"` ส่วนระบบ 5 ธาตุใช้ "ไม้") เป็นการแปลง
  deterministic ไม่ใช่การเดา — ถ้าจะเข้มกว่านี้ (รับเฉพาะอังกฤษ) ต้องแก้ `toElement5()`
- **`caveat` ผูกกับฟังก์ชันใน allowlist โดยตรง** — `executePlan()` คืน `caveats[]` (ยุบซ้ำแล้ว)
  ทุกครั้ง ข้อจำกัดจาก §5 (เบอร์โทร/3-digit fallback/artifactElement ไม่มี "ทอง") จึงไหลถึง
  ผู้ใช้เสมอ **ชั้นเล่าเรื่องต้องแสดง ห้ามกลืนหาย**
- **`describeAllowlistForPrompt()` สร้าง prompt จาก `PLAN_ALLOWLIST` ตรงๆ** — prompt จึง
  drift จากสิ่งที่รันได้จริงไม่ได้ (เพิ่ม fn แล้วลืมแก้ prompt = เป็นไปไม่ได้)

### 🔴 กฎกราฟ — จุดที่พลาดง่ายที่สุด

```
✅ AI เลือก: ชนิดกราฟ + ชุดข้อมูล + ป้ายชื่อ
❌ AI วาด: SVG / เขียนตัวเลขเอง
```
**ตัวเลขในกราฟต้องมาจาก engine เท่านั้น** — ถ้า AI เขียน 73 แต่ engine ได้ 78
คือการแต่งข้อมูลที่ดูน่าเชื่อกว่าข้อความ เพราะคนเชื่อกราฟมากกว่าคำพูด

**🔴 ห้ามเทียบข้าม Logic** (ละเมิด §4 ข้อ 5 "Track A/B/C ห้ามเฉลี่ยรวม")

| | |
|---|---|
| ✅ บ้าน A vs B vs C | `wuXingScore` เหมือนกัน สเกลเดียวกัน |
| ✅ จันทร์-อาทิตย์ วันไหนฤกษ์ดี | engine เดียวกันทั้งแถว |
| ❌ "ดวงงาน 73 · ดวงรัก 61 · ฮวงจุ้ย 82" | คนละสเกล คนละที่มา — บางตัวมาจากตำรา บางตัวออกแบบเอง |

→ validate ปฏิเสธถ้า `series` ข้ามชนิด

✅ **บังคับแล้วด้วยกฎที่แข็งกว่าที่ร่างไว้: ทุก call ในแผนต้องเป็น fn เดียวกับ `chart.series`**
(ไม่ใช่แค่ "series ไม่ข้ามชนิด") → การเทียบข้าม Logic เกิดขึ้นไม่ได้เชิงโครงสร้าง ไม่ใช่แค่ตรวจจับ
error message บอกด้วยว่า fn ตัวไหนปนเข้ามา

**กฎกราฟที่เพิ่มระหว่างเขียน:**
- **`bar`/`radar`/`scale` ต้องใช้ engine ที่คืน "คะแนน" จริงเท่านั้น** — มีแค่ `wuXingScore`
  (สเกล −2..2) กับ `digitSumReduce` (สเกล 0..9) ที่ประกาศ `chartable` ไว้
  ส่วน `table` ไม่ได้อ้างว่ามีสเกลร่วมกัน จึงใช้กับ `lookup2digit` ฯลฯ ได้
  (`lookup2digit` + `bar` = ถูกปฏิเสธ พร้อมแนะให้ใช้ table แทน)
- **จุดข้อมูลขั้นต่ำ: bar 2 · radar 3 · table 2 · scale 1** — กราฟเปรียบเทียบที่มีจุดเดียว
  ไม่มีความหมาย ส่วน `scale` เป็นมาตรวัดค่าเดียวจึง 1 จุดพอ
- **สเกลของกราฟมาจาก `PLAN_ALLOWLIST[series].chartable.scale` ไม่ใช่จาก AI** — AI ตั้งได้แค่
  ชนิดกราฟกับป้ายชื่อ (ป้ายถูก trim + ตัดที่ 60 ตัวอักษร; ไม่ส่งมา → server สร้างเองจาก args)

### กราฟ — ไม่ต้องลงไลบรารีเพิ่ม

มีแม่แบบครบแล้ว ยกออกมาเป็น component กลาง 4 แบบ:
- `bar` — จาก `fortune`/`profile` (แถบ CSS)
- `radar` — จาก `compatibility` (SVG ใยแมงมุม)
- `table` · `scale` — เขียนใหม่ ง่าย

⚠️ อย่าลง recharts/chart.js — เพิ่ม bundle โดยไม่จำเป็น และหน้านี้เปิดใน LIFF บนมือถือ

### Layout

- **มือถือ (LIFF เป็นหลัก)** → ซ้อนแนวตั้ง: ผลบน · แชทล่าง (แบบ `FunctionChat` ตอนนี้)
- **จอ ≥1024px** → แบ่งซ้ายขวา: กราฟซ้าย · แชทขวา
- ใช้ CSS grid อย่างเดียว **ไม่ต้องเขียน logic แยกจอ**

### ไฟล์

```
✅ lib/chat/plan.ts          schema + allowlist 6 fn + validate + executor (ตรรกะล้วน)
✅ tests/chat-plan.test.ts   28 เทสต์ — เทสต์ validate สำคัญกว่าเทสต์ AI
⬜ lib/chat/charts.ts        ชนิดกราฟ + กฎ series เดียวกัน
⬜ app/api/chat/route.ts     เพิ่มเส้นทาง "แผน" คู่กับเส้นทางเดิม
⬜ app/(liff)/_components/   เพิ่ม ChartPanel.tsx
```

**`lib/chat/plan.ts` ไม่ import อะไรที่แตะ network/cookie/next เลย** (มีแค่ engine 2 ตัว)
— เทสต์จึงรันตรงๆ ไม่ต้อง mock อะไร **ถ้าจะแก้ อย่าลากของฝั่ง server เข้ามาในไฟล์นี้**

⚠️ **`lib/ai/index.ts` คืนแค่ text** — ถ้าจะไป tool-use จริงต้องขยาย แต่แผน JSON ใช้
`extractJson()` ที่มีอยู่แล้วได้เลย **ไม่ต้องแก้ชั้น AI**

### คำสั่งเริ่มงานเฟส 2 (คัดลอกไปวางได้)

```
อ่าน CLAUDE.md §16 แล้วต่อเฟส 2 ของ AI Chat แบบยืดหยุ่น:
ต่อ AI จริงเข้ากับ lib/chat/plan.ts ที่มีอยู่แล้ว (Claude Haiku วางแผน → validateChatPlan
→ executePlan → gpt-5.5 เล่า) แล้วเพิ่มเส้นทางนี้ใน app/api/chat/route.ts
ห้ามแก้กฎ validate ให้หลวมลงเพื่อให้ AI ผ่านง่ายขึ้น — ถ้า AI วางแผนไม่ผ่านให้แก้ prompt
```

⚠️ **เมื่อต่อ AI แล้ว ให้บันทึกไว้ด้วยว่า AI วางแผน "ไม่ผ่าน validate" บ่อยแค่ไหนและด้วยกฎข้อไหน**
— เป็นตัวชี้ว่าต้องแก้ prompt ตรงไหน (และเป็นต้นทุนที่จ่ายไปโดยไม่ได้คำตอบ)
