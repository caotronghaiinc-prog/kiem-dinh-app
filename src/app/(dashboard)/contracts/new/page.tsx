import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "../contract-form";
import type { CustomerOption } from "../types";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function NewContractPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  await requireRole(["admin", "inspector"]);

  const searchParams = await props.searchParams;
  const fromQuoteId = firstParam(searchParams.fromQuote).trim();

  const supabase = await createClient();
  const [{ data }, quoteResult] = await Promise.all([
    supabase.from("customers").select("id, code, company_name").order("company_name", { ascending: true }),
    fromQuoteId
      ? supabase.from("quotes").select("customer_id, title, note").eq("id", fromQuoteId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const customerOptions: CustomerOption[] = data ?? [];
  const sourceQuote = quoteResult.data;

  // fromQuote trỏ tới báo giá không tồn tại/chưa có customer_id -- bỏ qua
  // prefill lặng lẽ, hiện form trống bình thường (nút "Tạo hợp đồng" trên
  // trang chi tiết báo giá đã tự chặn trường hợp này, đây chỉ là phòng hờ
  // nếu ai đó tự sửa URL).
  const prefill =
    sourceQuote && sourceQuote.customer_id
      ? { customer_id: sourceQuote.customer_id, title: sourceQuote.title, note: sourceQuote.note }
      : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Thêm hợp đồng</h1>
      </div>
      <ContractForm
        mode="create"
        customerOptions={customerOptions}
        fromQuoteId={prefill ? fromQuoteId : undefined}
        prefill={prefill}
      />
    </div>
  );
}
