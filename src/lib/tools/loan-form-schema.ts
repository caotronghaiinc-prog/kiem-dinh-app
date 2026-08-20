import { z } from "zod";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const loanFormSchema = z
  .object({
    borrower_id: z.string().trim().min(1, "Vui lòng chọn người mượn."),
    borrowed_at: z.string().trim().min(1, "Vui lòng chọn ngày mượn."),
    expected_return_at: z.string().trim().optional(),
    work_location: z.string().trim().min(1, "Vui lòng nhập nơi đang làm việc."),
    // "" nghĩa là "-- Không --" -- chuyển thành null khi submit.
    customer_id: z.string().trim().optional(),
    note: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (!data.expected_return_at) return true;
      // Chuỗi ngày dạng YYYY-MM-DD (input type="date") so sánh trực tiếp
      // theo thứ tự chữ cái là đúng thứ tự thời gian, không cần parse Date.
      return data.expected_return_at >= data.borrowed_at;
    },
    {
      message: "Ngày dự kiến trả phải từ ngày mượn trở đi.",
      path: ["expected_return_at"],
    }
  );

export type LoanFormValues = z.infer<typeof loanFormSchema>;

export const LOAN_EMPTY_VALUES: LoanFormValues = {
  borrower_id: "",
  borrowed_at: todayIso(),
  expected_return_at: "",
  work_location: "",
  customer_id: "",
  note: "",
};
