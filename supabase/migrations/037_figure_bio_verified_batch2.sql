-- 037: ผลตรวจสอบ figure_bio รอบที่ 2 — religious 8 + ฤษี (role_title) + สุ่ม historical 12 (3 ส.ค. 2569)
-- ตรวจด้วย web search จริงทุกราย — ผ่าน 18, แก้ 3:
-- พระพุทธเจ้า: 'สละราชสมบัติ'→'เสด็จออกผนวช' (ยังไม่ได้ครองราชย์) + 'มรรค 8'→'มรรคมีองค์ 8' + ราชาศัพท์
-- พอล โกแกง: อาชีพเดิม 'นายธนาคาร'→'นายหน้าค้าหุ้น' (stockbroker — Met Museum/EBSCO ตรงกัน)
-- เล่าจื๊อ: historical→legendary (ฉันทามติวิชาการ: ตัวตนพิสูจน์ไม่ได้ เต้าเต๋อจิงน่าจะหลายผู้แต่ง)

UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'กษัตริย์โซโลมอน (King Solomon)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'โมเสส (Moses)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เจ้าแม่กวนอิม (Guan Yin)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'พระเยซูแห่งนาซาเร็ธ (Jesus of Nazareth)';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'เจ้าชายสิทธัตถะทรงสละความสุขในวังเสด็จออกผนวชเพื่อแสวงหาทางพ้นทุกข์ จนตรัสรู้เป็นพระสัมมาสัมพุทธเจ้าและทรงประดิษฐานพระพุทธศาสนา คำสอนเรื่องอริยสัจ 4 และมรรคมีองค์ 8 ยังคงเป็นหลักธรรมสำคัญของชาวพุทธทั่วโลก' WHERE archetype_figure = 'พระพุทธเจ้า';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'Thich Nhat Hanh (ติช นัท ฮันห์)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'นักบุญฟรานซิสแห่งอัสซีซี (Saint Francis of Assisi)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'นักบุญเวโรนิกา (Saint Veronica)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'ฤษี';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'Abigail Adams';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'นอสตราดามุส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'โฮเวิร์ด ฮิวส์';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'วิตรูวิอุส (Vitruvius)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'มาเรีย มอนเตสซอรี่ (Maria Montessori)';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'จิตรกรชาวฝรั่งเศส (1848-1903) ทิ้งอาชีพนายหน้าค้าหุ้นในตลาดหลักทรัพย์ปารีสเพื่อตามความฝันด้านศิลปะ เดินทางไปตาฮีตีเพื่อค้นหาแรงบันดาลใจใหม่ สร้างสรรค์ผลงานสีสันจัดจ้านที่แหวกขนบศิลปะยุโรปยุคนั้น' WHERE archetype_figure = 'พอล โกแกง';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'ไครซัส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'วินสตัน เชอร์ชิลล์';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'ปราชญ์จีนโบราณกึ่งตำนาน ผู้ได้รับการยกย่องว่าเป็นบิดาแห่งแนวคิดเต๋า (Taoism) ที่เน้นการปล่อยวางและอยู่กับธรรมชาติอย่างสมดุล ผลงานที่เชื่อกันว่าเป็นของท่านคือคัมภีร์เต้าเต๋อจิงซึ่งยังคงมีอิทธิพลถึงปัจจุบัน โดยนักวิชาการสมัยใหม่ยังถกเถียงว่าท่านมีตัวตนจริงหรือเป็นภาพรวมของปราชญ์หลายคน', figure_category = 'legendary' WHERE archetype_figure = 'เล่าจื๊อ';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'แอนดรูว์ คาร์เนกี';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'จักรพรรดิออกัสตัส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'คริสโตเฟอร์ โคลัมบัส';

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM master_energy_cards
    WHERE figure_bio_verified = true AND archetype_figure IN ('กษัตริย์โซโลมอน (King Solomon)', 'โมเสส (Moses)', 'เจ้าแม่กวนอิม (Guan Yin)', 'พระเยซูแห่งนาซาเร็ธ (Jesus of Nazareth)', 'พระพุทธเจ้า', 'Thich Nhat Hanh (ติช นัท ฮันห์)', 'นักบุญฟรานซิสแห่งอัสซีซี (Saint Francis of Assisi)', 'นักบุญเวโรนิกา (Saint Veronica)', 'ฤษี', 'Abigail Adams', 'นอสตราดามุส', 'โฮเวิร์ด ฮิวส์', 'วิตรูวิอุส (Vitruvius)', 'มาเรีย มอนเตสซอรี่ (Maria Montessori)', 'พอล โกแกง', 'ไครซัส', 'วินสตัน เชอร์ชิลล์', 'เล่าจื๊อ', 'แอนดรูว์ คาร์เนกี', 'จักรพรรดิออกัสตัส', 'คริสโตเฟอร์ โคลัมบัส');
  IF n <> 21 THEN RAISE EXCEPTION 'figure_bio รอบ 2 verified ได้ % แถว (ต้อง 21)', n; END IF;
END $$;
