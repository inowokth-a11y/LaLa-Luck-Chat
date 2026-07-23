// พิกัดจังหวัดเกิด — ใช้คำนวณลัคนา (ต้องมี lat/lon เพื่อหาเวลาอาทิตย์ขึ้นจริง)
//
// ⚠️ ลองจิจูดไม่ใช่ข้อมูลตกแต่ง — มีผลกับผลลัพธ์โดยตรง:
//    ไทยกว้างจาก ~97.9°E (แม่ฮ่องสอน) ถึง ~104.9°E (อุบลฯ) ≈ 7 องศา
//    1 องศาลองจิจูด = 4 นาทีเวลาสุริยะ → หัวท้ายประเทศต่างกัน ~28 นาที
//    มากพอจะเปลี่ยนลัคนาข้ามราศีได้ถ้าเกิดใกล้รอยต่อ
//
// ⚠️ ที่มาของค่า: พิกัดตัวเมืองของแต่ละจังหวัด ละเอียด 2 ตำแหน่งทศนิยม (~1 กม.)
//    ซึ่งละเอียดเกินพอสำหรับลัคนา (0.01° ≈ 2.4 วินาทีเวลา)
//    **เขียนจากความรู้ทั่วไป ไม่ได้ดึงจากฐานข้อมูลราชการ** — ถ้าต้องการความแม่นยำ
//    ระดับทางการ ควรสอบทานกับข้อมูลกรมการปกครองอีกครั้ง (ดู CLAUDE.md §5)
//
// หมายเหตุ: 8 จังหวัดที่มีอยู่เดิมคง `key` ไว้เหมือนเดิมทุกตัว เพื่อไม่ให้ค่าที่ผู้ใช้
// เคยเลือกไว้เสีย (bangkok, chiangmai, khonkaen, nakhonratchasima, ubonratchathani,
// phuket, songkhla, chonburi)

export type Region = "เหนือ" | "อีสาน" | "กลาง" | "ตะวันออก" | "ตะวันตก" | "ใต้";

export interface Province {
  key: string;
  name: string;
  lat: number;
  lon: number;
  region: Region;
}

