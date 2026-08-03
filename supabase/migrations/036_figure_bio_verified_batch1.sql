-- 036: ผลตรวจสอบ figure_bio รอบที่ 1 — ชุดเสี่ยงสูง mythological/legendary 24 ราย (3 ส.ค. 2569)
-- ตรวจด้วย web search จริงทุกราย (แหล่ง: Britannica/Theoi/WorldHistory ฯลฯ) — แก้ 6 ราย, ยืนยันเดิม 18 ราย
-- การแก้หมวด: ซีตา legendary→mythological (อวตารพระลักษมี) · แลนสล็อต legendary→fictional
-- (ตัวละครของเครเตียง เดอ ทรัวส์) · จอห์นนี่ แอปเปิ้ลซีด legendary→historical (John Chapman มีตัวตนจริง)
-- การแก้เนื้อหา: อะคิลลีส (เรื่องส้นเท้าไม่ได้อยู่ใน Iliad — เป็นตำนานโรมันยุคหลัง) ·
-- อพอลโล (เทพดวงอาทิตย์ดั้งเดิมคือเฮลิออส) · ไมดาส (ลูกสาวกลายเป็นทองเป็นฉบับ Hawthorne 1851 ไม่ใช่ตำนานกรีก)

UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'ตัวละครหลักในมหากาพย์รามายณะของอินเดีย ชายาของพระราม และถือกันว่าเป็นอวตารของพระแม่ลักษมี ถูกลักพาตัวโดยทศกัณฐ์แต่ยืนหยัดปฏิเสธไม่ยอมแพ้ เป็นสัญลักษณ์ของความซื่อสัตย์และความอดทนในวัฒนธรรมฮินดู', figure_category = 'mythological' WHERE archetype_figure = 'พระนางซีตา';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'โอดิสสิอุส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เฮอร์คิวลิส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เฮอร์มีส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'ไอเนียส (Aeneas)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'โจคาสตา (Jocasta)';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'นักรบที่เก่งกาจที่สุดในมหากาพย์ Iliad ของโฮเมอร์ ผู้เป็นหัวใจของสงครามทรอย ตำนานยุคโรมันภายหลังเล่าว่าแม่จุ่มตัวเขาในแม่น้ำสติกซ์ให้อยู่ยงคงกระพันทั้งตัว ยกเว้นส้นเท้าที่จับไว้ จุดอ่อนเดียวที่ทำให้เขาเสียชีวิต และกลายเป็นที่มาของคำว่า Achilles heel' WHERE archetype_figure = 'อะคิลลีส';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'Psyche (ไซคี)';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'เทพแห่งแสงสว่าง ดนตรี บทกวี และคำทำนายในเทพปกรณัมกรีก (ยุคหลังถูกนับรวมเป็นเทพดวงอาทิตย์แทนเฮลิออส) เป็นเจ้าของวิหารที่เดลฟีซึ่งเป็นที่ตั้งของออราเคิลอันโด่งดัง ถือเป็นเทพที่หล่อเหลาและมีความสามารถรอบด้านที่สุดองค์หนึ่ง' WHERE archetype_figure = 'เทพอพอลโล';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เทพีเดเมเทอร์';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เทพพลูตอส (Plutus)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'กษัตริย์อาเธอร์';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'อัศวินที่เก่งกาจที่สุดในตำนานโต๊ะกลมของกษัตริย์อาเธอร์ เป็นตัวละครวรรณกรรมที่กวีฝรั่งเศส เครเตียง เดอ ทรัวส์ สร้างขึ้นในศตวรรษที่ 12 ความรักต้องห้ามกับราชินีกวินิเวียร์นำไปสู่ความแตกแยกและการล่มสลายของอาณาจักรคาเมล็อตในที่สุด', figure_category = 'fictional' WHERE archetype_figure = 'เซอร์ แลนสล็อต (Sir Lancelot)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เทพีอาธีนา';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เทพฮิฟีสตัส (Hephaestus)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เฮกเตอร์';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'ซินแบด';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เดดาลัส';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'ชื่อในตำนานพื้นบ้านของ John Chapman (1774-1845) นักเพาะชำชาวอเมริกันผู้มีตัวตนจริง เดินทางปลูกและขยายสวนกล้าต้นแอปเปิลไปทั่วแถบมิดเวสต์ของสหรัฐฯ เรื่องราวของเขาถูกเล่าขานจนกลายเป็นตำนานพื้นบ้านสัญลักษณ์ของผู้ให้และผู้บุกเบิกที่ใจดี', figure_category = 'historical' WHERE archetype_figure = 'จอห์นนี่ แอปเปิ้ลซีด';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เทพีฟริกก์';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'ไครอน (Chiron)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'เมอร์ลิน (Merlin)';
UPDATE master_energy_cards SET figure_bio_verified = true, figure_bio = 'กษัตริย์ในตำนานกรีกผู้ขอพรให้ทุกสิ่งที่แตะต้องกลายเป็นทองคำ แต่กลับพบว่าแม้แต่อาหารและเครื่องดื่มก็กลายเป็นทองจนแทบอดตาย ต้องวิงวอนขอถอนพรด้วยการชำระล้างในแม่น้ำแพกโทลัส เป็นนิทานสอนใจเรื่องความโลภที่นำมาซึ่งความทุกข์' WHERE archetype_figure = 'กษัตริย์ไมดาส (King Midas)';
UPDATE master_energy_cards SET figure_bio_verified = true WHERE archetype_figure = 'โพรมีธีอุส (Prometheus)';

-- ตรวจว่าครบ 24 แถว (ชื่อไม่ตรง = เงียบหาย จึงต้องนับ)
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM master_energy_cards
    WHERE figure_bio_verified = true AND archetype_figure IN ('พระนางซีตา', 'โอดิสสิอุส', 'เฮอร์คิวลิส', 'เฮอร์มีส', 'ไอเนียส (Aeneas)', 'โจคาสตา (Jocasta)', 'อะคิลลีส', 'Psyche (ไซคี)', 'เทพอพอลโล', 'เทพีเดเมเทอร์', 'เทพพลูตอส (Plutus)', 'กษัตริย์อาเธอร์', 'เซอร์ แลนสล็อต (Sir Lancelot)', 'เทพีอาธีนา', 'เทพฮิฟีสตัส (Hephaestus)', 'เฮกเตอร์', 'ซินแบด', 'เดดาลัส', 'จอห์นนี่ แอปเปิ้ลซีด', 'เทพีฟริกก์', 'ไครอน (Chiron)', 'เมอร์ลิน (Merlin)', 'กษัตริย์ไมดาส (King Midas)', 'โพรมีธีอุส (Prometheus)');
  IF n <> 24 THEN RAISE EXCEPTION 'figure_bio verified ได้ % แถว (ต้อง 24)', n; END IF;
END $$;
