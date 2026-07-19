"""
Logic 3: ฤกษ์ยามและทิศมงคล (Auspicious Timing) — Ubakong (ยามอุบากอง)
========================================================================
✅ อัปเดต: ใช้ข้อมูลจริงจาก Ubakong_Time_Chart.xlsx (35 แถว) แทนที่ placeholder เดิม
ที่ทำได้แค่บอก "อยู่ยามไหน" แต่ตัดสินดี/ร้ายไม่ได้

ครอบคลุมเฉพาะยามกลางวัน (06:01-18:00, 5 ยามต่อวัน) — ไฟล์ต้นฉบับมีแค่ช่วงนี้
❌ ยังไม่มี: ยามกลางคืน (18:01-06:00), Flying Stars (ทิศดาวเหิน 9 ยุค)
"""

import json
from datetime import time

with open("ubakong_time_chart.json", encoding="utf-8") as f:
    UBAKONG_TABLE = json.load(f)


def _parse_time(t_str: str) -> time:
    h, m, s = t_str.split(":")
    return time(int(h), int(m), int(s))


def check_auspicious_time(day_of_week_th: str, t: time) -> dict:
    for row in UBAKONG_TABLE:
        if row["day_of_week"] != day_of_week_th:
            continue
        start = _parse_time(row["time_start"])
        end = _parse_time(row["time_end"])
        if start <= t <= end:
            return {
                "day": day_of_week_th, "time": t.strftime("%H:%M"),
                "yam_name": row["yam_name"], "meaning": row["meaning"],
                "verdict": row["prediction_status"], "score": row["score"], "found": True,
            }
    return {
        "day": day_of_week_th, "time": t.strftime("%H:%M"), "found": False,
        "note": "เวลานี้อยู่นอกช่วงยามกลางวัน (06:01-18:00) — ยามกลางคืนยังไม่มีข้อมูลในตารางต้นฉบับ",
    }


def best_time_today(day_of_week_th: str) -> dict:
    todays = [r for r in UBAKONG_TABLE if r["day_of_week"] == day_of_week_th]
    best = max(todays, key=lambda r: r["score"])
    worst = min(todays, key=lambda r: r["score"])
    return {
        "day": day_of_week_th,
        "best": {"time_range": f"{best['time_start'][:5]}-{best['time_end'][:5]}",
                  "yam_name": best["yam_name"], "meaning": best["meaning"], "score": best["score"]},
        "worst": {"time_range": f"{worst['time_start'][:5]}-{worst['time_end'][:5]}",
                   "yam_name": worst["yam_name"], "meaning": worst["meaning"], "score": worst["score"]},
    }


if __name__ == "__main__":
    print("=" * 70)
    print("TEST — Check specific times against the real Ubakong table")
    print("=" * 70)
    tests = [("จันทร์", time(7, 0)), ("อาทิตย์", time(16, 0)), ("เสาร์", time(9, 0)), ("พุธ", time(20, 0))]
    for day, t in tests:
        r = check_auspicious_time(day, t)
        print(f"  {day} {t.strftime('%H:%M')} -> {json.dumps(r, ensure_ascii=False)}")

    r0 = check_auspicious_time("อาทิตย์", time(7, 0))
    assert r0["yam_name"] == "ยามศูนย์" and r0["score"] == 0 and r0["verdict"] == "ร้าย"

    print()
    print("=" * 70)
    print("TEST — Best/worst time of day")
    print("=" * 70)
    r = best_time_today("จันทร์")
    print(json.dumps(r, ensure_ascii=False, indent=2))
    assert r["best"]["yam_name"] == "ยามสี่"

    print()
    print("✅ Logic 3 (daytime Ubakong) now fully functional with real verified data.")
    print("⚠️  Nighttime yam (18:01-06:00) and Flying Stars still not implemented.")
