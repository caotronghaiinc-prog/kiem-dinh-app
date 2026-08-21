import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "../quote-form";
import type { CustomerOption } from "../types";

export default async function NewQuotePage() {
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, code, company_name, address, contact_name, phone, tax_code")
    .order("company_name", { ascending: true });

  const customerOptions: CustomerOption[] = data ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Tạo báo giá</h1>
      </div>
      <QuoteForm mode="create" customerOptions={customerOptions} />
    </div>
  );
}
