import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { CustomerForm } from "../../customer-form";
import type { CustomerRecord } from "@/lib/types/customer";

export default async function EditCustomerPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      "id, code, company_name, contact_name, phone, email, address, tax_code, type, industry, source, status, notes"
    )
    .eq("id", params.id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Sửa khách hàng</h1>
        <p className="text-sm text-muted-foreground">{customer.company_name}</p>
      </div>
      <CustomerForm mode="edit" customer={customer as CustomerRecord} />
    </div>
  );
}
