"""เทียบตำแหน่งดาว lib/engine/planets.ts กับ Swiss Ephemeris (sidereal Lahiri)

วิธีรัน:
  python3 -m venv /tmp/swe-venv && /tmp/swe-venv/bin/pip install pyswisseph
  npx tsx scripts/gen-planet-cases.mjs > /tmp/planet-ours.json
  /tmp/swe-venv/bin/python scripts/verify-planets-swisseph.py /tmp/planet-ours.json

เกณฑ์ผ่านสำหรับชั้น Jyotish: ราศีตรง (ยกเว้นเคสห่างขอบราศี < ค่าคลาด) และ
median คลาด < 0.2° · max < 1.0° (ช่อง D9 กว้าง 3°20′ — คลาดระดับนี้ D9 ยังพลาดได้
เฉพาะใกล้ขอบช่อง ต้องรายงาน % ช่อง D9 ตรงด้วย)
"""
import json, sys
import swisseph as swe

cases = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/planet-ours.json"))
swe.set_sid_mode(swe.SIDM_LAHIRI)
FLG = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
PLANETS = {
    "mercury": swe.MERCURY, "venus": swe.VENUS, "mars": swe.MARS,
    "jupiter": swe.JUPITER, "saturn": swe.SATURN, "rahu": swe.MEAN_NODE,
}

stats = {p: [] for p in PLANETS}
sign_miss = {p: 0 for p in PLANETS}
d9_miss = {p: 0 for p in PLANETS}
for c in cases:
    for p, ipl in PLANETS.items():
        pos, _ = swe.calc_ut(c["jd"], ipl, FLG)
        swe_lon = pos[0]
        d = abs(swe_lon - c[p])
        if d > 180: d = 360 - d
        stats[p].append(d)
        if int(swe_lon // 30) != int(c[p] // 30):
            # นับเป็น miss จริงเฉพาะเมื่อไม่ได้อยู่ติดขอบราศี (ห่างขอบ > 0.2° = สูตรผิดจริง)
            boundary = min(swe_lon % 30, 30 - swe_lon % 30)
            if boundary > 0.2: sign_miss[p] += 1
        if int(swe_lon // (10/3)) % 12 != int(c[p] // (10/3)) % 12: d9_miss[p] += 1

n = len(cases)
print(f"cases: {n}")
ok = True
for p in PLANETS:
    ds = sorted(stats[p])
    med, mx = ds[n // 2], ds[-1]
    print(f"{p:8s} median {med:.4f}° max {mx:.4f}° | ราศีตรง {n - sign_miss[p]}/{n} | D9 ตรง {n - d9_miss[p]}/{n}")
    if med > 0.2 or mx > 1.0 or sign_miss[p] > 0:
        ok = False
print("PASS" if ok else "CHECK-NEEDED")
