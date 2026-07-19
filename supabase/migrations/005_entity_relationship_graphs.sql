-- Logic 20: Multi-Entity Compatibility Graph
CREATE TABLE IF NOT EXISTS entity_relationship_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL, -- 'person' | 'house' | 'car' | 'company' | 'colleague'
  entity_name TEXT,
  entity_element TEXT, -- Wood/Fire/Earth/Metal/Water (English keys, ดู kruth_element_engine)
  shared_context BOOLEAN DEFAULT false, -- same_house / same_workplace amplifier
  wu_xing_raw_score INT,
  wu_xing_final_score INT,
  productive_clash BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_graphs_user ON entity_relationship_graphs(user_id);
