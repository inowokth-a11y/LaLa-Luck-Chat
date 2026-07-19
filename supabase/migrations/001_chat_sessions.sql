-- Chat Memory (Platform D + E ร่วมกัน)
-- อ้างอิง: KRUTH Platform Implementation Handbook §3.3
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'D' | 'E'
  line_user_id TEXT NOT NULL,
  dvj_id TEXT, -- เชื่อมกับ DEMM profile
  context JSONB DEFAULT '[]', -- 10 messages ล่าสุด (Rolling Window)
  summary TEXT DEFAULT '', -- Auto-summary ทุก 20 messages / 7 วัน
  state JSONB DEFAULT '{}', -- assessment progress, logic state
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_line_user ON chat_sessions(line_user_id);
