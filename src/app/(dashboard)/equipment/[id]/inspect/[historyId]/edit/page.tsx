import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { createClient } from "@/lib/supabase/server";
import { InspectChecklistForm, type InspectChecklistInitialData } from "../../inspect-checklist-form";
import type { ChecklistItem, ChecklistTemplate, InspectEquipment } from "../../types";

export default async function EditInspectionPage(
  props: {
    params: Promise<{ id: string; historyId: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, code, name, type")
    .eq("id", params.id)
    .maybeSingle();

  if (!equipment || !equipment.type) {
    notFound();
  }

  // .limit(1) thay vì .maybeSingle() -- phòng trường hợp về sau lỡ có >1
  // template cùng equipment_type (không có unique constraint ở migration
  // 0012), tránh lỗi "multiple rows returned" thay vì chỉ lấy dòng đầu.
  const { data: templates } = await supabase
    .from("equipment_checklist_templates")
    .select("id, name, source_document")
    .eq("equipment_type", equipment.type)
    .limit(1);

  const template = templates?.[0];
  if (!template) {
    notFound();
  }

  const [{ data: itemsData }, { data: historyRow }, { data: resultsData }, { data: photosData }, profile] =
    await Promise.all([
      supabase
        .from("equipment_checklist_items")
        .select(
          "id, section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields, is_required"
        )
        .eq("template_id", template.id)
        .order("item_order", { ascending: true }),
      supabase
        .from("inspection_history")
        .select(
          "id, inspection_date, report_number, new_expiry_date, notes, attachment_url, is_locked, report_metadata"
        )
        .eq("id", params.historyId)
        .eq("equipment_id", equipment.id)
        .maybeSingle(),
      supabase
        .from("inspection_checklist_results")
        .select("checklist_item_id, result, presence_value, values, note")
        .eq("inspection_history_id", params.historyId),
      supabase
        .from("inspection_photos")
        .select("id, category, storage_path")
        .eq("inspection_history_id", params.historyId),
      getCurrentUserProfile(),
    ]);

  const items = (itemsData ?? []) as unknown as ChecklistItem[];

  if (!historyRow) {
    notFound();
  }

  // PROMPT-50: bản ghi đã khóa (xuất biên bản Word rồi) -- inspector không
  // được sửa nữa (RLS migration 0002 cũng chặn ở tầng DB, đây chỉ là chặn
  // sớm để không vào được form, phòng trường hợp tự gõ URL -- nút "Sửa" ở
  // inspection-history-section.tsx đã ẩn sẵn cho trường hợp này).
  if (historyRow.is_locked && profile?.role === "inspector") {
    notFound();
  }

  const initialData: InspectChecklistInitialData = {
    id: historyRow.id,
    inspection_date: historyRow.inspection_date,
    report_number: historyRow.report_number,
    new_expiry_date: historyRow.new_expiry_date,
    notes: historyRow.notes,
    attachment_url: historyRow.attachment_url,
    report_metadata:
      historyRow.report_metadata as unknown as InspectChecklistInitialData["report_metadata"],
    checklistResults: (resultsData ??
      []) as unknown as InspectChecklistInitialData["checklistResults"],
    photos: (photosData ?? []) as unknown as InspectChecklistInitialData["photos"],
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <Link
        href={`/equipment/${equipment.id}`}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại chi tiết thiết bị
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Sửa bản ghi kiểm định</h1>
        <p className="text-sm text-muted-foreground">
          {equipment.code} — {equipment.name} · {template.name}
        </p>
      </div>

      <InspectChecklistForm
        equipment={equipment as unknown as InspectEquipment}
        template={template as unknown as ChecklistTemplate}
        items={items}
        mode="edit"
        initialData={initialData}
      />
    </div>
  );
}
