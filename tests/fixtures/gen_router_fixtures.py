#!/usr/bin/env python3
"""สร้าง golden fixtures จาก router_engine.py (Logic 0) สำหรับ parity test ฝั่ง TS
รัน: python3 tests/fixtures/gen_router_fixtures.py
ผลลัพธ์: tests/fixtures/router.fixture.json

หลักการ (CLAUDE.md §6): TS ต้องคืนค่าตรงเป๊ะกับ Python ไม่ใช่แค่ "ดูสมเหตุสมผล"
สิ่งที่ต้องล็อกไว้เป็นพิเศษของ Router คือ **ลำดับการ match keyword** — ข้อความหนึ่ง
อาจโดนหลาย Logic ตัวที่ประกาศก่อนต้องชนะ ทั้งสองภาษา
"""
import os
import sys
import json
import types

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE_DIR = os.path.join(ROOT, "legacy-python-engines")
sys.path.insert(0, ENGINE_DIR)
os.chdir(os.path.join(ROOT, "data"))


def load_engine(name):
    """เหมือน gen_element_fixtures.py — prepend __future__ ให้ syntax 3.10+ รันบน 3.9 ได้"""
    path = os.path.join(ENGINE_DIR, name + ".py")
    with open(path, encoding="utf-8") as fh:
        src = "from __future__ import annotations\n" + fh.read()
    mod = types.ModuleType(name)
    mod.__file__ = path
    sys.modules[name] = mod
    exec(compile(src, path, "exec"), mod.__dict__)
    return mod


load_engine("wellness_activity_engine")
load_engine("suriyayart_lagna_engine")
load_engine("kruth_element_engine")  # router import safety_gate จากตัวนี้
R = load_engine("router_engine")

# ข้อความทดสอบ — ครอบทั้ง 3 ชั้น + เคสลำดับซ้อนทับ
CASES = [
    # ชั้น 1: Safety Gate ต้องชนะทุกอย่าง แม้มี keyword ของ Logic อื่นปนอยู่
    "ช่วงนี้ทนไม่ไหวแล้ว อยากตาย",
    "เมื่อคืนฝันแล้วตื่นมาอยากฆ่าตัวตาย",  # มี "ฝัน" (Logic 4) แต่ safety ต้องมาก่อน
    # ชั้น 2: keyword ตรงไปตรงมา ครบทุก Logic ที่มีใน map
    "เมื่อคืนฝันเห็นงู หมายความว่าอะไร",
    "อยากรู้ดวงวันนี้หน่อย",
    "ดวงเดือนนี้เป็นยังไงบ้าง",
    "ดวงปีนี้ดีไหม",
    "อยากตั้งชื่อบริษัทใหม่",
    "เบอร์โทร 0812345678 ดีไหม",
    "เลขทะเบียน กก 1234 ดีไหม",
    "คนนี้เข้ากับบ้านฉันไหม",
    "ขอเลขเสี่ยงทายหน่อย",
    "อยากรู้รหัสชีวิตของตัวเอง",
    "ฤกษ์ไหนดีสำหรับย้ายบ้าน",
    "วันเกิดฉันปีชงไหม",
    "กินอะไรดีให้เสริมดวง",
    "กิจกรรมเสริมดวงมีอะไรบ้าง",
    "อยากรู้เนื้อคู่",
    # เคสลำดับซ้อนทับ: มี keyword ของหลาย Logic ในประโยคเดียว
    # ⚠️ ตัวชนะคือ "Logic ที่ id น้อยกว่า" ไม่ใช่ "คำที่อยู่ซ้ายกว่าในประโยค"
    #    เพราะ map วนตามลำดับที่ประกาศ ซึ่งเรียง id จากน้อยไปมาก
    "ฝันว่าได้เบอร์โทรใหม่",        # "เบอร์โทร"(2) ชนะ "ฝัน"(4) แม้จะอยู่หลังในประโยค
    "อยากรู้ดวงวันนี้กับเนื้อคู่",   # "ดวงวันนี้"(8) ชนะ "เนื้อคู่"(17)
    "ตั้งชื่อบริษัทให้เข้ากับบ้านไหม",  # "ตั้งชื่อบริษัท"(19) ชนะ "เข้ากับบ้านไหม"(20)
    # ชั้น 3: ไม่โดน keyword เลย -> fallback
    "สวัสดีครับ",
    "วันนี้อากาศดีจัง",
    "",
]

fix = {"cases": []}
for msg in CASES:
    fix["cases"].append({"input": msg, "expected": R.route(msg)})

fix["keyword_map_order"] = [[k, v] for k, v in R.KEYWORD_MAP.items()]
fix["logic_names"] = {str(k): v for k, v in R.LOGIC_NAMES.items()}
fix["response_mode"] = {str(k): v for k, v in R.RESPONSE_MODE.items()}

out = os.path.join(ROOT, "tests", "fixtures", "router.fixture.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump(fix, fh, ensure_ascii=False, indent=2)
print(f"เขียน {out} — {len(fix['cases'])} เคส")
