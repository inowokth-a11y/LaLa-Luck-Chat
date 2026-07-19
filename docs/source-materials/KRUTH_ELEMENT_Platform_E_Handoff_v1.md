# KRUTH ELEMENT — Platform E: AI Astrology & Lifestyle Balance
## Technical Handoff Document v1.0
**สำหรับ AI ที่รับงานต่อ: อ่านทั้งหมดก่อนเริ่มทำงาน**

---

## 0. CONTEXT

Platform E คือ AI Chatbot ด้านโหราศาสตร์ไลฟ์สไตล์และสมดุลธาตุ  
พัฒนาโดย ธีระ ครุฑขุนทด (DVJ / KRUTH APEX) ต่อเนื่องจาก Platform D (KRUTH MIND)

**จุดต่างจาก Platform D:**
| | Platform D (KRUTH MIND) | Platform E (KRUTH ELEMENT) |
|--|--|--|
| ภาษา | วิทยาศาสตร์ จิตวิทยา | วัฒนธรรม ภูมิปัญญา สนุก |
| กลุ่มเป้าหมาย | องค์กร นักจิตวิทยา | คนทั่วไป คนสนใจดวง |
| Core | Big Five + VIA + Jungian | เบญจธาตุ + นักษัตร + กายจิตวิญญาณ |
| Revenue | B2B subscription | B2C freemium |
| Tone | มืออาชีพ | เป็นกันเอง ลึกลับนิดๆ แต่มีหลักการ |

**หลักการสำคัญ:** ทุกสิ่งแปลงเป็น "ธาตุ" ได้ → ใช้สมการเดียวกันเปรียบเทียบได้ทั้งหมด

**Bridge กับ Platform D:**
- ผู้ที่ทำ DEMM (Platform D) → ข้อมูล OCEAN + Element Seed ไหลมา Platform E อัตโนมัติ
- ผู้ที่ไม่ได้ทำ DEMM → Platform E มี Mini Assessment 10 ข้อแทน

---

## 1. ARCHITECTURE — 18 Logic Modules

```
User Input
    ↓
[Logic 0: Router] ← ระบุว่า user ถามเรื่องอะไร
    ↓
┌─────────────────────────────────────────┐
│  Logic 1: Personal Energy (พลังงานส่วนตัว)   │
│  Logic 2: Artifacts (สัญลักษณ์/สิ่งของ)      │
│  Logic 3: Auspicious Time (ฤกษ์ยาม)         │
│  Logic 4: Dream (ทำนายฝัน)                   │
│  Logic 5: Compatibility (คนรอบข้าง)          │
│  Logic 6: Color (สี)                          │
│  Logic 7: Feng Shui (ฮวงจุ้ย/สถานที่)         │
│  Logic 8: Daily Horoscope (ดวงรายวัน)         │
│  Logic 9: Monthly Horoscope (ดวงรายเดือน)     │
│  Logic 10: Personal Year (ดวงปีส่วนตัว)       │
│  Logic 11: Annual Prediction (คำทำนายปี)      │
│  Logic 12: Food & Health (อาหาร/สุขภาพ)       │
│  Logic 13: Name Analysis (วิเคราะห์ชื่อ)       │
│  Logic 14: Gadget & Objects (สิ่งของ/แก็ดเจ็ต) │
│  Logic 15: Career & Direction (อาชีพ/ทิศ)     │
│  Logic 16: Activity (กิจกรรม/ไลฟ์สไตล์)        │
│  Logic 17: Relationship (ความรัก/คู่)          │
│  Logic 18: Balance Report (รายงานสมดุล)       │
└─────────────────────────────────────────┘
    ↓
[AI Response Generator] ← สร้างคำตอบจาก Logic output
```

---

## 2. USER PROFILE — สิ่งที่ต้องรู้เกี่ยวกับ User

```python
class UserProfile:
    # จาก Registration
    full_name: str
    dob: date          # วันเกิด
    day_of_week: str   # วันจันทร์-อาทิตย์
    
    # คำนวณอัตโนมัติ
    birth_year_animal: str     # ปีนักษัตร (ชวด ฉลู ขาล ...)
    thai_element: str           # ธาตุไทย (ไฟ/น้ำ/ลม/ดิน ตามเดือน)
    chinese_element: str        # เบญจธาตุจีน (ไฟ/ดิน/ไม้/น้ำ/ทอง ตามปี)
    animal_element: str         # ธาตุนักษัตร
    
    # จาก Name Analysis
    name_fire_pct: int          # % ธาตุไฟในชื่อ
    name_earth_pct: int
    name_wind_pct: int
    name_water_pct: int
    
    # คำนวณสมการ
    element_seed: dict          # {"ไฟ":3,"ดิน":2,"ลม":0,"น้ำ":0}
    missing_elements: list      # ["ลม","น้ำ"]
    dominant_element: str       # "ไฟ"
    
    # จาก Numerology
    num_life: int               # เลขกำลังชีวิต 1-99
    personal_year: int          # ปีส่วนตัวปัจจุบัน
    
    # จาก Platform D (ถ้ามี)
    ocean_scores: dict          # {O,C,E,A,N}
    archetype_id: str           # Y_J-Q4-TJ
    pdcr: dict                  # {F,W,A,E} = ปัจจุบัน
    dosha: str                  # Vata/Pitta/Kapha
```

---

## 3. สมการหลัก 5 ตัว

### 3.1 Element Seed (ธาตุกำเนิด)

คำนวณธาตุพื้นฐานจาก 5 แหล่ง:

