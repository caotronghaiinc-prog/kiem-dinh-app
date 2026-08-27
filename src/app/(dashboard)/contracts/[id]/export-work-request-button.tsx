"use client";

import { WorkRequestPreviewDialog } from "./work-request-preview-dialog";
import type { ContractDetail, ContractEquipmentRow, ContractPerson } from "../types";

// PROMPT-67: giữ nguyên tên file/component (chỗ gọi ở contract-equipment-
// section.tsx không cần đổi) -- đổi hành vi bên trong từ tải thẳng sang mở
// dialog xem trước + sửa trực tiếp (work-request-preview-dialog.tsx).
export function ExportWorkRequestButton({
  contract,
  equipment,
  inspectorOptions,
}: {
  contract: ContractDetail;
  equipment: ContractEquipmentRow[];
  inspectorOptions: ContractPerson[];
}) {
  return (
    <WorkRequestPreviewDialog contract={contract} equipment={equipment} inspectorOptions={inspectorOptions} />
  );
}
