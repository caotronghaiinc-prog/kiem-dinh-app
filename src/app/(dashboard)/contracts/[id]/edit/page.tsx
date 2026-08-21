import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "../../contract-form";
import type { ContractRecord, CustomerOption } from "../../types";

export default async function EditContractPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const [{ data: contract, error }, { data: customersData }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, code, contract_no, customer_id, title, signed_date, total_value, status, contract_file_path, note"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("customers").select("id, code, company_name").order("company_name", { ascending: true }),
  ]);

  if (error || !contract) {
    notFound();
  }

  const customerOptions: CustomerOption[] = customersData ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Sửa hợp đồng</h1>
        <p className="text-sm text-muted-foreground">{contract.contract_no}</p>
      </div>
      <ContractForm
        mode="edit"
        contract={contract as unknown as ContractRecord}
        customerOptions={customerOptions}
      />
    </div>
  );
}