```python
def calc_element_seed(user):
    el = {"ไฟ":0, "ดิน":0, "ลม":0, "น้ำ":0}
    
    # แหล่ง 1: ธาตุวัน
    DAY_EL = {
        "อาทิตย์":"ไฟ", "อังคาร":"ไฟ",
        "จันทร์":"น้ำ", "ศุกร์":"น้ำ",
        "พุธ":"ดิน", "เสาร์":"ดิน",
        "พฤหัสบดี":"ลม"
    }
    el[DAY_EL[user.day_of_week]] += 1
    
    # แหล่ง 2: ธาตุไทย (เดือนเกิด)
    MONTH_EL = {
        (10,11,12):"ดิน", (1,2,3):"ไฟ",
        (4,5,6):"ลม", (7,8,9):"น้ำ"
    }
    el[get_month_el(user.dob.month)] += 1
    
    # แหล่ง 3: เบญจธาตุจีน (ปีเกิด)
    CN_MAP = {
        "Fire":"ไฟ", "Earth":"ดิน",
        "Wood":"ลม",  # ไม้→ลม ใน DEMM
        "Water":"น้ำ", "Metal":"ดิน"  # ทอง→ดิน
    }
    el[CN_MAP[get_chinese_element(user.dob.year)]] += 1
    
    # แหล่ง 4: ธาตุปีนักษัตร
    ANIMAL_EL = {
        "ชวด":"น้ำ","ฉลู":"ดิน","ขาล":"ลม","เถาะ":"ลม",
        "มะโรง":"ดิน","มะเส็ง":"ไฟ","มะเมีย":"ไฟ","มะแม":"ดิน",
        "วอก":"ดิน","ระกา":"ดิน","จอ":"ดิน","กุน":"น้ำ"
        # หมายเหตุ: ทอง(Metal) → ดิน | ไม้(Wood) → ลม
    }
    el[ANIMAL_EL[get_animal(user.dob.year)]] += 1
    
    # แหล่ง 5: ธาตุชื่อ (จาก Kangxi stroke analysis)
    if user.name_fire_pct > 30: el["ไฟ"] += 1
    if user.name_earth_pct > 30: el["ดิน"] += 1
    if user.name_wind_pct > 30: el["ลม"] += 1
    if user.name_water_pct > 30: el["น้ำ"] += 1
    
    return {
        "scores": el,
        "dominant": max(el, key=el.get),
        "missing": [k for k,v in el.items() if v == 0],
        "total": sum(el.values())
    }

# ตัวอย่าง: วุฒิ์ธิระ
# วันอังคาร(ไฟ) + ตุลาคม(ดิน) + ปีจอ(ดิน) + ชื่อ(ไฟ53%) = ไฟ3 ดิน2 ลม0 น้ำ0
# → Dominant=ไฟ | Missing=[ลม, น้ำ]
```

### 3.2 Wu Xing Score (เบญจธาตุปฏิสัมพันธ์)

ใช้กับทุกสิ่ง: คน รถ สี โลโก้ สถานที่ อาหาร

```python
# วัฏจักรเบญจธาตุ
GENERATION = {"ไม้":"ไฟ","ไฟ":"ดิน","ดิน":"ทอง","ทอง":"น้ำ","น้ำ":"ไม้"}
DESTRUCTION = {"ไม้":"ดิน","ดิน":"น้ำ","น้ำ":"ไฟ","ไฟ":"ทอง","ทอง":"ไม้"}

def wu_xing_score(element_a, element_b):
    """คำนวณ interaction ระหว่างธาตุ 2 ชนิด"""
    if element_a == element_b:
        return {"score": 1, "type": "กลมกลืน (Same)", "advice": "เสริมกำลังกัน"}
    if GENERATION.get(element_a) == element_b:
        return {"score": 2, "type": "ส่งเสริม (Generation)", "advice": "A หล่อเลี้ยง B"}
    if GENERATION.get(element_b) == element_a:
        return {"score": -1, "type": "สูบพลัง (Exhaustion)", "advice": "B ดูดพลัง A"}
    if DESTRUCTION.get(element_a) == element_b:
        return {"score": -2, "type": "พิฆาต (Destruction)", "advice": "A ทำลาย B"}
    if DESTRUCTION.get(element_b) == element_a:
        return {"score": -2, "type": "พิฆาต (Destruction)", "advice": "B ทำลาย A"}
    return {"score": 0, "type": "กลาง (Neutral)", "advice": "ไม่มีผลกัน"}

# THAI → WU XING mapping
THAI_TO_WUXING = {"ไฟ":"ไฟ", "ดิน":"ดิน", "ลม":"ไม้", "น้ำ":"น้ำ"}
# หมายเหตุ: "ทอง" ใช้ในเบญจธาตุจีน แต่ใน DEMM ไม่มี → map เป็น "ดิน"
```

### 3.3 Productive Clash (พิฆาตสร้างสรรค์)

```python
def productive_clash(user_seed, object_element, user_imbalance):
    """
    ถ้า Wu Xing = -2 (พิฆาต) แต่ธาตุนั้นเป็นสิ่งที่ user ขาด
    → กลายเป็น +2 (ยา/เสริมสมดุล)
    """
    wx = wu_xing_score(user_seed.dominant, object_element)
    
    if wx["score"] == -2:
        # ตรวจว่า object_element อยู่ใน missing elements ของ user ไหม
        if object_element in user_seed.missing:
            return {
                "score": 2,
                "type": "Productive Clash ✨",
                "reason": f"แม้ {object_element} จะพิฆาต {user_seed.dominant} "
                          f"แต่คุณขาด {object_element} → กลายเป็นยา!"
            }
    
    return wx

# ตัวอย่าง: วุฒิ์ธิระ (ไฟ dominant, ขาดน้ำ)
# รถสีดำ(น้ำ) × วุฒิ์ธิระ(ไฟ)
# Wu Xing: น้ำ × ไฟ = -2 (น้ำดับไฟ)
# แต่ขาดน้ำ → Productive Clash → +2! (น้ำเติมเต็มสิ่งขาด)
```

### 3.4 Friction Score (แรงเสียดทาน)

```python
def calc_friction(user):
    """
    แรงเสียดทานระหว่างธาตุแก่นแท้ (L1) กับพฤติกรรมปัจจุบัน (L3)
    ยืนยันจาก n=42: Friction สูง → Fog Flag 3 เท่า
    """
    friction = 0
    day_el = user.day_element
    E = user.ocean_scores.get("E", 2.5) if user.ocean_scores else 2.5
    N = user.ocean_scores.get("N", 2.5) if user.ocean_scores else 2.5
    pdcr_w = user.pdcr.get("W", 5) if user.pdcr else 5
    
    # คนวันไฟ (อังคาร/อาทิตย์) แต่ E ต่ำ = "ไฟที่ถูกกดทับ"
    if day_el == "ไฟ" and E < 2.5: friction = 3
    elif day_el == "ไฟ" and E < 3.0: friction = 2
    
    # คนวันดิน (พุธ/เสาร์) E ต่ำ = ไม่เสียดทาน (ดินเก็บตัวตามธรรมชาติ)
    elif day_el == "ดิน" and E < 2.5: friction = 0  # ✅ validated n=8/8
    
    # คนวันลม (พฤหัส) + ลมกำเริบ = "คิดฟุ้งซ่าน"
    elif day_el == "ลม" and pdcr_w >= 6: friction = 2
    
    # N สูง เพิ่ม friction เสมอ
    if N >= 3.5: friction += 1.5
    elif N >= 3.0: friction += 0.5
    
    level = "🔴" if friction >= 3 else "🟡" if friction >= 2 else "🟢"
    return {"score": friction, "level": level}
```

