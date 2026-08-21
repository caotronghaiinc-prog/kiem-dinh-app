// PROMPT-57: định dạng tiền VNĐ dùng chung cho module Hợp đồng (giá trị hợp
// đồng, đã thu, công nợ) -- công ty chỉ giao dịch VNĐ, không cần đa tiền tệ.
export function formatCurrency(value: number): string {
  return `${value.toLocaleString("vi-VN")} đ`;
}

// Định dạng số có phân cách nghìn KHÔNG kèm đơn vị -- dùng cho input số
// (hiển thị "15.000.000" trong khi field.value vẫn lưu chuỗi số nguyên
// thuần "15000000").
export function formatNumberInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return Number(digitsOnly).toLocaleString("vi-VN");
}
