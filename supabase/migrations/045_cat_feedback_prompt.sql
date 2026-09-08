-- 045: seed คำถามความเห็นโหมดดูดวงแมว (logic 22 — 6 ก.ย. 2569) ต่อจาก 044
insert into feedback_prompts (question, active, logic_id, reward_credits)
select 'ดูดวงแมวตามตำราแมวศุภลักษณ์ ตรงกับแมวที่บ้านไหม อยากให้เพิ่มอะไรคะ?', true, 22, 20
where not exists (select 1 from feedback_prompts where logic_id = 22);
