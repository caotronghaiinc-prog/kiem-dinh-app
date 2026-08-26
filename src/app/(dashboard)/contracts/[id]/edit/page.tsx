import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "../../contract-form";
import type { ContractPerson, ContractRecord, CustomerOption } from "../../types";

export default async function EditContractPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const [
    { data: contract, error },
    { data: customersData },
    { data: inspectorsData },
    { data: responsiblesData },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, code, contract_no, customer_id, title, signed_date, total_value, status, contract_file_path, note, site_location, execution_time_note, contract_type_note, using_unit_name, using_unit_address, work_request_document_no"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("customers").select("id, code, company_name").order("company_name", { ascending: true }),
    // PROMPT-66: RPC hẹp (KHÔNG embed profiles) -- xem migration 0037.
    supabase.rpc("list_inspectors_for_assignment"),
    supabase
      .from("contract_technical_responsibles")
      .select("profile_id, is_requester")
      .eq("contract_id", params.id),
  ]);

  if (error || !contract) {
    notFound();
  }

  const customerOptions: CustomerOption[] = customersData ?? [];
  const inspectorOptions: ContractPerson[] = inspectorsData ?? [];

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
        inspectorOptions={inspectorOptions}
        initialTechnicalResponsibles={responsiblesData ?? []}
      />
    </div>
  );
}
