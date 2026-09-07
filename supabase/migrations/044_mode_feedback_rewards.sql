-- 044: ความเห็นรายโหมด + รางวัลเครดิตทดลอง (ผู้ใช้เคาะ 6 ก.ย. 2569)
-- ช่วงทดลอง (ยังต่อ Omise ไม่ได้): ให้ความเห็นโหมดที่ใช้ → รับ 20 เครดิต → เอาไปลองโหมดอื่น
-- ต่อยอดระบบ feedback เดิม (migration 024) — กันฟาร์มเดิมคงอยู่: ครั้งเดียวต่อ prompt ต่อคน
--
-- แนวคิด: 1 โหมด = 1 prompt (unique บน logic_id) · prompt เดิมที่ไม่มี logic_id = ความเห็นทั่วไป
-- (รางวัลเดิม +1 คำถามฟรี ไม่เปลี่ยน) · reward_credits > 0 = รางวัลเครดิตจริงผ่าน grant_credits

alter table feedback_prompts add column if not exists logic_id int;
alter table feedback_prompts add column if not exists reward_credits int not null default 0;

-- หนึ่ง prompt ต่อโหมด (แอดมินแก้คำถามที่มีอยู่ ไม่สร้างซ้ำ)
create unique index if not exists uq_feedback_prompt_logic
  on feedback_prompts (logic_id) where logic_id is not null;

comment on column feedback_prompts.logic_id is 'ผูกกับโหมด (logic id) — NULL = คำถามทั่วไปแบบเดิม';
comment on column feedback_prompts.reward_credits is 'รางวัลเครดิตเมื่อตอบครั้งแรก (0 = ใช้รางวัลเดิม +1 คำถามฟรี)';

-- seed คำถามตั้งต้นรายโหมด (แอดมินแก้ทีหลังได้ใน /admin) — insert เฉพาะโหมดที่ยังไม่มี
insert into feedback_prompts (question, active, logic_id, reward_credits)
select q, true, lid, 20 from (values
  (1,  'การ์ดพลังงานและคำทำนายโปรไฟล์ ตรงใจแค่ไหน อยากให้ปรับอะไรบ้างคะ?'),
  (3,  'โหมดหาฤกษ์ดี ใช้งานเข้าใจง่ายไหม ผลตรงกับที่คาดหวังหรือเปล่าคะ?'),
  (4,  'คำทำนายฝันที่ได้ ละเอียดพอไหม มีจุดไหนอยากให้เพิ่มหรือแก้คะ?'),
  (7,  'คำแนะนำฮวงจุ้ย นำไปใช้จริงได้แค่ไหน อยากให้เพิ่มอะไรคะ?'),
  (8,  'ดวงรายวัน/เดือน/ปี อ่านเข้าใจง่ายไหม ส่วนไหนมีประโยชน์ที่สุดคะ?'),
  (16, 'คำแนะนำดูแลสุขภาวะตามธาตุ เหมาะกับคุณแค่ไหน ลองทำแล้วเป็นอย่างไรคะ?'),
  (17, 'คำทำนายเนื้อคู่และภาพที่ได้ ตรงใจแค่ไหน อยากให้ปรับส่วนไหนคะ?'),
  (19, 'โลโก้ที่ระบบแนะนำ/สร้างให้ ถูกใจไหม อยากได้สไตล์แบบไหนเพิ่มคะ?'),
  (20, 'ทำนายแบบองค์รวม (ผูกสิ่งรอบตัว) ช่วยให้เห็นภาพรวมขึ้นไหมคะ?'),
  (21, 'พิธีเสี่ยงทายวงแหวน สนุก/ศักดิ์สิทธิ์พอไหม คำตีความเป็นอย่างไรคะ?')
) as seed(lid, q)
where not exists (select 1 from feedback_prompts p where p.logic_id = seed.lid);
