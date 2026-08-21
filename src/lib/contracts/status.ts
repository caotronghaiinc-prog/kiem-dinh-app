export const CONTRACT_STATUS_OPTIONS = [
  {
    value: "dang_thuc_hien",
    label: "Đang thực hiện",
    className: "border-blue-200 bg-blue-100 text-blue-800",
  },
  {
    value: "hoan_thanh",
    label: "Hoàn thành",
    className: "border-green-200 bg-green-100 text-green-800",
  },
  {
    value: "da_thanh_ly",
    label: "Đã thanh lý",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  },
  { value: "huy", label: "Hủy", className: "border-red-200 bg-red-100 text-red-800" },
] as const;

export function getContractStatusConfig(status: string): {
  value: string;
  label: string;
  className: string;
} {
  return (
    CONTRACT_STATUS_OPTIONS.find((opt) => opt.value === status) ?? {
      value: status,
      label: status,
      className: "",
    }
  );
}