### 3.5 TTM Lifestyle (แพทย์แผนไทย รสยา↔ธาตุ)

```python
# รสยา → ธาตุ (แพทย์แผนไทย)
TASTE_ELEMENT = {
    "ขม": "ไฟ",    # ลดไฟ (bitter reduces fire)
    "เปรี้ยว": "ลม",  # เพิ่มลม
    "เค็ม": "น้ำ",   # เพิ่มน้ำ
    "หวาน": "ดิน",   # เพิ่มดิน
    "ฝาด": "ดิน",    # เพิ่มดิน
    "เผ็ด": "ไฟ",    # เพิ่มไฟ
    "มัน": "ดิน",    # เพิ่มดิน
}

def ttm_prescribe(user_seed, current_imbalance=""):
    """
    คำแนะนำอาหาร/กิจกรรม/สี ตามธาตุที่ขาดหรือกำเริบ
    """
    prescriptions = {}
    
    for missing_el in user_seed.missing:
        el = missing_el
        if el == "ไฟ":
            prescriptions[el] = {
                "food": ["ขิง","พริกไทย","กระเทียม","ต้มยำ","ของเผ็ดอ่อน"],
                "activity": ["วิ่ง","ออกกำลังกาย","เต้น","ร้องเพลง","Muay Thai"],
                "color": ["แดง","ส้ม","เหลือง"],
                "direction": "ใต้",
                "avoid": ["ของเย็น","น้ำแข็ง","สิ่งแวดล้อมหนาว"],
            }
        elif el == "ดิน":
            prescriptions[el] = {
                "food": ["ข้าวต้ม","ซุปข้น","ฟักทอง","กล้วย","ของหวาน"],
                "activity": ["โยคะ","สมาธิ","ทำสวน","ปั้นดิน","เดินเท้าเปล่า"],
                "color": ["เหลือง","น้ำตาล","ส้มดิน (earthtone)"],
                "direction": "กลาง/ตะวันออกเฉียงเหนือ",
                "avoid": ["ความไม่แน่นอน","การเดินทางบ่อย"],
            }
        elif el == "ลม":
            prescriptions[el] = {
                "food": ["ของเปรี้ยว","มะนาว","ส้ม","ผักสด","น้ำส้มสายชู"],
                "activity": ["ท่องเที่ยว","ปั่นจักรยาน","เดินกลางแจ้ง","พูดคุย"],
                "color": ["เขียว","ฟ้าอ่อน","ขาว"],
                "direction": "ตะวันออก",
                "avoid": ["กิจวัตรซ้ำซาก","ห้องอับ","ความเครียด"],
            }
        elif el == "น้ำ":
            prescriptions[el] = {
                "food": ["น้ำมะพร้าว","บัวบก","แตงกวา","ซุปใส","ของรสเค็มอ่อน"],
                "activity": ["ว่ายน้ำ","สมาธิริมน้ำ","อาบน้ำอุ่น","ฟังเพลงสงบ"],
                "color": ["ฟ้า","น้ำเงิน","ดำ","เขียวเข้ม"],
                "direction": "เหนือ",
                "avoid": ["ความแห้งแล้ง","แดดจัด","ของเผ็ดจัด"],
            }
    
    return prescriptions
```

---

## 4. ตารางอ้างอิงหลัก (Reference Tables)

### 4.1 สี → ธาตุเบญจธาตุ

```python
COLOR_TO_ELEMENT = {
    # ไฟ
    "แดง":"ไฟ", "แดงเข้ม":"ไฟ", "ส้ม":"ไฟ", "ชมพูร้อน":"ไฟ",
    "แดงส้ม":"ไฟ",
    
    # ดิน
    "เหลือง":"ดิน", "เหลืองทอง":"ดิน", "น้ำตาล":"ดิน",
    "ครีม":"ดิน", "เบจ":"ดิน", "ทอง":"ดิน",
    
    # ไม้ (ลม)
    "เขียว":"ลม", "เขียวอ่อน":"ลม", "เขียวเข้ม":"ลม",
    "เขียวมิ้นท์":"ลม",
    
    # น้ำ
    "น้ำเงิน":"น้ำ", "ฟ้า":"น้ำ", "ดำ":"น้ำ",
    "เทาเข้ม":"น้ำ", "ม่วงน้ำเงิน":"น้ำ",
    
    # ทอง/โลหะ (→ดิน ใน DEMM)
    "เงิน":"ดิน", "ขาว":"ดิน", "เทาอ่อน":"ดิน",
    "เทา":"ดิน",
    
    # พิเศษ
    "ชมพูอ่อน":"น้ำ",  # pastel pink → น้ำ (ผ่อนคลาย)
    "ม่วง":"ลม",        # purple → ลม (จิตวิญญาณ)
    "ทับทิม":"ไฟ",      # ruby → ไฟ
}
```

### 4.2 รูปทรง → ธาตุ

```python
SHAPE_TO_ELEMENT = {
    # ไฟ
    "สามเหลี่ยม":"ไฟ", "แหลม":"ไฟ", "พุ่งขึ้น":"ไฟ",
    "ดาว":"ไฟ", "เปลวเพลิง":"ไฟ",
    
    # ดิน
    "สี่เหลี่ยมผืนผ้าแนวนอน":"ดิน", "แนวราบ":"ดิน",
    "เตี้ยกว้าง":"ดิน", "สี่เหลี่ยมจัตุรัส":"ดิน",
    
    # ไม้ (ลม)
    "สี่เหลี่ยมผืนผ้าแนวตั้ง":"ลม", "สูงชะลูด":"ลม",
    "เส้นตรงแนวตั้ง":"ลม",
    
    # น้ำ
    "วงกลม":"น้ำ", "วงรี":"น้ำ", "คลื่น":"น้ำ",
    "อิสระ":"น้ำ", "ไร้เหลี่ยม":"น้ำ", "หยดน้ำ":"น้ำ",
    
    # ทอง/โลหะ → ดิน
    "กลม":"ดิน", "ครึ่งวงกลม":"ดิน", "โค้ง":"น้ำ",
    "อาร์ค":"น้ำ",
}
```

### 4.3 ทิศ → ธาตุ (ฮวงจุ้ย)

```python
DIRECTION_TO_ELEMENT = {
    # เบญจธาตุจีน (ฮวงจุ้ย)
    "เหนือ": "น้ำ",
    "ใต้": "ไฟ",
    "ตะวันออก": "ลม",       # ไม้ → ลม
    "ตะวันตก": "ดิน",       # ทอง → ดิน
    "ตะวันออกเฉียงเหนือ": "ดิน",
    "ตะวันออกเฉียงใต้": "ลม",  # ไม้
    "ตะวันตกเฉียงเหนือ": "ดิน",  # ทอง
    "ตะวันตกเฉียงใต้": "ดิน",
    "กลาง": "ดิน",
}

# ยาม → ธาตุ (จาก Ubakong Time Chart 35 รายการ)
# ดูไฟล์: Ubakong_Time_Chart.xlsx
```

