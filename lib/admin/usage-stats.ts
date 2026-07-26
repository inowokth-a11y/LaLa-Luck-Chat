// รวมสถิติต้นทุน AI จาก ai_usage_log — ตรรกะล้วน (เทสต์ได้โดยไม่ต้องแตะ DB)
// ตัวเลขที่ต้องดู (§12/§15): cache hit rate · ต้นทุนเฉลี่ย/คำทำนาย · ผู้ใช้ที่แพงสุด · ตัวที่ล่มบ่อย

export interface UsageRow {
  user_id: string | null;
  channel: string | null;
  logic_id: number | null;
  ai_role: string;
  provider: string;
  model: string;
  used_fallback: boolean;
  cost_thb: number | string | null;
  cache_hit: boolean | null;
  ok: boolean;
  created_at: string;
}

export interface UsageStats {
  totalCalls: number; // การเรียก AI จริง (provider != 'cache')
  cacheHits: number; // provider == 'cache' (ตอบจากแคช ไม่เสียค่า AI)
  cacheHitRate: number; // hits / (hits + calls ที่แคชได้) — วัดเฉพาะ role ที่มีแคช (ai1)
  totalCostThb: number;
  avgCostPerCall: number;
  failures: number; // ok=false
  failRate: number;
  byRole: { role: string; calls: number; costThb: number; avgCostThb: number }[];
  byModel: { provider: string; model: string; calls: number; costThb: number; failures: number }[];
  byDay: { day: string; calls: number; costThb: number }[];
  topSpenders: { userId: string; calls: number; costThb: number }[];
  dateRange: { from: string; to: string } | null;
}

const num = (v: number | string | null): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function computeUsageStats(rows: UsageRow[]): UsageStats {
  const isCache = (r: UsageRow) => r.provider === "cache";
  const calls = rows.filter((r) => !isCache(r));
  const cacheRows = rows.filter(isCache);

  const totalCostThb = calls.reduce((s, r) => s + num(r.cost_thb), 0);
  const failures = calls.filter((r) => !r.ok).length;

  // cache hit rate — เทียบเฉพาะงานที่ "แคชได้จริง" (AI-1 นักค้นคว้า) ไม่ใช่ทุก role
  const ai1Calls = calls.filter((r) => r.ai_role === "ai1").length;
  const cacheHits = cacheRows.length;
  const denom = cacheHits + ai1Calls;

  // ---- by role ----
  const roleMap = new Map<string, { calls: number; cost: number }>();
  for (const r of calls) {
    const m = roleMap.get(r.ai_role) ?? { calls: 0, cost: 0 };
    m.calls++;
    m.cost += num(r.cost_thb);
    roleMap.set(r.ai_role, m);
  }

  // ---- by provider/model ----
  const modelMap = new Map<string, { provider: string; model: string; calls: number; cost: number; failures: number }>();
  for (const r of calls) {
    const key = `${r.provider}/${r.model}`;
    const m = modelMap.get(key) ?? { provider: r.provider, model: r.model, calls: 0, cost: 0, failures: 0 };
    m.calls++;
    m.cost += num(r.cost_thb);
    if (!r.ok) m.failures++;
    modelMap.set(key, m);
  }

  // ---- by day (วันที่ตาม created_at, UTC) ----
  const dayMap = new Map<string, { calls: number; cost: number }>();
  for (const r of calls) {
    const day = (r.created_at ?? "").slice(0, 10);
    if (!day) continue;
    const m = dayMap.get(day) ?? { calls: 0, cost: 0 };
    m.calls++;
    m.cost += num(r.cost_thb);
    dayMap.set(day, m);
  }

  // ---- top spenders (จัดกลุ่มตาม user_id, null = ไม่ล็อกอิน) ----
  const userMap = new Map<string, { calls: number; cost: number }>();
  for (const r of calls) {
    const uid = r.user_id ?? "(ไม่ล็อกอิน)";
    const m = userMap.get(uid) ?? { calls: 0, cost: 0 };
    m.calls++;
    m.cost += num(r.cost_thb);
    userMap.set(uid, m);
  }

  const dates = rows.map((r) => r.created_at).filter(Boolean).sort();

  return {
    totalCalls: calls.length,
    cacheHits,
    cacheHitRate: denom === 0 ? 0 : round4(cacheHits / denom),
    totalCostThb: round2(totalCostThb),
    avgCostPerCall: calls.length === 0 ? 0 : round4(totalCostThb / calls.length),
    failures,
    failRate: calls.length === 0 ? 0 : round4(failures / calls.length),
    byRole: [...roleMap.entries()]
      .map(([role, m]) => ({ role, calls: m.calls, costThb: round2(m.cost), avgCostThb: round4(m.cost / m.calls) }))
      .sort((a, b) => b.costThb - a.costThb),
    byModel: [...modelMap.values()]
      .map((m) => ({ provider: m.provider, model: m.model, calls: m.calls, costThb: round2(m.cost), failures: m.failures }))
      .sort((a, b) => b.costThb - a.costThb),
    byDay: [...dayMap.entries()]
      .map(([day, m]) => ({ day, calls: m.calls, costThb: round2(m.cost) }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-14),
    topSpenders: [...userMap.entries()]
      .map(([userId, m]) => ({ userId, calls: m.calls, costThb: round2(m.cost) }))
      .sort((a, b) => b.costThb - a.costThb)
      .slice(0, 8),
    dateRange: dates.length ? { from: dates[0].slice(0, 10), to: dates[dates.length - 1].slice(0, 10) } : null,
  };
}
