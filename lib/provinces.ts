// พิกัดจังหวัดเกิด — ใช้คำนวณลัคนา (ต้องมี lat/lon เพื่อหาเวลาอาทิตย์ขึ้นจริง)
// ค่ามาจาก legacy-artifacts/fortune_dashboard.html (PROVINCES)

export interface Province {
  key: string;
  name: string;
  lat: number;
  lon: number;
}

export const PROVINCES: Province[] = [
  { key: "bangkok", name: "กรุงเทพมหานคร", lat: 13.75, lon: 100.5 },
  { key: "chiangmai", name: "เชียงใหม่", lat: 18.79, lon: 98.98 },
  { key: "khonkaen", name: "ขอนแก่น", lat: 16.44, lon: 102.83 },
  { key: "nakhonratchasima", name: "นครราชสีมา", lat: 14.98, lon: 102.1 },
  { key: "ubonratchathani", name: "อุบลราชธานี", lat: 15.23, lon: 104.86 },
  { key: "phuket", name: "ภูเก็ต", lat: 7.89, lon: 98.4 },
  { key: "songkhla", name: "สงขลา", lat: 7.2, lon: 100.6 },
  { key: "chonburi", name: "ชลบุรี", lat: 13.36, lon: 100.98 },
];

export const provinceByKey = (key: string): Province =>
  PROVINCES.find((p) => p.key === key) ?? PROVINCES[0];
