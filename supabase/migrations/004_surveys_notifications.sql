-- Survey system + notification preferences
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  survey_type TEXT, -- 'monthly_wellbeing' | 'quarterly_ocean' | 'feedback'
  platform TEXT,
  responses JSONB,
  triggered_by TEXT, -- 'scheduled' | 'event' | 'user_request'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- เพิ่มใน users table ที่มีอยู่แล้ว (สมมติว่ามี id, full_name, dob, day_of_week,
-- thai_element, chinese_element, name_*_pct, num_life อยู่แล้วจาก Platform D setup)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{
  "daily_horoscope": false,
  "weekly_summary": false,
  "monthly_prediction": false,
  "birthday_message": true,
  "survey_reminder": true,
  "flag_alert": true
}'::jsonb;
