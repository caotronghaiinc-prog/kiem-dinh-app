import { AttachmentLink } from "../attachment-link";
import { AcceptanceDialog } from "./acceptance-dialog";
import { ExportAcceptanceButton } from "./export-acceptance-button";
import type { ContractDetail, ContractEquipmentRow } from "../types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("vi-VN");
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {value ? (
        <span className="whitespace-pre-wrap text-sm">{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground/70">Chưa có thông tin</span>
      )}
    </div>
  );
}

const RESULT_LABELS: Record<string, string> = {
  dat: "Đạt yêu cầu hoàn toàn",
  co_van_de: "Có vấn đề, ghi chú",
};

export function ContractAcceptanceSection({
  contract,
  equipment,
  canEdit,
}: {
  contract: ContractDetail;
  equipment: ContractEquipmentRow[];
  canEdit: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Nghiệm thu hợp đồng</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ExportAcceptanceButton contract={contract} customer={contract.customer} equipment={equipment} />
          {canEdit && <AcceptanceDialog contract={contract} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoField label="Ngày nghiệm thu" value={formatDate(contract.acceptance_date)} />
        <InfoField label="Địa điểm nghiệm thu" value={contract.acceptance_location} />
        <InfoField
          label="Kết quả kiểm định"
          value={contract.acceptance_result ? RESULT_LABELS[contract.acceptance_result] : null}
        />
        <InfoField label="Ghi chú vấn đề" value={contract.acceptance_note} />
        <InfoField label="Người đại diện Bên A" value={contract.representative_a_name} />
        <InfoField label="Chức vụ" value={contract.representative_a_title} />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Biên bản đã ký</span>
          {contract.acceptance_file_path ? (
            <AttachmentLink path={contract.acceptance_file_path} label="Xem biên bản đã ký" />
          ) : (
            <span className="text-sm text-muted-foreground/70">Chưa có file</span>
          )}
        </div>
      </div>
    </section>
  );
}