### 4.4 อาหาร → รส → ธาตุ (แพทย์แผนไทย)

```python
FOOD_ELEMENT = {
    # ไฟ (ร้อน กระตุ้น)
    "ขิง":"ไฟ", "พริก":"ไฟ", "กระเทียม":"ไฟ", "หอม":"ไฟ",
    "อบเชย":"ไฟ", "กานพลู":"ไฟ", "ต้มยำ":"ไฟ", "แกงเผ็ด":"ไฟ",
    
    # ดิน (มั่นคง หล่อเลี้ยง)
    "ฟักทอง":"ดิน", "มันเทศ":"ดิน", "กล้วย":"ดิน",
    "ข้าวต้ม":"ดิน", "ซุปข้น":"ดิน", "น้ำผึ้ง":"ดิน",
    
    # ลม/ไม้ (เปิด กระตุ้นการไหลเวียน)
    "มะนาว":"ลม", "ส้ม":"ลม", "สับปะรด":"ลม",
    "ผักสด":"ลม", "สลัด":"ลม", "น้ำส้มสายชู":"ลม",
    
    # น้ำ (เย็น ชุ่มชื้น)
    "น้ำมะพร้าว":"น้ำ", "บัวบก":"น้ำ", "แตงกวา":"น้ำ",
    "แตงโม":"น้ำ", "ซุปใส":"น้ำ", "น้ำเต้าหู้":"น้ำ",
}
```

### 4.5 กิจกรรม → ธาตุ

```python
ACTIVITY_TO_ELEMENT = {
    # ไฟ (ร้อน พลัง ระเบิด)
    "วิ่ง":"ไฟ", "มวย":"ไฟ", "ยกน้ำหนัก":"ไฟ",
    "เต้น":"ไฟ", "ร้องเพลง":"ไฟ", "ทำอาหาร":"ไฟ",
    
    # ดิน (มั่นคง ลงหลัก)
    "โยคะ":"ดิน", "สมาธิ":"ดิน", "ทำสวน":"ดิน",
    "ปั้นดิน":"ดิน", "ทำเซรามิก":"ดิน", "เดินเท้าเปล่า":"ดิน",
    
    # ลม/ไม้ (เคลื่อนไหว อิสระ)
    "ท่องเที่ยว":"ลม", "ปั่นจักรยาน":"ลม", "เดินกลางแจ้ง":"ลม",
    "อ่านหนังสือ":"ลม", "เขียน":"ลม", "วาดภาพ":"ลม",
    
    # น้ำ (สงบ ไหล)
    "ว่ายน้ำ":"น้ำ", "ฟังเพลง":"น้ำ", "นั่งริมน้ำ":"น้ำ",
    "ดูภาพยนตร์":"น้ำ", "อาบน้ำอุ่น":"น้ำ", "นอนพัก":"น้ำ",
}
```
---

## 5. 18 LOGIC MODULES — Specification

### Logic 0: Router (จัดประเภทคำถาม)

```python
ROUTING_RULES = {
    # keywords → Logic number
    "ทะเบียน|เบอร์รถ|สีรถ|โลโก้|แบรนด์|สัญลักษณ์": 2,
    "ฤกษ์|ยาม|เวลา|วันดี|คืนดี|อุบากง": 3,
    "ฝัน|ฝันว่า|ฝันเห็น|นิมิต": 4,
    "เข้ากัน|คนนี้|เพื่อน|เจ้านาย|แฟน|คนรัก|ความสัมพันธ์": 5,
    "สี|เสื้อผ้า|สีมงคล|สีห้อง": 6,
    "บ้าน|ห้อง|ฮวงจุ้ย|จัดบ้าน|ทิศ|สถานที่|โต๊ะทำงาน": 7,
    "ดวงวันนี้|วันนี้เป็นอย่างไร|พรุ่งนี้": 8,
    "ดวงเดือน|เดือนนี้|เดือนหน้า": 9,
    "ดวงปีนี้|ปีส่วนตัว": 10,
    "คำทำนาย|ปีนี้จะเป็นอย่างไร|อนาคต": 11,
    "อาหาร|ควรกิน|สุขภาพ|โรค|อาการ|ยา": 12,
    "ชื่อ|ตั้งชื่อ|ชื่อดี|ชื่อมงคล|เปลี่ยนชื่อ": 13,
    "โทรศัพท์|คอมพิวเตอร์|ของใช้|แก็ดเจ็ต|เครื่องมือ": 14,
    "อาชีพ|งาน|ทิศทาง|ควรทำอะไร": 15,
    "กิจกรรม|ไลฟ์สไตล์|พักผ่อน|ออกกำลัง|งานอดิเรก": 16,
    "คู่|ความรัก|แต่งงาน|คู่ชีวิต|เนื้อคู่": 17,
    "สมดุล|ภาพรวม|รายงาน|สรุป|ธาตุของฉัน": 18,
    "พลังงาน|เลข|ตัวเลข|กำลัง|numerology": 1,
}

def route(user_input, user_profile):
    for keywords, logic_num in ROUTING_RULES.items():
        if any(kw in user_input for kw in keywords.split("|")):
            return logic_num
    return 18  # default: Balance Report
```

### Logic 1: Personal Energy (พลังงานส่วนตัว)

```python
# Input: วันเกิด (dd/mm/yyyy) + ชื่อ-นามสกุล
# Output: เลขกำลังชีวิต (1-99), ปีส่วนตัว, คำทำนาย

def calc_personal_energy(dob, name):
    # Step 1: คำนวณเลขกำลังชีวิต
    digits = [int(d) for d in dob.replace("/","") if d.isdigit()]
    total = sum(digits)
    # รวมซ้ำจนเหลือ 1-9 หรือ Master Numbers (11, 22, 33, 44...)
    while total > 9 and total not in [11,22,33,44,55,66,77,88,99]:
        total = sum(int(d) for d in str(total))
    num_life = total
    
    # Step 2: ปีส่วนตัว (Personal Year)
    current_year = datetime.now().year
    year_digits = [int(d) for d in str(current_year)]
    bday_digits = [int(d) for d in dob[:5].replace("/","")]  # dd/mm only
    personal_year_raw = sum(year_digits) + sum(bday_digits)
    while personal_year_raw > 9:
        personal_year_raw = sum(int(d) for d in str(personal_year_raw))
    
    # Step 3: ดึงความหมายจาก Personal_Year_Guidance.xlsx
    guidance = get_personal_year_guidance(personal_year_raw)
    
    return {
        "num_life": num_life,
        "personal_year": personal_year_raw,
        "theme": guidance.theme,
        "overview": guidance.overview,
        "opportunity": guidance.opportunity,
        "caution": guidance.caution,
        "action": guidance.action
    }

# Knowledge Base: Personal_Year_Guidance.xlsx
# 12 รายการ: ปี 1-9 + Master Numbers 11, 22, 33
```

