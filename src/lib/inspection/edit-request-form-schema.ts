import { z } from "zod";

export const editRequestFormSchema = z.object({
  reason: z.string().trim().min(1, "Vui lòng nhập lý do cần sửa."),
});

export type EditRequestFormValues = z.infer<typeof editRequestFormSchema>;

export const EDIT_REQUEST_EMPTY_VALUES: EditRequestFormValues = { reason: "" };
