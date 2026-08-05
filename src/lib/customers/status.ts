export const CUSTOMER_STATUS_CONFIG = {
  active: {
    label: "Đang hoạt động",
    className: "border-green-200 bg-green-100 text-green-800 hover:bg-green-100",
  },
  potential: {
    label: "Tiềm năng",
    className: "border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  inactive: {
    label: "Ngừng hoạt động",
    className: "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-100",
  },
} as const;

export type CustomerStatus = keyof typeof CUSTOMER_STATUS_CONFIG;

export const CUSTOMER_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: CUSTOMER_STATUS_CONFIG.active.label },
  { value: "potential", label: CUSTOMER_STATUS_CONFIG.potential.label },
  { value: "inactive", label: CUSTOMER_STATUS_CONFIG.inactive.label },
] as const;
