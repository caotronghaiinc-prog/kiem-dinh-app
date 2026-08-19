import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ImportEquipmentForm } from "./import-equipment-form";
import type { CustomerOption } from "../types";

export default async function ImportEquipmentPage() {
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, code, company_name")
    .order("company_name", { ascending: true });

  const customerOptions = (data ?? []) as CustomerOption[];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Import Excel thiết bị hàng loạt</h1>
        <p className="text-sm text-muted-foreground">
          Nhập nhiều thiết bị cùng lúc cho 1 khách hàng từ file Excel. Chỉ nhập các field cơ bản --
          sau khi import xong, bổ sung thông số kỹ thuật riêng theo loại bằng cách sửa từng thiết bị.
        </p>
      </div>
      <ImportEquipmentForm customerOptions={customerOptions} />
    </div>
  );
}
