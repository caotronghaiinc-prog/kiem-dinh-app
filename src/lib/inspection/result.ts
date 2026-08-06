export const INSPECTION_RESULT_CONFIG = {
  pass: {
    label: "Đạt",
    className: "border-green-200 bg-green-100 text-green-800 hover:bg-green-100",
  },
  fail: {
    label: "Không đạt",
    className: "border-red-200 bg-red-100 text-red-800 hover:bg-red-100",
  },
  pending: {
    label: "Chờ kết quả",
    className: "border-yellow-200 bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
} as const;

export type InspectionResult = keyof typeof INSPECTION_RESULT_CONFIG;
