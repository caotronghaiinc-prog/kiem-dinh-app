// PROMPT-62: thông tin pháp nhân INCERT dùng cho letterhead/footer báo giá
// (src/lib/reports/quote-export.ts). Từ PROMPT-64, cũng được tái dùng cho
// "Bên B" trong Biên bản nghiệm thu (contract-acceptance.ts) -- trước đó
// (PROMPT-61/62) Biên bản nghiệm thu dùng pháp nhân INCOSAF riêng, Hải đã
// xác nhận đổi hẳn sang dùng chung INCERT, không giữ 2 pháp nhân song song
// nữa.
export const INCERT_COMPANY = {
  name: "CÔNG TY CỔ PHẦN KIỂM ĐỊNH KỸ THUẬT AN TOÀN INCERT",
  address: "Số 12 Đầm Sen 20, phường Ngũ Hành Sơn, TP. Đà Nẵng",
  email: "incertjsc@gmail.com",
  hotline: "0936565579",
};
