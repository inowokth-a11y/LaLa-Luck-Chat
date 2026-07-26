-- 026_logo_storage.sql — bucket เก็บโลโก้ถาวร (URL fal เป็นชั่วคราว)
-- public = อ่านผ่าน URL ได้เลย · เขียนผ่าน service role เท่านั้น (route /api/logo) — anon อัปโหลดไม่ได้

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
