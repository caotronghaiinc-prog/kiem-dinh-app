import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CUSTOMER_STATUS_CONFIG } from "@/lib/customers/status";
import type { CustomerRecord } from "@/lib/types/customer";
import { CustomerDetailTabs } from "./customer-detail-tabs";
import type { EquipmentRow, InspectionRow } from "./types";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const [{ data: customer }, { data: equipmentData }, { data: inspectionData }, profile] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("equipment")
        .select("id, code, name, type, expiry_date, status")
        .eq("customer_id", params.id)
        .order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("inspection_history")
        .select(
          "id, inspection_date, result, report_number, new_expiry_date, equipment!inner(customer_id, name), inspector:profiles(full_name)"
        )
        .eq("equipment.customer_id", params.id)
        .order("inspection_date", { ascending: false }),
      getCurrentUserProfile(),
    ]);

  if (!customer) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy khách hàng</h1>
        <p className="text-muted-foreground">
          Khách hàng này không tồn tại hoặc đã bị xóa.
        </p>
        <Button asChild>
          <Link href="/customers">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";
  const equipment = (equipmentData ?? []) as unknown as EquipmentRow[];
  const inspections = (inspectionData ?? []) as unknown as InspectionRow[];
  const status =
    CUSTOMER_STATUS_CONFIG[customer.status as keyof typeof CUSTOMER_STATUS_CONFIG] ??
    CUSTOMER_STATUS_CONFIG.potential;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <Link
        href="/customers"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{customer.company_name}</h1>
          <Badge variant="outline">{customer.code}</Badge>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>
        {isAdmin && (
          <Button asChild variant="outline">
            <Link href={`/customers/${customer.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </div>

      <CustomerDetailTabs
        customer={customer as CustomerRecord}
        equipment={equipment}
        inspections={inspections}
        isAdmin={isAdmin}
      />
    </div>
  );
}
