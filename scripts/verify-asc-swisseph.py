"""เทียบลัคนา lib/engine/ascendant.ts กับ Swiss Ephemeris (มาตรฐานสากล, อายนางศะลาหิรี)

วิธีรัน (ผลเมื่อ 3 ส.ค. 2569: 72/72 ราศีตรง · ต่างองศา median 0.004° max 0.005°):
  python3 -m venv /tmp/swe-venv && /tmp/swe-venv/bin/pip install pyswisseph
  npx tsx scripts/gen-asc-cases.mjs > /tmp/asc-ours.json
  /tmp/swe-venv/bin/python scripts/verify-asc-swisseph.py /tmp/asc-ours.json
"""
# เทียบลัคนา engine ของเรา vs Swiss Ephemeris (Lahiri sidereal)
import json, swisseph as swe

import sys
cases = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "asc-ours.json"))
SIGNS_TH = ["เมษ","พฤษภ","มิถุน","กรกฎ","สิงห์","กันย์","ตุลย์","พิจิก","ธนู","มังกร","กุมภ์","มีน"]

swe.set_sid_mode(swe.SIDM_LAHIRI)
mismatch_sign = []
diffs = []
for c in cases:
    # houses_ex กับ flag sidereal — Placidus ('P') ascendant ไม่ขึ้นกับระบบเรือน
    cusps, ascmc = swe.houses_ex(c["jd"], c["lat"], c["lon"], b'P', swe.FLG_SIDEREAL)
    swe_asc = ascmc[0]  # sidereal ascendant longitude
    sign_idx = int(swe_asc // 30)
    d = abs(swe_asc - c["ourLon"])
    if d > 180: d = 360 - d
    diffs.append(d)
    if SIGNS_TH[sign_idx] != c["ourSign"]:
        mismatch_sign.append((c, swe_asc, SIGNS_TH[sign_idx], d))

diffs.sort()
n = len(diffs)
print(f"เคสทั้งหมด {n} · ราศีตรง {n-len(mismatch_sign)} · ต่างองศา: median {diffs[n//2]:.3f}° · max {diffs[-1]:.3f}°")
for c, s, sg, d in mismatch_sign:
    print(f"  MISMATCH {c['y']}-{c['mo']:02d}-{c['d']:02d} {c['h']:02d}:{c['mi']:02d} {c['place']}: เรา={c['ourSign']} {c['deg']:.2f}° · SwissEph={sg} ({s:.3f}°) · ต่าง {d:.3f}°")