export const PROVINCES: Province[] = [
  // ---- ภาคเหนือ (9) ----
  { key: "chiangmai", name: "เชียงใหม่", lat: 18.79, lon: 98.98, region: "เหนือ" },
  { key: "chiangrai", name: "เชียงราย", lat: 19.91, lon: 99.83, region: "เหนือ" },
  { key: "lampang", name: "ลำปาง", lat: 18.29, lon: 99.49, region: "เหนือ" },
  { key: "lamphun", name: "ลำพูน", lat: 18.58, lon: 99.01, region: "เหนือ" },
  { key: "maehongson", name: "แม่ฮ่องสอน", lat: 19.3, lon: 97.97, region: "เหนือ" },
  { key: "nan", name: "น่าน", lat: 18.78, lon: 100.78, region: "เหนือ" },
  { key: "phayao", name: "พะเยา", lat: 19.17, lon: 99.9, region: "เหนือ" },
  { key: "phrae", name: "แพร่", lat: 18.14, lon: 100.14, region: "เหนือ" },
  { key: "uttaradit", name: "อุตรดิตถ์", lat: 17.62, lon: 100.1, region: "เหนือ" },

  // ---- ภาคตะวันออกเฉียงเหนือ (20) ----
  { key: "kalasin", name: "กาฬสินธุ์", lat: 16.43, lon: 103.51, region: "อีสาน" },
  { key: "khonkaen", name: "ขอนแก่น", lat: 16.44, lon: 102.83, region: "อีสาน" },
  { key: "chaiyaphum", name: "ชัยภูมิ", lat: 15.81, lon: 102.03, region: "อีสาน" },
  { key: "nakhonphanom", name: "นครพนม", lat: 17.41, lon: 104.78, region: "อีสาน" },
  { key: "nakhonratchasima", name: "นครราชสีมา", lat: 14.98, lon: 102.1, region: "อีสาน" },
  { key: "buengkan", name: "บึงกาฬ", lat: 18.36, lon: 103.65, region: "อีสาน" },
  { key: "buriram", name: "บุรีรัมย์", lat: 14.99, lon: 103.1, region: "อีสาน" },
  { key: "mahasarakham", name: "มหาสารคาม", lat: 16.18, lon: 103.3, region: "อีสาน" },
  { key: "mukdahan", name: "มุกดาหาร", lat: 16.54, lon: 104.72, region: "อีสาน" },
  { key: "yasothon", name: "ยโสธร", lat: 15.79, lon: 104.15, region: "อีสาน" },
  { key: "roiet", name: "ร้อยเอ็ด", lat: 16.05, lon: 103.65, region: "อีสาน" },
  { key: "loei", name: "เลย", lat: 17.49, lon: 101.73, region: "อีสาน" },
  { key: "sisaket", name: "ศรีสะเกษ", lat: 15.12, lon: 104.32, region: "อีสาน" },
  { key: "sakonnakhon", name: "สกลนคร", lat: 17.16, lon: 104.15, region: "อีสาน" },
  { key: "surin", name: "สุรินทร์", lat: 14.88, lon: 103.49, region: "อีสาน" },
  { key: "nongkhai", name: "หนองคาย", lat: 17.88, lon: 102.74, region: "อีสาน" },
  { key: "nongbualamphu", name: "หนองบัวลำภู", lat: 17.2, lon: 102.44, region: "อีสาน" },
  { key: "amnatcharoen", name: "อำนาจเจริญ", lat: 15.87, lon: 104.63, region: "อีสาน" },
  { key: "udonthani", name: "อุดรธานี", lat: 17.41, lon: 102.79, region: "อีสาน" },
  { key: "ubonratchathani", name: "อุบลราชธานี", lat: 15.23, lon: 104.86, region: "อีสาน" },

  // ---- ภาคกลาง (22) ----
  { key: "bangkok", name: "กรุงเทพมหานคร", lat: 13.75, lon: 100.5, region: "กลาง" },
  { key: "kamphaengphet", name: "กำแพงเพชร", lat: 16.48, lon: 99.52, region: "กลาง" },
  { key: "chainat", name: "ชัยนาท", lat: 15.19, lon: 100.13, region: "กลาง" },
  { key: "nakhonnayok", name: "นครนายก", lat: 14.2, lon: 101.21, region: "กลาง" },
  { key: "nakhonpathom", name: "นครปฐม", lat: 13.82, lon: 100.06, region: "กลาง" },
  { key: "nakhonsawan", name: "นครสวรรค์", lat: 15.7, lon: 100.14, region: "กลาง" },
  { key: "nonthaburi", name: "นนทบุรี", lat: 13.86, lon: 100.51, region: "กลาง" },
  { key: "pathumthani", name: "ปทุมธานี", lat: 14.02, lon: 100.53, region: "กลาง" },
  { key: "ayutthaya", name: "พระนครศรีอยุธยา", lat: 14.35, lon: 100.58, region: "กลาง" },
  { key: "phichit", name: "พิจิตร", lat: 16.44, lon: 100.35, region: "กลาง" },
  { key: "phitsanulok", name: "พิษณุโลก", lat: 16.82, lon: 100.27, region: "กลาง" },
  { key: "phetchabun", name: "เพชรบูรณ์", lat: 16.42, lon: 101.16, region: "กลาง" },
  { key: "lopburi", name: "ลพบุรี", lat: 14.8, lon: 100.65, region: "กลาง" },
  { key: "samutprakan", name: "สมุทรปราการ", lat: 13.6, lon: 100.6, region: "กลาง" },
  { key: "samutsongkhram", name: "สมุทรสงคราม", lat: 13.41, lon: 100.0, region: "กลาง" },
  { key: "samutsakhon", name: "สมุทรสาคร", lat: 13.55, lon: 100.27, region: "กลาง" },
  { key: "singburi", name: "สิงห์บุรี", lat: 14.89, lon: 100.4, region: "กลาง" },
  { key: "sukhothai", name: "สุโขทัย", lat: 17.01, lon: 99.82, region: "กลาง" },
  { key: "suphanburi", name: "สุพรรณบุรี", lat: 14.47, lon: 100.12, region: "กลาง" },
  { key: "saraburi", name: "สระบุรี", lat: 14.53, lon: 100.91, region: "กลาง" },
  { key: "angthong", name: "อ่างทอง", lat: 14.59, lon: 100.46, region: "กลาง" },
  { key: "uthaithani", name: "อุทัยธานี", lat: 15.38, lon: 100.02, region: "กลาง" },

  // ---- ภาคตะวันออก (7) ----
  { key: "chanthaburi", name: "จันทบุรี", lat: 12.61, lon: 102.1, region: "ตะวันออก" },
  { key: "chachoengsao", name: "ฉะเชิงเทรา", lat: 13.69, lon: 101.07, region: "ตะวันออก" },
  { key: "chonburi", name: "ชลบุรี", lat: 13.36, lon: 100.98, region: "ตะวันออก" },
  { key: "trat", name: "ตราด", lat: 12.24, lon: 102.51, region: "ตะวันออก" },
  { key: "prachinburi", name: "ปราจีนบุรี", lat: 14.05, lon: 101.37, region: "ตะวันออก" },
  { key: "rayong", name: "ระยอง", lat: 12.68, lon: 101.28, region: "ตะวันออก" },
  { key: "sakaeo", name: "สระแก้ว", lat: 13.82, lon: 102.07, region: "ตะวันออก" },

  // ---- ภาคตะวันตก (5) ----
  { key: "kanchanaburi", name: "กาญจนบุรี", lat: 14.02, lon: 99.53, region: "ตะวันตก" },
  { key: "tak", name: "ตาก", lat: 16.87, lon: 99.13, region: "ตะวันตก" },
  { key: "prachuapkhirikhan", name: "ประจวบคีรีขันธ์", lat: 11.81, lon: 99.8, region: "ตะวันตก" },
  { key: "phetchaburi", name: "เพชรบุรี", lat: 13.11, lon: 99.94, region: "ตะวันตก" },
  { key: "ratchaburi", name: "ราชบุรี", lat: 13.53, lon: 99.81, region: "ตะวันตก" },

  // ---- ภาคใต้ (14) ----
  { key: "krabi", name: "กระบี่", lat: 8.09, lon: 98.91, region: "ใต้" },
  { key: "chumphon", name: "ชุมพร", lat: 10.49, lon: 99.18, region: "ใต้" },
  { key: "trang", name: "ตรัง", lat: 7.56, lon: 99.61, region: "ใต้" },
  { key: "nakhonsithammarat", name: "นครศรีธรรมราช", lat: 8.43, lon: 99.96, region: "ใต้" },
  { key: "narathiwat", name: "นราธิวาส", lat: 6.43, lon: 101.82, region: "ใต้" },
  { key: "pattani", name: "ปัตตานี", lat: 6.87, lon: 101.25, region: "ใต้" },
  { key: "phangnga", name: "พังงา", lat: 8.45, lon: 98.53, region: "ใต้" },
  { key: "phatthalung", name: "พัทลุง", lat: 7.62, lon: 100.08, region: "ใต้" },
  { key: "phuket", name: "ภูเก็ต", lat: 7.89, lon: 98.4, region: "ใต้" },
  { key: "ranong", name: "ระนอง", lat: 9.96, lon: 98.64, region: "ใต้" },
  { key: "yala", name: "ยะลา", lat: 6.54, lon: 101.28, region: "ใต้" },
  { key: "satun", name: "สตูล", lat: 6.62, lon: 100.07, region: "ใต้" },
  { key: "songkhla", name: "สงขลา", lat: 7.2, lon: 100.6, region: "ใต้" },
  { key: "suratthani", name: "สุราษฎร์ธานี", lat: 9.14, lon: 99.33, region: "ใต้" },
];

export const REGION_ORDER: Region[] = ["กลาง", "เหนือ", "อีสาน", "ตะวันออก", "ตะวันตก", "ใต้"];

/** จัดกลุ่มตามภาค — 77 รายการเรียงยาวๆ หายาก ใช้ทำ optgroup ในฟอร์ม */
export function provincesByRegion(): Array<{ region: Region; items: Province[] }> {
  return REGION_ORDER.map((region) => ({
    region,
    items: PROVINCES.filter((p) => p.region === region),
  }));
}

/** ไม่พบ key → คืนกรุงเทพฯ (ค่าเริ่มต้นเดิม ไม่ throw เพื่อไม่ให้หน้าพัง) */
export const provinceByKey = (key: string): Province =>
  PROVINCES.find((p) => p.key === key) ?? PROVINCES.find((p) => p.key === "bangkok")!;
