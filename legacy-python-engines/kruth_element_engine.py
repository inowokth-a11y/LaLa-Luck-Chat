"""
KRUTH Element Engine
=====================
Reference implementation of "KRUTH ธาตุ — Element System Calculation & Scoring Manual"
(KRUTH APEX / Di Vi Jitr, May 2026)

This module implements ONLY Platform E (KRUTH ELEMENT) equations 1-5.
Platform D (KRUTH MIND) pDCR inference from Big Five is a SEPARATE, already-built
pipeline (lives in the DEMM assessment scoring code) and is intentionally NOT
reimplemented here — this engine only consumes it as an optional bridge input.

-----------------------------------------------------------------------------
IMPORTANT NAMING CONVENTION (resolves a naming collision found in the source
documents, where the Thai word "ลม" is used for two different things):

    - Element Seed (equation 1) operates on a 4-BUCKET system:
          ไฟ (Fire) / ดิน (Earth) / ลม (Wood!) / น้ำ (Water)
      Per source doc section 5.1/5.2/5.4, "ลม" here is short for "ลม(ไม้)" i.e.
      Wood in the Chinese five-element sense, and "ดิน" absorbs Metal (ทอง) too.
      This is Platform E's simplified display bucket set — confirmed by section
      5.4's numerology table, which has only 4 columns (no separate ทอง/Metal).

    - Wu Xing Score (equations 2-3) operates on the FULL 5-ELEMENT Chinese cycle:
          ไม้ (Wood) → ไฟ (Fire) → ดิน (Earth) → ทอง (Metal) → น้ำ (Water) → ไม้
      Used for entity-to-entity compatibility (person/object/color/place/etc),
      NOT for the personal Element Seed.

    Internally we always use English keys (Fire/Earth/Wood/Metal/Water) to avoid
    ambiguity, and only map to Thai display labels at the output boundary.
-----------------------------------------------------------------------------
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import date

# ---------------------------------------------------------------------------
# Shared element vocabulary
# ---------------------------------------------------------------------------

Element5 = Literal["Wood", "Fire", "Earth", "Metal", "Water"]
Element4 = Literal["Fire", "Earth", "Wood", "Water"]  # Wood == "ลม" per doc convention

THAI_LABEL_5 = {"Wood": "ไม้", "Fire": "ไฟ", "Earth": "ดิน", "Metal": "ทอง", "Water": "น้ำ"}
THAI_LABEL_4 = {"Fire": "ไฟ", "Earth": "ดิน", "Wood": "ลม", "Water": "น้ำ"}

# Generating cycle order (5-element), used for Wu Xing Score
GENERATING_CYCLE = ["Wood", "Fire", "Earth", "Metal", "Water"]


def fold_5_to_4(el5: Element5) -> Element4:
    """Fold the 5-element Chinese system down to Platform E's 4-bucket display,
    per the document's own convention: Wood -> 'ลม' bucket, Metal -> 'ดิน' bucket.
    """
    if el5 == "Metal":
        return "Earth"
    return el5  # Wood, Fire, Earth, Water map 1:1


# ---------------------------------------------------------------------------
# EQUATION 1 — Element Seed (ธาตุกำเนิด, 5-source voting -> 4-bucket)
# ---------------------------------------------------------------------------

@dataclass
class ElementSeedInputs:
    day_of_week: str          # 'จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'
    birth_month: int          # 1-12
    birth_year_ad: int        # e.g. 1986
    zodiac_year_animal: str   # 'ชวด','ฉลู','ขาล','เถาะ','มะโรง','มะเส็ง','มะเมีย','มะแม','วอก','ระกา','จอ','กุน'
    birth_day: Optional[int] = None        # 1-31 (ไม่บังคับ — ใช้ตัดสินขอบเขตลี่ชุนเมื่อเกิดเดือน ก.พ.)
    name_wood_pct: Optional[float] = None  # % Wood-equivalent from Kangxi stroke analysis (0-100)
    # ^ Source 5 requires a Kangxi (Chinese stroke count) parser + Unihan database,
    #   which is a separate component (see Logic 2 "Unihan Parser"). Not implemented
    #   here. Caller should supply name_wood_pct if that pipeline is available;
    #   otherwise source 5 is skipped (documented, not silently guessed).


# ✅ แก้ตามเอกสารต้นฉบับ KRUTH_ELEMENT_Platform_E_v1.docx:
#    "อังคาร/อาทิตย์=ไฟ | จันทร์/ศุกร์=น้ำ | พุธ/เสาร์=ดิน | พฤหัส=ลม"
# เดิมตารางนี้ผิด 2 จุด (พบตอนตรวจข้อมูลผู้ใช้จริง ก.ค. 2569):
#   1) "พุธ" ถูกใส่เป็น Wood(ลม) — ที่ถูกคือ Earth(ดิน)
#   2) "พฤหัสบดี" หายไปทั้งวัน — ที่ถูกคือ Wood(ลม)  ← ผู้ใช้เกิดวันนี้ถูกข้าม Source 1 เงียบๆ
# ตรวจแล้วว่าเอกสารต้นทางมีตารางนี้แหล่งเดียว ไม่มีฉบับใดขัดแย้ง
DAY_ELEMENT = {
    "อังคาร": "Fire", "อาทิตย์": "Fire",
    "จันทร์": "Water", "ศุกร์": "Water",
    "พุธ": "Earth", "เสาร์": "Earth",
    "พฤหัสบดี": "Wood",   # แสดงผลเป็น "ลม"
}

THAI_MONTH_ELEMENT = {
    **{m: "Fire" for m in (1, 2, 3)},
    **{m: "Wood" for m in (4, 5, 6)},   # "ลม"
    **{m: "Water" for m in (7, 8, 9)},
    **{m: "Earth" for m in (10, 11, 12)},
}

ZODIAC_ELEMENT = {
    "จอ": "Earth", "ฉลู": "Earth", "มะโรง": "Earth", "มะแม": "Earth", "วอก": "Earth", "ระกา": "Earth",
    "ชวด": "Water", "กุน": "Water",
    "ขาล": "Wood", "เถาะ": "Wood",  # "ลม"
    "มะเส็ง": "Fire", "มะเมีย": "Fire",
}


def lichun_day_of_february(year_ad: int) -> int:
    """วัน 'ลี่ชุน' (立春) ของปีนั้น = วันที่ดวงอาทิตย์ถึงลองจิจูดสุริยวิถี 315° (ตกวันที่ 3-5 ก.พ. เสมอ)
    คำนวณจากสูตรดวงอาทิตย์ที่ใช้อยู่แล้วใน suriyayart_lagna_engine — ไม่ต้องมีตาราง lookup"""
    from datetime import datetime as _dt
    from suriyayart_lagna_engine import solar_ecliptic_longitude, julian_day
    for d in range(1, 11):
        if solar_ecliptic_longitude(julian_day(_dt(year_ad, 2, d, 12, 0, 0))) >= 315:
            return d
    return 4  # fallback (ไม่ควรเกิดขึ้น)


def chinese_wuxing_by_year_end_digit(year_ad: int, birth_month: int = None,
                                       birth_day: int = None) -> Element5:
    """Source 3: เบญจธาตุจีนตามเลขท้ายปี (5 ธาตุเต็ม, fold เหลือ 4 ตอนใช้ใน Element Seed)

    ⚠️ ส่วนขยายที่ 'ต่างจากสเปกเดิม' — อ่านก่อนแก้:
    เอกสาร KRUTH_ELEMENT_Platform_E_v1.docx เขียนแค่ "ตามเลขท้ายปี" เฉยๆ ไม่ได้ระบุขอบเขตปี
    แต่ปีจีนไม่ได้เริ่ม 1 ม.ค. — ระบบธาตุตามเลขท้ายปีนี้คือ 'ทศกัณฑ์ฟ้า' (Heavenly Stem)
    ซึ่งตามหลักโหราศาสตร์จีน (BaZi) ปีเปลี่ยนที่ 'ลี่ชุน' (立春, 3-5 ก.พ.) ไม่ใช่ 1 ม.ค.
    ตรวจกับข้อมูลผู้ใช้จริงของ Platform D 90 แถว: ทุกเคสที่ D ต่างจากสูตรเลขท้ายปีล้วน
    เป็นคนเกิดเดือน ม.ค. และใช้ธาตุของปีก่อนหน้า — ตรงกับหลักลี่ชุน 5/5 เคส

    พฤติกรรม (backward compatible):
      - ไม่ส่ง birth_month  -> ใช้สูตรเดิมตามสเปกเป๊ะ (เลขท้ายปีตรงๆ)
      - ส่ง birth_month/day -> ใช้ขอบเขตลี่ชุน (เกิดก่อนลี่ชุน = ใช้ธาตุปีก่อนหน้า)
      - ส่ง month=2 แต่ไม่ส่ง day -> คลุมเครือ (ลี่ชุนอยู่ 3-5 ก.พ.) ใช้ปีเดิมตามสเปก
    """
    effective_year = year_ad
    if birth_month is not None:
        if birth_month == 1:
            effective_year = year_ad - 1          # ทั้งเดือน ม.ค. อยู่ก่อนลี่ชุนเสมอ
        elif birth_month == 2 and birth_day is not None:
            if birth_day < lichun_day_of_february(year_ad):
                effective_year = year_ad - 1

    d = effective_year % 10
    if d in (6, 7):
        return "Fire"
    if d in (8, 9):
        return "Earth"
    if d in (4, 5):
        return "Wood"
    if d in (2, 3):
        return "Water"
    return "Metal"  # 0, 1


def calculate_element_seed(inp: ElementSeedInputs) -> dict:
    """Equation 1: Element Seed — 5 sources, +1 each, dominant = highest, missing = 0."""
    scores = {"Fire": 0, "Earth": 0, "Wood": 0, "Water": 0}
    sources_used = []

    # Source 1: day of week
    el = DAY_ELEMENT.get(inp.day_of_week)
    if el:
        scores[el] += 1
        sources_used.append(("day_of_week", inp.day_of_week, el))

    # Source 2: Thai month element
    el = THAI_MONTH_ELEMENT.get(inp.birth_month)
    if el:
        scores[el] += 1
        sources_used.append(("birth_month", inp.birth_month, el))

    # Source 3: Chinese Wu-Xing by year-end digit (folded 5->4)
    # ส่ง month/day ไปด้วยเพื่อใช้ขอบเขตลี่ชุน (คนเกิดต้นปีก่อน 3-5 ก.พ. ใช้ธาตุปีก่อนหน้า)
    el5 = chinese_wuxing_by_year_end_digit(inp.birth_year_ad, inp.birth_month, inp.birth_day)
    el4 = fold_5_to_4(el5)
    scores[el4] += 1
    sources_used.append(("year_end_digit", inp.birth_year_ad, f"{el5} -> folded {el4}"))

    # Source 4: zodiac year animal
    el = ZODIAC_ELEMENT.get(inp.zodiac_year_animal)
    if el:
        scores[el] += 1
        sources_used.append(("zodiac_year", inp.zodiac_year_animal, el))

    # Source 5: name Kangxi-derived Wood% (if provided)
    if inp.name_wood_pct is not None:
        # Simplification: treat name as contributing to whichever element crosses 50%.
        # A full implementation needs per-element % from the Kangxi/Unihan parser;
        # this engine only receives a placeholder single Wood% today.
        dominant_name_el = "Wood" if inp.name_wood_pct >= 50 else None
        if dominant_name_el:
            scores[dominant_name_el] += 1
            sources_used.append(("name_kangxi", f"{inp.name_wood_pct}% Wood", dominant_name_el))
    else:
        sources_used.append(("name_kangxi", "NOT PROVIDED", "skipped — needs Unihan Parser integration"))

    dominant = max(scores, key=scores.get)
    missing = [e for e, v in scores.items() if v == 0]

    return {
        "scores": scores,
        "scores_th": {THAI_LABEL_4[k]: v for k, v in scores.items()},
        "dominant": dominant,
        "dominant_th": THAI_LABEL_4[dominant],
        "missing": missing,
        "missing_th": [THAI_LABEL_4[e] for e in missing],
        "sources_used": sources_used,
    }


# ---------------------------------------------------------------------------
# EQUATION 2 & 3 — Wu Xing Score + Productive Clash (full 5-element cycle)
# ---------------------------------------------------------------------------

def _cycle_distance(a: Element5, b: Element5) -> int:
    ia, ib = GENERATING_CYCLE.index(a), GENERATING_CYCLE.index(b)
    return (ib - ia) % 5


def wu_xing_score(user_element: Element5, object_element: Element5,
                   user_missing_elements: Optional[list] = None) -> dict:
    """
    Equation 2 (relationship score) + Equation 3 (Productive Clash override).

    Score meanings (from A=user_element's perspective):
        +2  B generates A            (印 บำรุงเรา — ดีที่สุด)
        +1  same element (กลมกลืน) / A generates B (ดีแบบผู้ให้ อาจเหนื่อย)
        -2  overcoming either way    (พิฆาต)
         0  no direct relation (not applicable in a full 5-cycle — every pair
             has a defined generating/overcoming relation)

    2026-07-30 — ทิศแกน "ให้กำเนิด" ถูกแก้โดยเจตนา (ต่างจาก Calculation Manual สมการ 2):
    ต้นฉบับให้ A-generates-B = +2 และ B-generates-A = -1 ("B ดูดพลังจาก A") ซึ่งกลับด้าน
    กับหลักเบญจธาตุ (木生火 = ไม้บำรุงไฟ ต้องเป็นคุณกับ A) และป้ายขัดแย้งกับตัวเอง
    ผู้ใช้เลือกทาง "ค": B-generates-A = +2 (印 บำรุง) · A-generates-B = +1 (ผู้ให้ —
    ไม่ให้ -1 ตามตำรา 泄 เพราะระบบไม่ได้คำนวณกำลังวันเกิด (身強/身弱) จึงไม่เคลมเกินข้อมูล)

    Equation 3 Productive Clash: if the raw relationship is -2 (overcome) AND
    object_element is one of the user's missing elements, flip the score to +2
    ("ธาตุที่ขาดกลายเป็นยา แทนที่จะเป็นพิษ").
    """
    if user_missing_elements is None:
        user_missing_elements = []

    if user_element == object_element:
        raw_score, relation = 1, "ธาตุเดียวกัน (กลมกลืน)"
    else:
        dist = _cycle_distance(user_element, object_element)
        if dist == 1:
            raw_score, relation = 1, f"{THAI_LABEL_5[user_element]} ให้กำเนิด {THAI_LABEL_5[object_element]} (ดีแบบผู้ให้ — เราเป็นฝ่ายส่งพลัง อาจเหนื่อย)"
        elif dist == 4:
            raw_score, relation = 2, f"{THAI_LABEL_5[object_element]} ให้กำเนิด {THAI_LABEL_5[user_element]} (★บำรุงเรา ดีที่สุด★)"
        elif dist == 2:
            raw_score, relation = -2, f"{THAI_LABEL_5[user_element]} พิฆาต {THAI_LABEL_5[object_element]} (⚠️พิฆาต)"
        elif dist == 3:
            raw_score, relation = -2, f"{THAI_LABEL_5[object_element]} พิฆาต {THAI_LABEL_5[user_element]} ย้อนกลับ (⚠️พิฆาต)"
        else:
            raw_score, relation = 0, "กลาง"

    final_score = raw_score
    productive_clash = False
    if raw_score == -2 and object_element in user_missing_elements:
        final_score = 2
        productive_clash = True
        relation += " → ⚡ Productive Clash: ธาตุที่ขาดกลายเป็นยา แทนที่จะเป็นพิษ!"

    return {
        "user_element": user_element,
        "object_element": object_element,
        "raw_score": raw_score,
        "final_score": final_score,
        "productive_clash": productive_clash,
        "relation_th": relation,
    }


# ---------------------------------------------------------------------------
# EQUATION 4 — Friction Score (L1 day element vs L3 Big Five, clinically validated n=42)
# ---------------------------------------------------------------------------

def friction_score(day_element_th: str, big_five_E: float, big_five_N: float,
                    pdcr_wind: Optional[float] = None) -> float:
    """
    Equation 4: Friction between day_element (L1, fixed at birth) and the
    person's actual measured Big Five personality (L3).
    Validated: high friction correlates with Fog Flag at 3x the base rate
    (25% vs 8%, n=42) — this is Platform D<->E's statistically significant bridge.
    """
    friction = 0.0

    if day_element_th == "ไฟ":
        if big_five_E < 2.5:
            friction = 3  # ไฟถูกกดทับ
        elif big_five_E < 3.0:
            friction = 2
    elif day_element_th == "ดิน":
        if big_five_E < 2.5:
            friction = 0  # ดินเก็บตัวตามธรรมชาติ — no friction, this is congruent
    elif day_element_th == "ลม":
        if pdcr_wind is not None and pdcr_wind >= 6:
            friction = 2  # ลมฟุ้ง

    if big_five_N >= 3.5:
        friction += 1.5
    elif big_five_N >= 3.0:
        friction += 0.5

    return friction


# ---------------------------------------------------------------------------
# EQUATION 5 — TTM Lifestyle lookup (missing element -> remedy)
# ---------------------------------------------------------------------------

TTM_LIFESTYLE = {
    "Fire": {
        "taste": "เผ็ด ร้อน",
        "food": ["ขิง", "พริกไทย", "กระเทียม", "ต้มยำ"],
        "activity": ["วิ่ง", "เต้น"],
        "color": ["แดง", "ส้ม", "เหลือง"],
    },
    "Earth": {
        "taste": "หวาน มัน",
        "food": ["ฟักทอง", "กล้วย", "ข้าวต้ม"],
        "activity": ["ซุปข้น", "โยคะ", "สมาธิ"],
        "color": ["เหลือง", "น้ำตาล", "ครีม"],
    },
    "Wood": {  # "ลม" bucket
        "taste": "เปรี้ยว",
        "food": ["มะนาว", "ส้ม", "ผักสด", "สับปะรด"],
        "activity": ["ท่องเที่ยว", "ปั่นจักรยาน"],
        "color": ["เขียว", "ฟ้าอ่อน", "ขาว"],
    },
    "Water": {
        "taste": "เค็ม อ่อน",
        "food": ["น้ำมะพร้าว", "บัวบก", "แตงกวา", "ซุปใส"],
        "activity": ["ว่ายน้ำ", "สมาธิ"],
        "color": ["ฟ้า", "น้ำเงิน", "ดำ"],
    },
}


def ttm_remedy_for_missing(missing_elements: list) -> dict:
    """
    จุดเรียกเดียว (single entry point) สำหรับคำแนะนำธาตุขาด — รวม TTM_LIFESTYLE
    เดิม (รส/อาหาร/สี) เข้ากับ wellness_activity_engine (เทคนิคหายใจ/สมาธิ/
    กิจกรรมภายนอกที่มีงานวิจัยรองรับ) เป็นระบบเดียว ไม่ต้องรู้จักสองไฟล์แยกกันอีกต่อไป
    """
    from wellness_activity_engine import get_wellness_pair
    result = {}
    for e in missing_elements:
        if e not in TTM_LIFESTYLE:
            continue
        label = THAI_LABEL_4[e]
        result[label] = {
            **TTM_LIFESTYLE[e],
            "wellness_practice": get_wellness_pair(e),  # internal+external+combo_routine+research
        }
    return result


# ---------------------------------------------------------------------------
# Personal Year Guidance — Logic 1 CASE 1 "คำแนะนำรายปี(ปีจร)" lookup
# ใช้ข้อมูลจริงจาก Personal_Year_Guidance.xlsx (12 rows: 1-9 + Master Number 11,22,33)
# ที่อ้างถึงมาตั้งแต่ Prompt_Lala_Lucky (CASE 1) แต่ไม่เคยโหลดใช้จริงจนตอนนี้
# ---------------------------------------------------------------------------

import json as _json

with open("personal_year_guidance.json", encoding="utf-8") as _f:
    PERSONAL_YEAR_TABLE = {row["personal_year_number"]: row for row in _json.load(_f)}


def calculate_personal_year(birth_day: int, birth_month: int, current_year: int) -> int:
    """Personal Year = digit-sum(birth_day + birth_month + current_year), stop at
    single digit unless it lands on a Master Number (11/22/33) — same reduction
    convention used throughout this project (BirthPower/NamePower)."""
    total = birth_day + birth_month + current_year
    total = sum(int(d) for d in str(total))
    while total > 9 and total not in (11, 22, 33):
        total = sum(int(d) for d in str(total))
    return total


def get_personal_year_guidance(personal_year_number: int) -> dict:
    row = PERSONAL_YEAR_TABLE.get(personal_year_number)
    if not row:
        return {"error": f"ไม่พบข้อมูลปีจร {personal_year_number} ในตาราง (มีแค่ 1-9, 11, 22, 33)"}
    return row


# ---------------------------------------------------------------------------
# SAFETY GATE — ported from KRUTH Chatbot Detection Logic Manual (Platform D,
# cla-chatbot.ts §8.1). Platform D already runs this before every message;
# Platform E's free-text entry points (dream interpretation, oracle draw
# question field) did NOT have this check — this closes that gap.
#
# Principle preserved exactly: crisis check runs FIRST, before any other
# processing, with no exceptions. No caching of crisis-adjacent responses.
# ---------------------------------------------------------------------------

CRISIS_KEYWORDS = [
    "อยากตาย", "ฆ่าตัวตาย", "ทนไม่ไหว", "สิ้นหวัง", "หมดหวังแล้ว",
    "อยากหายไป", "ไม่อยากมีชีวิตอยู่", "ทำร้ายตัวเอง", "ไม่อยากอยู่แล้ว",
]

CRISIS_RESOURCE_MESSAGE = (
    "หากคุณกำลังรู้สึกทุกข์ใจมากๆ หรือมีความคิดทำร้ายตัวเอง อยากให้คุณลองติดต่อ "
    "สายด่วนสุขภาพจิต 1323 (โทรฟรี ตลอด 24 ชม.) หรือสมาคมสะมาริตันส์แห่งประเทศไทย "
    "02-713-6791 นะคะ มีคนพร้อมรับฟังคุณอยู่เสมอ 💛 "
    "อาจารย์ลาลาขอหยุดการทำนายไว้ก่อน เพราะอยากให้คุณได้รับความช่วยเหลือที่เหมาะสมกว่านี้"
)


def safety_gate(message: str) -> dict | None:
    """
    Call this FIRST, before any other Logic 4 / Logic 21 processing.
    Returns an intercept dict if a crisis signal is detected (caller MUST
    stop all further processing and show crisis_resource_message instead),
    or None if safe to proceed normally.
    """
    if any(k in message for k in CRISIS_KEYWORDS):
        return {
            "intercepted": True,
            "matched_keywords": [k for k in CRISIS_KEYWORDS if k in message],
            "crisis_resource_message": CRISIS_RESOURCE_MESSAGE,
        }
    return None


# ---------------------------------------------------------------------------
# DEVIATION ENGINE — generalized from KRUTH Chatbot Detection Logic Manual
# (cla-scoring.ts §5.3 calcDeviations). Domain-agnostic: compares any two
# {dimension: score} dicts on the same 0-3 scale and flags meaningful gaps.
#
# Replaces the ad-hoc if/else narrative logic used earlier for comparing
# Track A (numerology) vs Track B (Suriyayart) vs pDCR (Bridge) — same
# threshold (0.5) and magnitude-sort convention as the source system.
# ---------------------------------------------------------------------------

def normalize_to_0_3(value: float, max_value: float) -> float:
    """Scale an arbitrary count/percentage onto the 0-3 convention used
    throughout the deviation engine, so different-scale sources become
    comparable (e.g. Element Seed counts out of 5, pDCR counts out of 12)."""
    if max_value <= 0:
        return 1.5  # neutral default, same convention as the source system
    return round((value / max_value) * 3, 2)


def calc_deviation(dims_expected: dict, dims_actual: dict, threshold: float = 0.5) -> list:
    """
    dims_expected / dims_actual: {dimension_name: score_0_to_3}
    Returns deviations sorted by |gap| descending, only where |gap| >= threshold.
    Missing actual dims default to 1.5 (neutral), matching the source
    system's convention for "no data yet" (prevents false-negative bias).
    """
    deviations = []
    for dim, expected in dims_expected.items():
        actual = dims_actual.get(dim, 1.5)
        gap = actual - expected
        if abs(gap) >= threshold:
            deviations.append({
                "dimension": dim, "expected": expected, "actual": actual, "gap": round(gap, 2),
                "meaning": f"{dim}: สูงกว่าที่คาด" if gap > 0 else f"{dim}: ต่ำกว่าที่คาด",
            })
    return sorted(deviations, key=lambda d: abs(d["gap"]), reverse=True)


# ---------------------------------------------------------------------------
# Self-test against the document's own worked example
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    print("=" * 70)
    print("TEST 1 — Element Seed mechanics check (structure, not exact person)")
    print("=" * 70)
    # Example inputs chosen only to exercise all branches — NOT the real
    # "วุฒิ์ธีระ" birth data (we don't have it), just verifying the mechanism
    # produces a coherent {dominant, missing} pair summing to 5 across sources.
    test_input = ElementSeedInputs(
        day_of_week="อังคาร",       # -> Fire
        birth_month=2,                # Jan-Mar -> Fire
        birth_year_ad=1986,           # ends in 6 -> Fire (per year-end table)
        zodiac_year_animal="ขาล",    # -> Wood
        name_wood_pct=None,           # skipped, no Kangxi parser wired up yet
    )
    result = calculate_element_seed(test_input)
    print(json.dumps({
        "scores_th": result["scores_th"],
        "dominant_th": result["dominant_th"],
        "missing_th": result["missing_th"],
        "sources_used": result["sources_used"],
    }, ensure_ascii=False, indent=2))
    assert sum(result["scores"].values()) <= 5, "no more than 5 points should be allocated"

    print()
    print("=" * 70)
    print("TEST 2 — Wu Xing Score + Productive Clash")
    print("=" * 70)
    # Standard case: Water overcomes Fire (should be -2)
    r1 = wu_xing_score("Fire", "Water", user_missing_elements=[])
    print(json.dumps(r1, ensure_ascii=False, indent=2))
    assert r1["final_score"] == -2 and not r1["productive_clash"]

    # Productive Clash case: same pair, but user is missing Water
    r2 = wu_xing_score("Fire", "Water", user_missing_elements=["Water"])
    print(json.dumps(r2, ensure_ascii=False, indent=2))
    assert r2["final_score"] == 2 and r2["productive_clash"]

    # Generating case: Wood generates Fire (+2)
    # ทาง "ค" (2026-07-30): เราให้กำเนิดเขา = +1 (ผู้ให้) · เขาให้กำเนิดเรา = +2 (บำรุง)
    r3 = wu_xing_score("Wood", "Fire")
    print(json.dumps(r3, ensure_ascii=False, indent=2))
    assert r3["final_score"] == 1
    r3b = wu_xing_score("Fire", "Wood")
    assert r3b["final_score"] == 2

    print()
    print("=" * 70)
    print("TEST 3 — Friction Score")
    print("=" * 70)
    f1 = friction_score("ไฟ", big_five_E=2.0, big_five_N=3.6)
    print("Fire day + low E + high N ->", f1, "(expect 3 + 1.5 = 4.5)")
    assert f1 == 4.5

    print()
    print("=" * 70)
    print("TEST 4 — TTM remedy lookup")
    print("=" * 70)
    remedy = ttm_remedy_for_missing(["Water", "Wood"])
    print(json.dumps(remedy, ensure_ascii=False, indent=2))

    print()
    print("✅ All structural self-tests passed.")

    print()
    print("=" * 70)
    print("TEST 5 — Safety Gate")
    print("=" * 70)
    safe_msg = safety_gate("ฝันเห็นแม่มายืนหน้าบ้าน")
    print("Normal message ->", safe_msg)
    assert safe_msg is None

    crisis_msg = safety_gate("ช่วงนี้ทนไม่ไหวแล้ว อยากตายจัง")
    print("Crisis message ->", json.dumps(crisis_msg, ensure_ascii=False, indent=2))
    assert crisis_msg is not None and crisis_msg["intercepted"]
    print("✅ Safety Gate correctly distinguishes normal vs crisis messages.")

    print()
    print("=" * 70)
    print("TEST 6 — Deviation Engine (generalized calcDeviations)")
    print("=" * 70)
    # Example: Track A (numerology, normalized) vs Track B (Suriyayart %, normalized)
    track_a = {"Fire": normalize_to_0_3(3, 5), "Earth": normalize_to_0_3(2, 5), "Wood": 0.0, "Water": 0.0}
    track_b = {"Fire": normalize_to_0_3(45, 100), "Earth": normalize_to_0_3(10, 100),
               "Wood": normalize_to_0_3(30, 100), "Water": normalize_to_0_3(15, 100)}
    devs = calc_deviation(track_a, track_b)
    print(json.dumps(devs, ensure_ascii=False, indent=2))
    assert len(devs) > 0, "expected at least one meaningful deviation in this constructed example"
    print("✅ Deviation Engine flags meaningful gaps, sorted by magnitude.")

    print()
    print("=" * 70)
    print("TEST 7 — Personal Year Guidance (real data, was placeholder-referenced only)")
    print("=" * 70)
    py = calculate_personal_year(birth_day=15, birth_month=8, current_year=2026)
    print("Personal Year for 15 Aug, current year 2026:", py)
    guidance = get_personal_year_guidance(py)
    print(json.dumps(guidance, ensure_ascii=False, indent=2))
    assert "error" not in guidance
    print("✅ Personal Year Guidance lookup working with real 12-row table.")

    print()
    print("=" * 70)
    print("TEST 8 — ttm_remedy_for_missing() now unified with wellness_activity_engine")
    print("=" * 70)
    remedy = ttm_remedy_for_missing(["Fire"])
    assert "wellness_practice" in remedy["ไฟ"], "wellness_practice should be merged in"
    assert "internal" in remedy["ไฟ"]["wellness_practice"]
    print("✅ Single entry point confirmed — no need to import wellness_activity_engine separately.")
