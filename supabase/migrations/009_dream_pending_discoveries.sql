-- Logic 4: AI-1 enrichment pipeline — คำที่ไม่พบในฐาน 457+50 ต้องผ่านการรีวิวก่อนรวมจริง
CREATE TABLE IF NOT EXISTS dream_pending_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  dream_object TEXT NOT NULL,
  chinese_char TEXT,
  kangxi_strokes INT,
  element TEXT, -- ตัดสินเชิงความหมาย ห้ามคำนวณจากนับขีด (ดู CLAUDE.md §5)
  meaning_keyword TEXT,
  source TEXT DEFAULT 'ai_discovered',
  reviewed BOOLEAN DEFAULT false,
  reviewed_by TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now()
);
