import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { InspectChecklistForm } from "./inspect-checklist-form";
import type { ChecklistItem, ChecklistTemplate, InspectEquipment } from "./types";

export default async function InspectEquipmentPage(
  props: {
    params: Promise<{ id: string }>;
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

  const { data: itemsData } = await supabase
    .from("equipment_checklist_items")
    .select(
      "id, section, item_order, item_code, title, technical_requirement, has_presence_flag, value_fields, is_required"
    )
    .eq("template_id", template.id)
    .order("item_order", { ascending: true });

  const items = (itemsData ?? []) as unknown as ChecklistItem[];

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
        <h1 className="text-2xl font-bold">Kiểm định hiện trường</h1>
        <p className="text-sm text-muted-foreground">
          {equipment.code} — {equipment.name} · {template.name}
        </p>
      </div>

      <InspectChecklistForm
        equipment={equipment as unknown as InspectEquipment}
        template={template as unknown as ChecklistTemplate}
        items={items}
      />
    </div>
  );
}
