"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";
import { buildQuoteDocx } from "@/lib/reports/quote-export";
import type { QuoteItemRow, QuoteRecord } from "../types";

interface FieldValues {
  customer_name_snapshot: string;
  customer_address_snapshot: string;
  customer_contact_snapshot: string;
  customer_phone_snapshot: string;
  customer_tax_code_snapshot: string;
  title: string;
  site_location: string;
  valid_until: string;
  note: string;
}

function initialValues(quote: QuoteRecord): FieldValues {
  return {
    customer_name_snapshot: quote.customer_name_snapshot,
    customer_address_snapshot: quote.customer_address_snapshot ?? "",
    customer_contact_snapshot: quote.customer_contact_snapshot ?? "",
    customer_phone_snapshot: quote.customer_phone_snapshot ?? "",
    customer_tax_code_snapshot: quote.customer_tax_code_snapshot ?? "",
    title: quote.title ?? "",
    site_location: quote.site_location ?? "",
    valid_until: quote.valid_until ?? "",
    note: quote.note ?? "",
  };
}

function formatMoney(value: number): string {
  return Math.round(value).toLocaleString("vi-VN");
}

function formatDateVi(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN");
}

// PROMPT-67: mirror phép tính trong buildQuoteTable() của quote-export.ts
// -- KHÔNG sửa file đó (giữ nguyên "hàm thuần buildXxxDocx"), tính lại tổng
// ở đây riêng cho panel xem trước.
function calcTotals(items: QuoteItemRow[]) {
  const totalBeforeVat = items.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  const vat = Math.round(totalBeforeVat * 0.08);
  return { totalBeforeVat, vat, grandTotal: totalBeforeVat + vat };
}

