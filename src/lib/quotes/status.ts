export const QUOTE_STATUS_OPTIONS = [
  { value: "nhap", label: "Nháp", className: "border-gray-200 bg-gray-100 text-gray-800" },
  { value: "da_gui", label: "Đã gửi", className: "border-blue-200 bg-blue-100 text-blue-800" },
  {
    value: "da_chap_nhan",
    label: "Đã chấp nhận",
    className: "border-green-200 bg-green-100 text-green-800",
  },
  { value: "tu_choi", label: "Từ chối", className: "border-red-200 bg-red-100 text-red-800" },
  { value: "het_han", label: "Hết hạn", className: "border-orange-200 bg-orange-100 text-orange-800" },
] as const;

const FALLBACK_STATUS = {
  value: "nhap",
  label: "Không rõ",
  className: "border-gray-200 bg-gray-100 text-gray-800",
};

export function getQuoteStatusConfig(status: string) {
  return QUOTE_STATUS_OPTIONS.find((opt) => opt.value === status) ?? FALLBACK_STATUS;
}