### Logic 2: Artifacts Analysis (สัญลักษณ์/สิ่งของ)

```python
# ใช้กับ: ทะเบียนรถ เบอร์โทร โลโก้ สัญลักษณ์
# สมการ: Wu Xing + Productive Clash

def analyze_artifact(user_profile, artifact_type, artifact_value):
    """
    artifact_type: "plate" | "phone" | "logo" | "symbol"
    artifact_value: "กข 1234" | "0812345678" | {color, shape}
    """
    
    if artifact_type == "plate":
        # แปลงทะเบียนเป็นธาตุ
        plate_num = extract_numbers(artifact_value)
        plate_element = numerology_to_element(plate_num)
        prefix_element = thai_prefix_to_element(artifact_value[:2])
        
    elif artifact_type == "phone":
        digits = [int(d) for d in artifact_value if d.isdigit()]
        total = sum(digits)
        while total > 9:
            total = sum(int(d) for d in str(total))
        plate_element = NUMBER_TO_ELEMENT[total]
    
    elif artifact_type == "logo":
        color_el = COLOR_TO_ELEMENT.get(artifact_value.get("color"), "")
        shape_el = SHAPE_TO_ELEMENT.get(artifact_value.get("shape"), "")
        # รวม 2 ธาตุ → หาธาตุหลัก
        plate_element = dominant_of([color_el, shape_el])
    
    # คำนวณ Wu Xing + Productive Clash
    user_dominant = user_profile.element_seed.dominant
    wx = productive_clash(user_profile.element_seed, plate_element, user_profile.missing_elements)
    
    return {
        "artifact_element": plate_element,
        "wu_xing": wx,
        "recommendation": generate_artifact_advice(wx, user_profile),
    }

# เลข → ธาตุ
NUMBER_TO_ELEMENT = {
    1:"ไฟ", 2:"ดิน", 3:"ลม", 4:"น้ำ", 5:"ดิน",
    6:"น้ำ", 7:"ลม", 8:"ดิน", 9:"ไฟ",
}
```

### Logic 3: Auspicious Time (ฤกษ์ยาม)

```python
# Knowledge Base: Ubakong_Time_Chart.xlsx (35 รายการ)
# Schema: day | time_start | time_end | yam_name | meaning | status | score

def get_auspicious_time(day_of_week, purpose="general"):
    """ดึงยามดี-ยามร้าย สำหรับวันที่ระบุ"""
    
    records = load_ubakong(day_of_week)
    # filter ตาม purpose ถ้ามี
    
    good_times = [r for r in records if r.score >= 7]
    bad_times = [r for r in records if r.score <= 3]
    
    return {
        "good_times": good_times,
        "bad_times": bad_times,
        "best_time": max(records, key=lambda x: x.score),
    }

def combine_with_user_element(time_result, user_profile):
    """เพิ่ม personalization จากธาตุผู้ใช้"""
    # ถ้าธาตุยามดีตรงกับธาตุผู้ใช้ → ดีกว่าปกติ
    best = time_result["best_time"]
    yam_element = TIME_TO_ELEMENT.get(best.yam_name, "")
    
    if yam_element == user_profile.element_seed.dominant:
        best.bonus = "✨ ยามนี้ตรงกับธาตุของคุณ — ดีมากเป็นพิเศษ!"
    
    return time_result
```

### Logic 4: Dream Interpretation (ทำนายฝัน)

```python
# Knowledge Base 2 ชั้น:
# ชั้น 1: Dream_Kangxi_Dictionary.xlsx (457 รายการ)
#   Schema: category | dream_object | chinese_char | kangxi_strokes | element | meaning
# ชั้น 2: Dream_Psychology_Meaning.xlsx (22 รายการ ปัจจุบัน → ควรเพิ่มเป็น 50+)
#   Schema: dream_theme | psychological_meaning | element_connection | element_remedy | personalized_note

def interpret_dream(dream_text, user_profile):
    """
    2-Layer Dream Analysis:
    Layer 1: ความหมายตามพจนานุกรมคังซี (วัตถุ/สัตว์ในฝัน)
    Layer 2: ความหมายจิตวิทยา (ธีมของฝัน)
    Layer 3: Personalization (เทียบกับธาตุผู้ใช้)
    """
    
    # Layer 1: ค้นหาใน Kangxi Dictionary
    objects_found = extract_dream_objects(dream_text)  # NLP
    kangxi_results = []
    for obj in objects_found:
        result = search_kangxi_dict(obj)
        if result:
            kangxi_results.append(result)
    
    # Layer 2: ค้นหาธีมจิตวิทยา
    theme = classify_dream_theme(dream_text)
    psych_result = search_psychology_meaning(theme)
    
    # Layer 3: Personalization
    user_dominant = user_profile.element_seed.dominant
    user_missing = user_profile.element_seed.missing
    
    personalized = []
    for k in kangxi_results:
        if k.element in user_missing:
            personalized.append(f"ฝันเห็น{k.dream_object} ธาตุ{k.element} "
                                f"→ จิตใต้สำนึกบอกให้เสริมธาตุที่ขาด!")
        elif k.element == user_dominant:
            wx = wu_xing_score(user_dominant, k.element)
            personalized.append(f"ฝันเห็น{k.dream_object} ธาตุ{k.element} "
                                f"+ ธาตุคุณ{user_dominant} = {wx['type']}")
    
    return {
        "kangxi_meanings": kangxi_results,
        "psychological_theme": psych_result,
        "personalized_insights": personalized,
        "remedy": psych_result.element_remedy if psych_result else "",
    }
```

### Logic 5: Compatibility (คนรอบข้าง)

