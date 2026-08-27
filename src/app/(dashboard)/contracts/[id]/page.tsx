import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getContractStatusConfig } from "@/lib/contracts/status";
import { AttachmentLink } from "../attachment-link";
import { ContractEquipmentSection } from "./contract-equipment-section";
import { ContractPaymentsSection } from "./contract-payments-section";
import { ContractAcceptanceSection } from "./contract-acceptance-section";
import type { ContractDetail, ContractEquipmentRow, ContractPaymentRow, ContractPerson } from "../types";

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

export default async function ContractDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const [
    { data: contractData },
    { data: equipmentData },
    { data: paymentsData },
    profile,
    { data: responsiblesData },
    { data: inspectorsData },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, code, contract_no, customer_id, title, signed_date, total_value, paid_total, status, contract_file_path, note, acceptance_date, acceptance_location, acceptance_result, acceptance_note, representative_a_name, representative_a_title, acceptance_copies_note, acceptance_file_path, site_location, execution_time_note, contract_type_note, using_unit_name, using_unit_address, work_request_document_no, customer:customers(company_name, address, contact_name, tax_code, phone)"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("contract_equipment")
      .select(
        "id, equipment_id, unit, unit_price, quantity, so_tem, ngay_kiem_dinh, equipment:equipment(code, name, type, serial_number, spec_values)"
      )
      .eq("contract_id", params.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("contract_payments")
      .select("id, amount, paid_date, method, note, created_by:profiles(full_name)")
      .eq("contract_id", params.id)
      .order("paid_date", { ascending: false }),
    getCurrentUserProfile(),
    supabase
      .from("contract_technical_responsibles")
      .select("profile_id, is_requester")
      .eq("contract_id", params.id),
    // PROMPT-66: RPC hẹp (KHÔNG embed profiles), dùng để tra tên hiển thị
    // của technicalResponsibles/requester -- xem migration 0037.
    supabase.rpc("list_inspectors_for_assignment"),
  ]);

  if (!contractData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy hợp đồng</h1>
        <p className="text-muted-foreground">Hợp đồng này không tồn tại hoặc đã bị xóa.</p>
        <Button asChild>
          <Link href="/contracts">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const equipment = (equipmentData ?? []) as unknown as ContractEquipmentRow[];
  const payments = (paymentsData ?? []) as unknown as ContractPaymentRow[];
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";

  // PROMPT-66: khớp tên bằng tay (KHÔNG qua PostgREST embed, tránh bẫy
  // PGRST201) -- contract_technical_responsibles chỉ lưu profile_id thô,
  // full_name tra ngược qua RPC list_inspectors_for_assignment(). Nếu 1
  // profile_id không có trong directory (vd tài khoản đã active=false sau
  // khi được gán) thì full_name ra null, hiện "—"/placeholder "……", không
  // throw lỗi -- trường hợp hiếm, chấp nhận được cho quy mô đội hiện tại.
  const inspectors = (inspectorsData ?? []) as unknown as ContractPerson[];
  const directory = new Map(inspectors.map((p) => [p.id, p.full_name]));
  const responsibleRows = responsiblesData ?? [];
  const technicalResponsibles: ContractPerson[] = responsibleRows.map((r) => ({
    id: r.profile_id,
    full_name: directory.get(r.profile_id) ?? null,
  }));
  const requesterRow = responsibleRows.find((r) => r.is_requester);
  const requester: ContractPerson | null = requesterRow
    ? { id: requesterRow.profile_id, full_name: directory.get(requesterRow.profile_id) ?? null }
    : null;

  const contract = {
    ...(contractData as unknown as ContractDetail),
    technicalResponsibles,
    requester,
  };
  const statusConfig = getContractStatusConfig(contract.status);
  const debt = contract.total_value - contract.paid_total;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <Link
        href="/contracts"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">
              {contract.code} — {contract.contract_no}
            </h1>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
          {contract.customer && (
            <Link
              href={`/customers/${contract.customer_id}`}
              className="w-fit text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {contract.customer.company_name}
            </Link>
          )}
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/contracts/${contract.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Tên/Nội dung hợp đồng" value={contract.title} />
          <InfoField label="Ngày ký" value={formatDate(contract.signed_date)} />
          <InfoField label="Giá trị hợp đồng" value={formatCurrency(contract.total_value)} />
          <InfoField
            label="Còn nợ"
            value={formatCurrency(debt)}
          />
          <InfoField label="Ghi chú" value={contract.note} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">File hợp đồng</span>
            {contract.contract_file_path ? (
              <AttachmentLink path={contract.contract_file_path} />
            ) : (
              <span className="text-sm text-muted-foreground/70">Chưa có file</span>
            )}
          </div>
        </div>
      </section>

      <ContractEquipmentSection
        contract={contract}
        equipment={equipment}
        canEdit={canEdit}
        inspectorOptions={inspectors}
      />

      <ContractPaymentsSection
        contractId={contract.id}
        payments={payments}
        totalValue={contract.total_value}
        paidTotal={contract.paid_total}
        canEdit={canEdit}
      />

      <ContractAcceptanceSection contract={contract} equipment={equipment} canEdit={canEdit} />
    </div>
  );
}
