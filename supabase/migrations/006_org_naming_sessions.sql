-- Logic 19: Naming & Branding Generator
CREATE TABLE IF NOT EXISTS org_naming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  industry_type TEXT,
  founder_element TEXT,
  aggregate_element TEXT,
  candidate_names JSONB, -- [{name, name_element, score}, ...]
  recommended_element TEXT,
  logo_style_tags JSONB, -- ["โค้งอินทรีย์","เขียว"] เป็นต้น
  logo_prompts JSONB, -- ข้อความ prompt เท่านั้น (ไม่มี image-gen tool ในระบบนี้)
  created_at TIMESTAMPTZ DEFAULT now()
);