```python
# ใช้ร่วมกับ Platform D Compatibility หรือคำถาม 3 ข้อ
# ดู Platform D doc บทที่ 6 สำหรับรายละเอียด

def analyze_relationship(user_profile, other_person):
    """
    other_person: อาจมาจาก DEMM full หรือ Quick 3Q estimate
    """
    
    # Layer 1: Element Seed compatibility
    user_el = user_profile.element_seed.dominant
    other_el = other_person.element_seed.dominant
    element_score = wu_xing_score(
        THAI_TO_WUXING[user_el],
        THAI_TO_WUXING[other_el]
    )
    
    # Layer 2: DEMM Compatibility (ถ้ามี DEMM data)
    demm_score = None
    if user_profile.archetype_id and other_person.archetype_id:
        demm_score = calc_compat_score(
            user_profile.archetype_id,
            other_person.archetype_id
        )  # ดูสมการใน Platform D บทที่ 2.3
    
    # Layer 3: Combined
    if demm_score:
        combined = element_score["score"]/4 * 0.4 + demm_score * 0.6
    else:
        combined = (element_score["score"] + 2) / 4  # normalize -2..+2 → 0..1
    
    return {
        "element_compatibility": element_score,
        "demm_compatibility": demm_score,
        "combined_score": round(combined * 100),
        "advice": generate_relationship_advice(user_profile, other_person, element_score),
    }
```

### Logic 7: Feng Shui (ฮวงจุ้ย)

```python
def analyze_feng_shui(user_profile, space):
    """
    space: {direction, room_shape, main_color, purpose}
    purpose: "bedroom" | "office" | "living" | "entrance"
    """
    
    direction_el = DIRECTION_TO_ELEMENT[space.direction]
    shape_el = SHAPE_TO_ELEMENT.get(space.room_shape, "")
    color_el = COLOR_TO_ELEMENT.get(space.main_color, "")
    
    # วิเคราะห์ทิศ
    dir_score = productive_clash(
        user_profile.element_seed,
        direction_el,
        user_profile.element_seed.missing
    )
    
    # คำแนะนำปรับปรุง
    recommendations = []
    if dir_score["score"] < 0:
        remedy_el = find_remedy_element(dir_score, user_profile)
        recommendations.append({
            "issue": f"ทิศ{space.direction}({direction_el})ขัดกับธาตุคุณ({user_profile.element_seed.dominant})",
            "fix": f"เพิ่มสี{ELEMENT_TO_COLOR[remedy_el]} หรือวัสดุธาตุ{remedy_el} ในพื้นที่นี้",
        })
    
    return {
        "direction_analysis": dir_score,
        "recommendations": recommendations,
        "lucky_corner": find_lucky_direction(user_profile),
    }
```

### Logic 8-11: Horoscope & Prediction

```python
# Logic 8: ดวงรายวัน
def daily_horoscope(user_profile, target_date=None):
    date = target_date or datetime.today()
    day_el = DAY_TO_ELEMENT[date.weekday()]
    
    # ปฏิสัมพันธ์ธาตุวัน × ธาตุผู้ใช้
    day_interaction = wu_xing_score(day_el, user_profile.element_seed.dominant)
    
    # ยามดีของวัน (จาก Ubakong)
    good_times = get_auspicious_time(date.strftime("%A"))
    
    return {
        "date": date,
        "day_element": day_el,
        "interaction": day_interaction,
        "energy_level": calc_daily_energy(day_interaction),
        "best_activities": suggest_activities(day_interaction, user_profile),
        "good_times": good_times,
        "caution": generate_daily_caution(day_interaction),
    }

# Logic 11: ดวงปี (จาก Personal_Year_Guidance.xlsx)
def annual_prediction(user_profile):
    guidance = get_personal_year_guidance(user_profile.personal_year)
    
    # ผสม Element Seed + Personal Year
    return {
        "year_number": user_profile.personal_year,
        "theme": guidance.theme,
        "overview": guidance.overview,
        "element_angle": f"ปีนี้เป็นพลังงาน{NUM_TO_ELEMENT[user_profile.personal_year]} "
                         f"+ ธาตุคุณ{user_profile.element_seed.dominant} "
                         f"= {wu_xing_score(NUM_TO_ELEMENT[user_profile.personal_year], user_profile.element_seed.dominant)['type']}",
        "opportunity": guidance.opportunity,
        "caution": guidance.caution,
        "action": guidance.action,
    }
```

### Logic 12: Food & Health

```python
def food_health_advice(user_profile, symptom=""):
    """
    คำแนะนำอาหาร/สุขภาพ ตามหลักแพทย์แผนไทย + เบญจธาตุ
    """
    
    # วิเคราะห์ธาตุขาด-เกิน
    seed = user_profile.element_seed
    
    prescriptions = ttm_prescribe(seed)
    
    # ถ้ามีอาการ → วิเคราะห์ธาตุจากอาการ
    if symptom:
        symptom_el = SYMPTOM_TO_ELEMENT.get(symptom, "")
        if symptom_el:
            prescriptions[f"อาการ_{symptom}"] = {
                "element": symptom_el,
                "remedy": ELEMENT_REMEDY[symptom_el],
            }
    
    return prescriptions

SYMPTOM_TO_ELEMENT = {
    "ร้อนใน": "ไฟ", "ไข้": "ไฟ", "อักเสบ": "ไฟ",
    "ท้องผูก": "ดิน", "หนัก": "ดิน", "เฉื่อย": "ดิน",
    "ปวดหัว": "ลม", "ฟุ้งซ่าน": "ลม", "ชา": "ลม",
    "แห้ง": "น้ำ", "กระหาย": "น้ำ", "ผิวแตก": "น้ำ",
}
```

### Logic 18: Balance Report (รายงานสมดุลธาตุ)

```python
def generate_balance_report(user_profile):
    """รายงานภาพรวมสมดุลธาตุ — เรียกเมื่อไม่รู้จะถามอะไร หรือ first-time user"""
    
    seed = user_profile.element_seed
    friction = calc_friction(user_profile)
    ttm = ttm_prescribe(seed)
    
    # Adaptive Persona
    adaptive = f"แก่นแท้ {seed.dominant} + ปัจจุบัน {user_profile.pdcr_dominant} " \
               f"= บุคลิกที่คุณแสดงออกตอนนี้"
    
    report = {
        "element_seed": seed,
        "dominant": seed.dominant,
        "missing": seed.missing,
        "friction": friction,
        "adaptive_persona": adaptive,
        "prescriptions": ttm,
        "personal_year": user_profile.personal_year,
        "top_recommendations": generate_top3_advice(seed, friction, user_profile),
    }
    
    return report
```

---

## 6. KNOWLEDGE BASE

### 6.1 สถานะปัจจุบัน

