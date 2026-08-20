import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { Button } from "@/components/ui/button";
import { ExpiryIndicator } from "@/components/equipment/expiry-indicator";
import { getEquipmentSpecFields } from "@/lib/equipment/spec-fields";
import { InspectionHistorySection } from "./inspection-history-section";
import type { EquipmentDetail, InspectionHistoryDetailRow } from "./types";

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

export default async function EquipmentDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const [{ data: equipmentData }, { data: historyData }, profile] = await Promise.all([
    supabase
      .from("equipment")
      .select(
        "id, code, name, type, manufacturer, manufacture_year, serial_number, specifications, location, last_inspection_date, expiry_date, inspection_cycle, status, notes, spec_values, customer_id, customer:customers(company_name)"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("inspection_history")
      .select(
        "id, inspection_date, result, report_number, new_expiry_date, notes, attachment_url, is_locked, inspector:profiles(full_name), photos:inspection_photos(id, category, storage_path), edit_requests:inspection_edit_requests(id, reason, status, created_at, requested_by:profiles!inspection_edit_requests_requested_by_fkey(full_name))"
      )
      .eq("equipment_id", params.id)
      .order("inspection_date", { ascending: false }),
    getCurrentUserProfile(),
  ]);

  // PROMPT-19: loại thiết bị có checklist riêng (equipment_checklist_templates,
  // pilot "Thiết bị nâng - Cầu trục") thì "+ Thêm bản ghi kiểm định" điều
  // hướng sang /equipment/[id]/inspect thay vì mở AddInspectionDialog cũ.
  const { data: checklistTemplates } = equipmentData?.type
    ? await supabase
        .from("equipment_checklist_templates")
        .select("id")
        .eq("equipment_type", equipmentData.type)
        .limit(1)
    : { data: null };
  const hasChecklistTemplate = Boolean(checklistTemplates?.[0]);

  if (!equipmentData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy thiết bị</h1>
        <p className="text-muted-foreground">
          Thiết bị này không tồn tại hoặc đã bị xóa.
        </p>
        <Button asChild>
          <Link href="/equipment">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const equipment = equipmentData as unknown as EquipmentDetail;
  // PROMPT-51: mirror cách ToolListItem.activeLoan (PROMPT-43) tính "lượt
  // đang mở" -- lấy hết edit_requests của bản ghi rồi lọc status='pending'
  // ở tầng JS thay vì filter embedded resource trong câu select (PostgREST
  // filter lồng qua nhiều bảng phức tạp hơn cần thiết cho dataset nhỏ này).
  const history: InspectionHistoryDetailRow[] = (historyData ?? []).map((row) => {
    const editRequests = (row.edit_requests ?? []) as unknown as {
      id: string;
      reason: string;
      status: string;
      created_at: string;
      requested_by: { full_name: string | null } | null;
    }[];
    const pending = editRequests.find((r) => r.status === "pending") ?? null;
    return {
      ...(row as unknown as Omit<InspectionHistoryDetailRow, "pending_edit_request">),
      pending_edit_request: pending
        ? {
            id: pending.id,
            reason: pending.reason,
            requested_by_name: pending.requested_by?.full_name ?? null,
            created_at: pending.created_at,
          }
        : null,
    };
  });
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";
  const specFields = getEquipmentSpecFields(equipment.type);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <Link
        href="/equipment"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">
              {equipment.code} — {equipment.name}
            </h1>
            <ExpiryIndicator expiryDate={equipment.expiry_date} status={equipment.status} />
          </div>
          {equipment.customer && (
            <Link
              href={`/customers/${equipment.customer_id}`}
              className="w-fit text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {equipment.customer.company_name}
            </Link>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/equipment/${equipment.id}/edit`}>Sửa</Link>
            </Button>
            {/* PROMPT-36: điền sẵn form thêm mới từ thiết bị này -- không
                sửa/ghi đè thiết bị nguồn, chỉ là điểm khởi đầu cho 1 thiết
                bị mới (xem equipment/new/page.tsx). */}
            <Button asChild variant="outline">
              <Link href={`/equipment/new?duplicateFrom=${equipment.id}`}>Nhân bản</Link>
            </Button>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Loại thiết bị" value={equipment.type} />
          <InfoField label="Hãng sản xuất" value={equipment.manufacturer} />
          <InfoField
            label="Năm sản xuất"
            value={equipment.manufacture_year ? String(equipment.manufacture_year) : null}
          />
          <InfoField label="Số serial" value={equipment.serial_number} />
          <InfoField label="Vị trí lắp đặt" value={equipment.location} />
          <InfoField label="Thông số kỹ thuật" value={equipment.specifications} />
          {specFields.map((f) => {
            const value = equipment.spec_values?.[f.key];
            if (!value) return null;
            return (
              <InfoField
                key={f.key}
                label={f.unit ? `${f.label} (${f.unit})` : f.label}
                value={value}
              />
            );
          })}
          <InfoField
            label="Ngày kiểm định gần nhất"
            value={formatDate(equipment.last_inspection_date)}
          />
          <InfoField label="Hạn kiểm định" value={formatDate(equipment.expiry_date)} />
          <InfoField
            label="Chu kỳ kiểm định"
            value={equipment.inspection_cycle ? `${equipment.inspection_cycle} tháng` : null}
          />
          <InfoField label="Ghi chú" value={equipment.notes} />
        </div>
      </section>

      <InspectionHistorySection
        equipmentId={equipment.id}
        equipmentType={equipment.type}
        equipmentInspectionCycle={equipment.inspection_cycle}
        history={history}
        canEdit={canEdit}
        userRole={profile?.role ?? null}
        hasChecklistTemplate={hasChecklistTemplate}
      />
    </div>
  );
}
