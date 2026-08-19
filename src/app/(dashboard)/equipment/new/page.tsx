import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { EquipmentForm } from "../equipment-form";
import type { CustomerOption, EquipmentRecord } from "../types";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function NewEquipmentPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  await requireRole(["admin", "inspector"]);

  const searchParams = await props.searchParams;
  const duplicateFromId = firstParam(searchParams.duplicateFrom).trim();

  const supabase = await createClient();
  const [{ data }, sourceResult] = await Promise.all([
    supabase.from("customers").select("id, code, company_name").order("company_name", { ascending: true }),
    duplicateFromId
      ? supabase
          .from("equipment")
          .select(
            "code, name, type, manufacturer, manufacture_year, serial_number, specifications, location, inspection_cycle, notes, spec_values, customer_id"
          )
          .eq("id", duplicateFromId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const customerOptions = (data ?? []) as CustomerOption[];
  const sourceEquipment = sourceResult.data;

  // PROMPT-36: nhân bản thiết bị -- điền sẵn EquipmentForm từ 1 thiết bị
  // nguồn, trừ id/code (thiết bị mới tự sinh mã riêng, 2 field này cũng
  // không được EquipmentForm đọc ở mode="create" nên để rỗng vô hại) và
  // ngày kiểm định gần nhất/hạn kiểm định/trạng thái (thiết bị mới chưa
  // từng được kiểm định, LUÔN bắt đầu từ "valid", không kế thừa
  // inactive/expired của thiết bị nguồn). Nếu duplicateFrom trỏ tới id
  // không tồn tại (đã xóa/sai) -- sourceEquipment là null, bỏ qua lặng lẽ,
  // hiện form trống như bình thường.
  const duplicateEquipment: EquipmentRecord | undefined = sourceEquipment
    ? {
        id: "",
        code: "",
        customer_id: sourceEquipment.customer_id,
        name: sourceEquipment.name,
        type: sourceEquipment.type,
        manufacturer: sourceEquipment.manufacturer,
        manufacture_year: sourceEquipment.manufacture_year,
        serial_number: sourceEquipment.serial_number,
        specifications: sourceEquipment.specifications,
        location: sourceEquipment.location,
        last_inspection_date: null,
        expiry_date: null,
        inspection_cycle: sourceEquipment.inspection_cycle,
        status: "valid",
        notes: sourceEquipment.notes,
        spec_values: sourceEquipment.spec_values,
      }
    : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">
          {sourceEquipment
            ? `Thêm thiết bị (nhân bản từ ${sourceEquipment.code} — ${sourceEquipment.name})`
            : "Thêm thiết bị"}
        </h1>
      </div>
      <EquipmentForm mode="create" equipment={duplicateEquipment} customerOptions={customerOptions} />
    </div>
  );
}
