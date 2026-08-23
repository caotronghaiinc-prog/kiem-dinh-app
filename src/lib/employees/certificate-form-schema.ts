import { z } from "zod";

export const certificateFormSchema = z.object({
  certificate_type: z.string().trim().optional(),
  certificate_number: z.string().trim().optional(),
  issued_by: z.string().trim().optional(),
  issued_date: z.string().trim().optional(),
  expiry_date: z.string().trim().min(1, "Vui lòng chọn hạn hiệu lực."),
  equipment_types: z.array(z.string()),
  scope_note: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type CertificateFormValues = z.infer<typeof certificateFormSchema>;

export const CERTIFICATE_EMPTY_VALUES: CertificateFormValues = {
  certificate_type: "",
  certificate_number: "",
  issued_by: "",
  issued_date: "",
  expiry_date: "",
  equipment_types: [],
  scope_note: "",
  note: "",
};