| ไฟล์ | Records | สถานะ | ใช้กับ Logic |
|------|---------|-------|-------------|
| Dream_Kangxi_Dictionary.xlsx | 457 | ✅ พร้อมใช้ | Logic 4 |
| Dream_Psychology_Meaning.xlsx | 22 (ควรเป็น 50+) | ⚠️ ต้องเพิ่ม | Logic 4 |
| Ubakong_Time_Chart.xlsx | 35 | ✅ พร้อมใช้ | Logic 3, 8 |
| Personal_Year_Guidance.xlsx | 12 | ✅ พร้อมใช้ | Logic 1, 11 |
| Logic_Scripts.docx | JS code | ✅ พร้อมใช้ | Logic 1, 2, 13 |
| System_Prompts.docx | Prompts | ✅ พร้อมใช้ | Router + AI |

### 6.2 Knowledge Base ที่ต้องสร้างเพิ่ม

| ไฟล์ | รายการ | Priority | Logic |
|------|--------|---------|-------|
| Color_Element_Map.xlsx | 50+ สี | 🔴 High | 2, 6, 7 |
| Shape_Element_Map.xlsx | 30+ รูปทรง | 🔴 High | 2, 7 |
| Direction_Element_Map.xlsx | 9 ทิศ | 🔴 High | 7, 15 |
| Food_Element_Map.xlsx | 100+ อาหาร | 🟡 Medium | 12 |
| Activity_Element_Map.xlsx | 50+ กิจกรรม | 🟡 Medium | 16 |
| Symptom_Element_Map.xlsx | 30+ อาการ | 🟡 Medium | 12 |
| Dream_Psychology + 28 themes | 50 รวม | 🟡 Medium | 4 |
| Ephemeris_Data | ตำแหน่งดาว | 🟢 Low | 8, 9 |
| Flying_Stars_9_Periods | ฮวงจุ้ย 9 ยุค | 🟢 Low | 7 |

---

## 7. SYSTEM PROMPTS

### 7.1 Router Prompt

```
คุณคือ KRUTH ELEMENT Router
วิเคราะห์ข้อความผู้ใช้แล้วระบุว่าเกี่ยวกับ Logic ไหน (1-18)
ตอบเป็น JSON เท่านั้น: {"logic": N, "confidence": 0-1, "key_objects": []}

ตัวอย่าง:
  "รถฉันทะเบียน กข 1234 สีดำ เข้ากับฉันไหม" → {"logic": 2, "confidence": 0.95, "key_objects": ["ทะเบียน","สีดำ"]}
  "ฝันว่าตกจากที่สูง" → {"logic": 4, "confidence": 0.98, "key_objects": ["ตก","ที่สูง"]}
  "วันนี้เป็นยังไงบ้าง" → {"logic": 8, "confidence": 0.9, "key_objects": ["วันนี้"]}
  "กินอาหารอะไรดี" → {"logic": 12, "confidence": 0.85, "key_objects": ["อาหาร"]}
```

### 7.2 Generator Prompt (ตัวอย่าง Logic 4 ฝัน)

```
คุณคือ KRUTH ELEMENT — ผู้เชี่ยวชาญด้านการทำนายฝันและสมดุลธาตุ

ข้อมูลผู้ใช้:
- ธาตุเด่น: {dominant_element}
- ธาตุขาด: {missing_elements}
- ปีนักษัตร: {zodiac_animal}
- วันเกิด: {day_of_week}({day_element})

ผลการวิเคราะห์ฝัน:
{dream_analysis_json}

กฎการตอบ:
1. ใช้ภาษาไทย อบอุ่น เป็นกันเอง ลึกลับนิดๆ แต่มีเหตุผลรองรับ
2. อธิบายทั้งมุม Kangxi (วัตถุ/สัตว์) และมุมจิตวิทยา
3. เชื่อมกับธาตุของผู้ใช้เสมอ → personalized advice
4. จบด้วย "สิ่งที่แนะนำ" ที่ทำได้จริง (อาหาร/กิจกรรม/สี)
5. ห้ามทำนายเรื่องสุขภาพหรือการแพทย์แบบเด็ดขาด
6. ถ้าฝันร้ายมาก → เพิ่ม disclaimer "ฝันเป็นเพียงภาพจิตใต้สำนึก ไม่ใช่เหตุการณ์จริง"
```

### 7.3 Disclaimer Template

```
⚠️ คำแนะนำนี้อ้างอิงหลักภูมิปัญญาตะวันออก (เบญจธาตุ/แพทย์แผนไทย)
เป็นแนวทางเสริม ไม่ใช่คำวินิจฉัยทางการแพทย์หรือการทำนายที่แน่นอน
สำหรับเรื่องสุขภาพ โปรดปรึกษาแพทย์
```

---

## 8. DATA FLOW + BRIDGE กับ Platform D

### 8.1 Bridge Architecture

```
Platform D (KRUTH MIND)          Platform E (KRUTH ELEMENT)
─────────────────────────────────────────────────────────
ผู้ใช้ทำ DEMM full               ผู้ใช้ลงทะเบียนด้วย วันเกิด+ชื่อ
        ↓                                    ↓
  Supabase results              Mini Assessment 10 ข้อ
  - OCEAN scores                        ↓
  - Archetype ID                estimate_ocean()
  - Element Seed                        ↓
  - pDCR                       Element Seed (จาก DOB+Name)
  - Dosha                               ↓
        ↓                      Wu Xing + 18 Logic Modules
  [Bridge API]
        ↓
Platform E ดึงข้อมูลมา enhance:
  - ใช้ OCEAN แทน estimate
  - ใช้ pDCR สำหรับ L3 State
  - ใช้ Clinical Flags (ถ้ามี) เพื่อ safe-guard
```

### 8.2 Shared Data Fields

```python
BRIDGE_FIELDS = [
    # จาก results table
    "score_o", "score_c", "score_e", "score_a", "score_n",
    "pdcr_fire", "pdcr_wind", "pdcr_water", "pdcr_earth", "pdcr_dominant",
    "indian_dosha",
    "archetype_id",
    
    # จาก users table
    "day_of_week",
    "thai_element", "chinese_element",
    "name_fire_pct", "name_earth_pct", "name_wind_pct", "name_water_pct",
    "num_life",
]

# Platform E query
def get_platform_e_profile(user_id):
    demm_data = supabase.from("results").select(*BRIDGE_FIELDS).eq("user_id", user_id).single()
    user_data = supabase.from("users").select("*").eq("id", user_id).single()
    
    if demm_data:
        # Full profile — ใช้ข้อมูล DEMM
        return build_full_profile(demm_data, user_data)
    else:
        # Mini profile — ใช้แค่ DOB + Name
        return build_mini_profile(user_data)
```

