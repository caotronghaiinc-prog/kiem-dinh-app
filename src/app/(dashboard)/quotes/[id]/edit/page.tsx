import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { QuoteForm } from "../../quote-form";
import type { CustomerOption, QuoteRecord } from "../../types";

export default async function EditQuotePage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const [{ data: quote, error }, { data: customersData }] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, code, customer_id, customer_name_snapshot, customer_address_snapshot, customer_contact_snapshot, customer_phone_snapshot, customer_tax_code_snapshot, title, site_location, valid_until, status, note, quote_file_path"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, code, company_name, address, contact_name, phone, tax_code")
      .order("company_name", { ascending: true }),
  ]);

  if (error || !quote) {
    notFound();
  }

  const customerOptions: CustomerOption[] = customersData ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Sửa báo giá</h1>
        <p className="text-sm text-muted-foreground">{quote.code}</p>
      </div>
      <QuoteForm mode="edit" quote={quote as unknown as QuoteRecord} customerOptions={customerOptions} />
    </div>
  );
}
