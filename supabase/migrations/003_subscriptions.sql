-- Payment / Subscription (Omise)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  platform TEXT, -- 'D' | 'E'
  tier TEXT, -- 'free' | 'premium' | 'lifetime' | 'team' | 'org'
  status TEXT, -- 'active' | 'cancelled' | 'expired'
  omise_customer_id TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  platform TEXT,
  logic_type TEXT,
  usage_date DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1
);
