const DIGIT_NAMES = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

// Tên đơn vị theo từng nhóm 3 chữ số, tính từ phải sang -- đủ cho numeric(14,0)
// (tối đa ~99 nghìn tỷ, 14 chữ số), không cần thuật toán lặp tổng quát.
const GROUP_UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

// "một"/"năm" đổi thành "mốt"/"lăm" khi đứng sau hàng chục khác 0 (vd 21 =
// "hai mươi mốt", 25 = "hai mươi lăm") -- KHÔNG đổi khi hàng chục = 0 (vd
// 105 = "một trăm linh năm", không phải "linh lăm").
function unitWord(unit: number, tens: number): string {
  if (unit === 1 && tens >= 2) return "mốt";
  if (unit === 5 && tens >= 1) return "lăm";
  return DIGIT_NAMES[unit];
}

// Đọc 1 nhóm 3 chữ số (0-999) thành chữ. isLeading = nhóm cao nhất (khác 0
// đầu tiên) của TOÀN BỘ số -- nhóm này không cần "không trăm" khi hàng trăm
// = 0 (vd nhóm triệu = 5 -> "năm triệu", không phải "không trăm không mươi
// năm triệu"). Các nhóm ở giữa/dưới (không phải leading) mà khác 0 vẫn phải
// đọc đủ "không trăm"/"linh" cho đúng chuẩn (vd 1.005.000 = "một triệu không
// trăm linh năm nghìn").
function readGroup(value: number, isLeading: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${DIGIT_NAMES[hundreds]} trăm`);
  } else if (!isLeading) {
    parts.push("không trăm");
  }

  if (tens === 0) {
    if (units > 0) {
      // "linh" chỉ xuất hiện khi đã có phần trước đó (trăm hoặc nhóm không
      // phải leading) -- nhóm leading chỉ có 1 chữ số thì đọc thẳng, không
      // "linh" (vd nhóm leading = 5 -> "năm", không phải "linh năm").
      if (hundreds > 0 || !isLeading) {
        parts.push(`linh ${unitWord(units, tens)}`);
      } else {
        parts.push(unitWord(units, tens));
      }
    }
  } else if (tens === 1) {
    parts.push(units > 0 ? `mười ${unitWord(units, tens)}` : "mười");
  } else {
    parts.push(units > 0 ? `${DIGIT_NAMES[tens]} mươi ${unitWord(units, tens)}` : `${DIGIT_NAMES[tens]} mươi`);
  }

  return parts.join(" ");
}

/**
 * Đọc số nguyên (tiền VNĐ, không âm) thành chữ tiếng Việt -- KHÔNG kèm đơn
 * vị "đồng" (gọi nơi dùng tự thêm, xem contract-acceptance.ts: "Bằng chữ:
 * <kết quả> đồng./."). Viết mới cho PROMPT-61, chưa có sẵn trong repo.
 */
export function numberToVietnameseWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "Không";

  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  // groups[0] = nhóm đơn vị (thấp nhất), groups[cuối] = nhóm cao nhất.

  let leadingIndex = -1;
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] !== 0) {
      leadingIndex = i;
      break;
    }
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const groupValue = groups[i];
    if (groupValue === 0) continue;
    const words = readGroup(groupValue, i === leadingIndex);
    const unitName = GROUP_UNITS[i] ?? "";
    parts.push(unitName ? `${words} ${unitName}` : words);
  }

  const sentence = parts.join(" ").trim();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
