import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { EquipmentForm } from "../../equipment-form";
import type { EquipmentRecord } from "../../types";

export default async function EditEquipmentPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const { data: equipment, error } = await supabase
    .from("equipment")
    .select(
      "id, code, customer_id, name, type, manufacturer, manufacture_year, serial_number, specifications, location, last_inspection_date, expiry_date, inspection_cycle, status, notes, spec_values, customer:customers(code, company_name)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !equipment) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Sửa thiết bị</h1>
        <p className="text-sm text-muted-foreground">{equipment.name}</p>
      </div>
      <EquipmentForm mode="edit" equipment={equipment as unknown as EquipmentRecord} />
    </div>
  );
}
