import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { EquipmentForm } from "../equipment-form";
import type { CustomerOption } from "../types";

export default async function NewEquipmentPage() {
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, code, company_name")
    .order("company_name", { ascending: true });

  const customerOptions = (data ?? []) as CustomerOption[];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Thêm thiết bị</h1>
      </div>
      <EquipmentForm mode="create" customerOptions={customerOptions} />
    </div>
  );
}
