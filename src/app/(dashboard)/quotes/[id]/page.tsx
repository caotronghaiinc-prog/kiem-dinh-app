import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import { getQuoteStatusConfig } from "@/lib/quotes/status";
import { AttachmentLink } from "../attachment-link";
import { QuoteItemsSection } from "./quote-items-section";
import { ExportQuoteButton } from "./export-quote-button";
import { CreateContractButton } from "./create-contract-button";
import type { QuoteDetail, QuoteItemRow } from "../types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("vi-VN");
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {value ? (
        <span className="whitespace-pre-wrap text-sm">{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground/70">Chưa có thông tin</span>
      )}
    </div>
  );
}

export default async function QuoteDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const [{ data: quoteData }, { data: itemsData }, profile] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, code, customer_id, customer_name_snapshot, customer_address_snapshot, customer_contact_snapshot, customer_phone_snapshot, customer_tax_code_snapshot, title, site_location, valid_until, status, total_value, note, quote_file_path, converted_contract_id"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("id, equipment_id, item_name, unit, quantity, unit_price, note, equipment:equipment(code, name)")
      .eq("quote_id", params.id)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    getCurrentUserProfile(),
  ]);

  if (!quoteData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy báo giá</h1>
        <p className="text-muted-foreground">Báo giá này không tồn tại hoặc đã bị xóa.</p>
        <Button asChild>
          <Link href="/quotes">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const quote = quoteData as unknown as QuoteDetail;
  const items = (itemsData ?? []) as unknown as QuoteItemRow[];
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";
  const statusConfig = getQuoteStatusConfig(quote.status);
  let convertedContractCode: string | null = null;

  if (quote.converted_contract_id) {
    const { data: contractData } = await supabase
      .from("contracts")
      .select("code")
      .eq("id", quote.converted_contract_id)
      .maybeSingle();
    convertedContractCode = contractData?.code ?? null;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <Link
        href="/quotes"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.code}</h1>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {quote.customer_name_snapshot}
            {!quote.customer_id && " (khách chưa có trong hệ thống)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportQuoteButton
            quoteId={quote.id}
            quote={{
              code: quote.code,
              customer_name_snapshot: quote.customer_name_snapshot,
              customer_address_snapshot: quote.customer_address_snapshot,
              customer_contact_snapshot: quote.customer_contact_snapshot,
              customer_phone_snapshot: quote.customer_phone_snapshot,
              customer_tax_code_snapshot: quote.customer_tax_code_snapshot,
              title: quote.title,
              valid_until: quote.valid_until,
              note: quote.note,
              site_location: quote.site_location,
            }}
            items={items}
          />
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/quotes/${quote.id}/edit`}>Sửa</Link>
            </Button>
          )}
          {canEdit && (
            <CreateContractButton
              quoteId={quote.id}
              hasCustomer={Boolean(quote.customer_id)}
              convertedContractId={quote.converted_contract_id}
              convertedContractCode={convertedContractCode}
            />
          )}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Tên/Nội dung báo giá" value={quote.title} />
          <InfoField label="Địa điểm thực hiện" value={quote.site_location} />
          <InfoField label="Thời hạn báo giá" value={formatDate(quote.valid_until)} />
          <InfoField label="Địa chỉ khách hàng" value={quote.customer_address_snapshot} />
          <InfoField label="Người liên hệ" value={quote.customer_contact_snapshot} />
          <InfoField label="Số điện thoại" value={quote.customer_phone_snapshot} />
          <InfoField label="Mã số thuế" value={quote.customer_tax_code_snapshot} />
          <InfoField label="Giá trị báo giá" value={formatCurrency(quote.total_value)} />
          <InfoField label="Ghi chú" value={quote.note} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              File báo giá đã xuất
            </span>
            {quote.quote_file_path ? (
              <AttachmentLink path={quote.quote_file_path} />
            ) : (
              <span className="text-sm text-muted-foreground/70">Chưa xuất file</span>
            )}
          </div>
        </div>
      </section>

      <QuoteItemsSection quoteId={quote.id} items={items} canEdit={canEdit} />
    </div>
  );
}