// PROMPT-67: thay ExportQuoteButton từ tải thẳng bằng dialog xem trước +
// sửa trực tiếp -- mỗi dòng nội dung là 1 ô nhập thật, panel bên trái đọc
// state ĐANG GÕ DỞ để cập nhật theo thời gian thực. KHÔNG sửa customer_id
// (quan hệ dữ liệu, vẫn qua trang /quotes/[id]/edit) -- chỉ 9 field snapshot/
// văn bản. Nút "Lưu & Tải xuống" PHẢI giữ đúng hành vi upload Storage + ghi
// quote_file_path như ExportQuoteButton cũ, không được bỏ sót.
export function QuotePreviewDialog({
  quoteId,
  quote,
  items,
}: {
  quoteId: string;
  quote: QuoteRecord;
  items: QuoteItemRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [values, setValues] = useState<FieldValues>(() => initialValues(quote));

  function resetState() {
    setValues(initialValues(quote));
    setNameError(null);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) resetState();
    setOpen(next);
  }

  function updateField(key: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const { totalBeforeVat, vat, grandTotal } = calcTotals(items);

  async function handleSaveAndDownload() {
    setNameError(null);
    if (!values.customer_name_snapshot.trim()) {
      setNameError("Vui lòng nhập tên khách hàng.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      customer_name_snapshot: values.customer_name_snapshot.trim(),
      customer_address_snapshot: values.customer_address_snapshot || null,
      customer_contact_snapshot: values.customer_contact_snapshot || null,
      customer_phone_snapshot: values.customer_phone_snapshot || null,
      customer_tax_code_snapshot: values.customer_tax_code_snapshot || null,
      title: values.title || null,
      site_location: values.site_location || null,
      valid_until: values.valid_until || null,
      note: values.note || null,
    };

    const { error: updateError } = await supabase.from("quotes").update(payload).eq("id", quoteId);
    if (updateError) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu báo giá thất bại",
        description: logAndGetSafeMessage(updateError, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    try {
      const blob = await buildQuoteDocx({ code: quote.code, ...payload }, items);
      const fileName = `Bao-gia-${quote.code}.docx`;

      // Lưu lại bản đã xuất vào Storage + cập nhật quotes.quote_file_path
      // ("lưu lại bản đã gửi khách") -- copy nguyên hành vi ExportQuoteButton
      // cũ, KHÔNG được bỏ sót bước này (quyết định PROMPT-67).
      const path = `quote-files/${quoteId}/${crypto.randomUUID()}.docx`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      if (uploadError) throw uploadError;

      const { error: pathError } = await supabase
        .from("quotes")
        .update({ quote_file_path: path })
        .eq("id", quoteId);
      if (pathError) throw pathError;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Đã lưu và tải báo giá" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Tải file báo giá thất bại",
        description: logAndGetSafeMessage(
          error,
          "Dữ liệu đã lưu nhưng tải file lỗi, vui lòng thử xuất lại."
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={items.length === 0}>
          <Download className="h-4 w-4" />
          Xuất báo giá
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xem trước & sửa Báo giá</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="text-center font-semibold">BÁO GIÁ</p>
            <p>
              <span className="font-medium">Kính gửi: </span>
              {values.customer_name_snapshot.trim() || "……"}
            </p>
            {values.customer_address_snapshot.trim() && <p>Địa chỉ: {values.customer_address_snapshot}</p>}
            {values.site_location.trim() && <p>Địa điểm thực hiện: {values.site_location}</p>}

            <div className="overflow-x-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Tên công việc / hạng mục</th>
                    <th className="p-2 text-right">SL</th>
                    <th className="p-2 text-right">Đơn giá</th>
                    <th className="p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{row.item_name}</td>
                      <td className="p-2 text-right">{row.quantity}</td>
                      <td className="p-2 text-right">{formatMoney(row.unit_price)}</td>
                      <td className="p-2 text-right">{formatMoney(row.quantity * row.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Cộng chưa VAT:
                    </td>
                    <td className="p-2 text-right font-medium">{formatMoney(totalBeforeVat)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Thuế VAT (8%):
                    </td>
                    <td className="p-2 text-right font-medium">{formatMoney(vat)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-semibold">
                      TỔNG CỘNG:
                    </td>
                    <td className="p-2 text-right font-semibold">{formatMoney(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium">GHI CHÚ:</p>
              <p>1. Đơn giá trên chưa bao gồm chi phí di chuyển, lưu trú (nếu có) – sẽ thỏa thuận thêm theo thực tế.</p>
              <p>2. Thuế VAT 8% áp dụng theo quy định hiện hành.</p>
              <p>3. Thời gian thực hiện: Sau khi nhận được xác nhận hợp đồng và đủ điều kiện triển khai.</p>
              <p>4. Kết quả: Cấp đầy đủ hồ sơ kiểm định theo quy định.</p>
              {values.valid_until && <p>5. Báo giá có hiệu lực đến hết ngày {formatDateVi(values.valid_until)}.</p>}
              {values.note.trim() && <p>{values.note}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="qp-customer-name" className="text-sm font-medium">
                  Tên khách hàng *
                </label>
                <Input
                  id="qp-customer-name"
                  value={values.customer_name_snapshot}
                  onChange={(e) => updateField("customer_name_snapshot", e.target.value)}
                />
                {nameError && <p className="text-[0.8rem] font-medium text-destructive">{nameError}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-customer-address" className="text-sm font-medium">
                  Địa chỉ
                </label>
                <Input
                  id="qp-customer-address"
                  value={values.customer_address_snapshot}
                  onChange={(e) => updateField("customer_address_snapshot", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-customer-contact" className="text-sm font-medium">
                  Người liên hệ
                </label>
                <Input
                  id="qp-customer-contact"
                  value={values.customer_contact_snapshot}
                  onChange={(e) => updateField("customer_contact_snapshot", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-customer-phone" className="text-sm font-medium">
                  Số điện thoại
                </label>
                <Input
                  id="qp-customer-phone"
                  value={values.customer_phone_snapshot}
                  onChange={(e) => updateField("customer_phone_snapshot", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-customer-tax-code" className="text-sm font-medium">
                  Mã số thuế
                </label>
                <Input
                  id="qp-customer-tax-code"
                  value={values.customer_tax_code_snapshot}
                  onChange={(e) => updateField("customer_tax_code_snapshot", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label htmlFor="qp-title" className="text-sm font-medium">
                  Tên/Nội dung báo giá
                </label>
                <Input
                  id="qp-title"
                  value={values.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-site-location" className="text-sm font-medium">
                  Địa điểm thực hiện (nếu có)
                </label>
                <Input
                  id="qp-site-location"
                  value={values.site_location}
                  onChange={(e) => updateField("site_location", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="qp-valid-until" className="text-sm font-medium">
                  Thời hạn báo giá
                </label>
                <Input
                  id="qp-valid-until"
                  type="date"
                  value={values.valid_until}
                  onChange={(e) => updateField("valid_until", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="qp-note" className="text-sm font-medium">
                Ghi chú
              </label>
              <Textarea id="qp-note" value={values.note} onChange={(e) => updateField("note", e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={submitting} onClick={handleSaveAndDownload}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu & Tải xuống
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