### 8.3 Mini Assessment 10 ข้อ (สำหรับคนที่ไม่ได้ทำ DEMM)

```
Q1: เวลาเจอปัญหาใหม่ คุณทำอย่างไร?
    A=ลุยแก้เลย B=คิดวิเคราะห์ก่อน C=ถามคนอื่น D=รอดูก่อน

Q2: สไตล์การทำงานของคุณ?
    A=ชอบทำคนเดียว B=ชอบทำเป็นทีม

Q3: คุณตัดสินใจด้วยอะไร?
    A=เหตุผลและข้อมูล B=ความรู้สึกและสัญชาตญาณ

Q4: เมื่อเหนื่อย คุณฟื้นพลังอย่างไร?
    A=อยู่คนเดียวเงียบๆ B=ออกไปพบปะผู้คน

Q5: คุณชอบแผนการแบบไหน?
    A=วางแผนล่วงหน้าละเอียด B=ยืดหยุ่นตามสถานการณ์

Q6: อะไรสำคัญกว่าสำหรับคุณ?
    A=ความถูกต้องและตรรกะ B=ความกลมกลืนและความสัมพันธ์

Q7: คุณมองตัวเองว่าเป็นคนแบบไหน?
    A=นักคิด/นักวิเคราะห์ B=นักสร้างสรรค์/นักฝัน
    C=นักปฏิบัติ/นักลงมือทำ D=นักดูแล/นักเชื่อมคน

Q8: สิ่งที่คุณกังวลมากที่สุด?
    A=งานไม่เสร็จตามแผน B=ความสัมพันธ์ไม่ดี
    C=ไม่มีอิสระ D=ไม่มีความมั่นคง

Q9: ช่วงที่คุณมีพลังมากที่สุด?
    A=ตอนเช้า B=กลางวัน C=เย็น D=กลางคืน

Q10: ธาตุที่คุณรู้สึกว่าตรงกับตัวเอง?
    A=ไฟ (ร้อนแรง กระตือรือร้น) B=ดิน (มั่นคง หนักแน่น)
    C=ลม (อิสระ คิดเยอะ) D=น้ำ (ไหลลื่น ปรับตัว)

# Scoring:
# Q1-Q6 → estimate OCEAN
# Q7-Q10 → confirm Element Seed
```

---

## 9. REVENUE MODEL & ROADMAP

### 9.1 Pricing Tiers (B2C Focus)

| Tier | ราคา | สิ่งที่ได้ | กลุ่มเป้าหมาย |
|------|------|-----------|--------------|
| **Free** | ฟรี | Element Seed + ดวงรายวัน 3 ครั้ง/วัน + ทำนายฝัน 1 ครั้ง/วัน | ทดลองใช้ |
| **Premium** | 199 ฿/เดือน | ทุก 18 Logic ไม่จำกัด + รายงานสมดุลรายเดือน + ฤกษ์ยาม | คนสนใจจริงจัง |
| **Lifetime** | 1,990 ฿ | ทุกอย่างตลอดชีพ (ไม่มี subscription) | Early adopters |
| **Family** | 499 ฿/เดือน (5 คน) | Premium สำหรับครอบครัว + Team element balance | ครอบครัว |

**Viral Mechanics:**
- แชร์ผล "ธาตุของฉันคือ..." บน social media → ลิงก์กลับมา Platform E
- Social Sharing ที่ออกแบบให้ viral (ภาพ archetype สวยงาม)

### 9.2 Roadmap

| ช่วง | งาน |
|------|-----|
| Q2 2026 | เอกสาร Platform E (ตอนนี้) + Knowledge Base Phase 1 (สี/ทิศ/อาหาร) |
| Q3 2026 | MVP: Logic 1,4,8,18 (Energy + Dream + Daily + Balance) |
| Q4 2026 | Logic 2,3,5,7,12 (Artifacts + Time + Compat + Fengshui + Food) |
| Q1 2027 | Platform E full launch + Bridge กับ Platform D |
| Q2 2027 | Logic 13-17 + Ephemeris API |

### 9.3 Known Issues & TODO

| Issue | Priority | Action |
|-------|---------|--------|
| Dream_Psychology 22 themes ไม่พอ (ควรเป็น 50+) | 🔴 High | ต่อยอดจาก Dream_Psychology_Part1_14themes.xlsx |
| ไม่มี Color/Shape/Direction mapping เป็น DB | 🔴 High | สร้าง Excel จากตารางในเอกสารนี้ |
| ไม่มี Food/Activity mapping ครบ | 🟡 Medium | สร้างจากข้อมูลแพทย์แผนไทย (มีใน docx) |
| Ephemeris API สำหรับดาวจร | 🟢 Low | ใช้ Swiss Ephemeris หรือ Astro API ภายนอก |
| Mini Assessment 10 ข้อ ยังไม่ได้ validate | 🟡 Medium | เปรียบเทียบกับ DEMM full n=50+ |
| Platform D Bridge API ยังไม่ได้สร้าง | 🟡 Medium | สร้าง endpoint /api/bridge ใน Next.js |

---

## 10. ไฟล์แนบที่ควรส่งไปด้วย

### ต้องแนบ (Critical):
1. **`Dream_Kangxi_Dictionary.xlsx`** — 457 รายการ Knowledge Base หลัก
2. **`Dream_Psychology_Part1_14themes.xlsx`** — 22 themes ปัจจุบัน
3. **`Ubakong_Time_Chart.xlsx`** — ยาม 35 ช่วง
4. **`Personal_Year_Guidance.xlsx`** — คำแนะนำ 12 ปี
5. **`Logic_Scripts.docx`** — JavaScript code (Numeric, Kangxi Parser, Wu Xing)
6. **`System_Prompts.docx`** — Router + Parser + Generator prompts

### ควรแนบ (Recommended):
7. **`สถาปัตยกรรมฐานข้อมูลพจนานุกรมคังซี.docx`** — DB architecture reference
8. **`การบูรณาการองค์ความรู้เพื่อสุขภาพองค์รวม.docx`** — IEP framework
9. **`การพัฒนาระบบแพทย์แผนไทยสู่สากล.docx`** — TTM reference
10. **`Logic_1_คำนวณพลังงานส่วนบุคคล.docx`** — JSON spec Logic 1

### จาก Platform D (ถ้ามี):
11. **`KRUTH_MIND_Platform_D_Handoff_v1.md`** — สมการ OCEAN/Compat/Flags ที่ใช้ร่วมกัน
12. **`lib/scoring.ts`** — Element Seed, Friction, Wu Xing functions

---
*Document version: 1.0 | April 2026 | KRUTH APEX / Di Vi Jitr | Confidential*
