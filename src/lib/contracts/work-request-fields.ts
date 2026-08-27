import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkRequestFieldValues {
  site_location?: string;
  execution_time_note?: string;
  contract_type_note?: string;
  using_unit_name?: string;
  using_unit_address?: string;
  work_request_document_no?: string;
}

// PROMPT-67: TÁCH từ contract-form.tsx (PROMPT-66) để dùng chung với
// work-request-preview-dialog.tsx mới -- tránh lệch logic giữa 2 nơi cùng
// sửa dữ liệu "Giấy đề nghị thực hiện công việc". Chuyển giá trị form ("" =
// trống) sang payload cột contracts (null).
export function buildWorkRequestPayload(values: WorkRequestFieldValues) {
  return {
    site_location: values.site_location || null,
    execution_time_note: values.execution_time_note || null,
    contract_type_note: values.contract_type_note || null,
    using_unit_name: values.using_unit_name || null,
    using_unit_address: values.using_unit_address || null,
    work_request_document_no: values.work_request_document_no || null,
  };
}

// Đồng bộ tổ kiểm định viên tham gia -- xóa hết rồi chèn lại, TÁCH từ
// contract-form.tsx nguyên xi (kể cả cách xử lý lỗi không throw, chỉ trả về
// message để nơi gọi tự toast).
export async function syncTechnicalResponsibles(
  supabase: SupabaseClient,
  contractId: string,
  technicalResponsibleIds: string[],
  requesterId: string
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase
    .from("contract_technical_responsibles")
    .delete()
    .eq("contract_id", contractId);
  if (deleteError) return { error: "Lưu tổ kiểm định viên tham gia thất bại." };

  if (technicalResponsibleIds.length === 0) return { error: null };

  const { error: insertError } = await supabase.from("contract_technical_responsibles").insert(
    technicalResponsibleIds.map((profile_id) => ({
      contract_id: contractId,
      profile_id,
      is_requester: profile_id === requesterId,
    }))
  );
  return { error: insertError ? "Lưu tổ kiểm định viên tham gia thất bại." : null };
}
