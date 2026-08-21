"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quoteFormSchema, type QuoteFormValues } from "@/lib/quotes/form-schema";
import { QUOTE_STATUS_OPTIONS } from "@/lib/quotes/status";
import type { CustomerOption, QuoteRecord } from "./types";

const NO_CUSTOMER_VALUE = "__manual__";

interface QuoteFormProps {
  mode: "create" | "edit";
  quote?: QuoteRecord;
  customerOptions: CustomerOption[];
}

function mapQuoteError(message: string): string {
  // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST -- log ở
  // console, chỉ hiện message chung cho người dùng.
  return logAndGetSafeMessage(new Error(message), "Có lỗi xảy ra khi lưu báo giá. Vui lòng thử lại.");
}

export function QuoteForm({ mode, quote, customerOptions }: QuoteFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  // Mặc định chọn khách có sẵn (Select) trừ khi đang sửa 1 báo giá đã lưu
  // customer_id = null (khách chưa có trong hệ thống lúc tạo).
  const [manualCustomer, setManualCustomer] = useState(
    mode === "edit" ? !quote?.customer_id : false
  );

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customer_id: quote?.customer_id ?? "",
      customer_name_snapshot: quote?.customer_name_snapshot ?? "",
      customer_address_snapshot: quote?.customer_address_snapshot ?? "",
      customer_contact_snapshot: quote?.customer_contact_snapshot ?? "",
      customer_phone_snapshot: quote?.customer_phone_snapshot ?? "",
      customer_tax_code_snapshot: quote?.customer_tax_code_snapshot ?? "",
      title: quote?.title ?? "",
      valid_until: quote?.valid_until ?? "",
      status: (quote?.status as QuoteFormValues["status"]) ?? "nhap",
      note: quote?.note ?? "",
    },
  });

  function handleCustomerSelect(customerId: string) {
    if (customerId === NO_CUSTOMER_VALUE) {
      setManualCustomer(true);
      form.setValue("customer_id", "");
      return;
    }
    form.setValue("customer_id", customerId);
    const selected = customerOptions.find((c) => c.id === customerId);
    if (selected) {
      // Snapshot điền sẵn từ hồ sơ customer LÚC CHỌN -- vẫn cho sửa tay tiếp
      // theo (đúng bản chất snapshot, không đồng bộ lại sau).
      form.setValue("customer_name_snapshot", selected.company_name);
      form.setValue("customer_address_snapshot", selected.address ?? "");
      form.setValue("customer_contact_snapshot", selected.contact_name ?? "");
      form.setValue("customer_phone_snapshot", selected.phone ?? "");
      form.setValue("customer_tax_code_snapshot", selected.tax_code ?? "");
    }
  }

  function switchToSelectMode() {
    setManualCustomer(false);
  }

  async function onSubmit(values: QuoteFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      customer_id: values.customer_id || null,
      customer_name_snapshot: values.customer_name_snapshot,
      customer_address_snapshot: values.customer_address_snapshot || null,
      customer_contact_snapshot: values.customer_contact_snapshot || null,
      customer_phone_snapshot: values.customer_phone_snapshot || null,
      customer_tax_code_snapshot: values.customer_tax_code_snapshot || null,
      title: values.title || null,
      valid_until: values.valid_until || null,
      status: values.status,
      note: values.note || null,
    };

    try {
      if (mode === "create") {
        const { data: inserted, error: insertError } = await supabase
          .from("quotes")
          .insert(payload)
          .select("id")
          .single();

        if (insertError || !inserted) {
          throw insertError ?? new Error("Không tạo được báo giá.");
        }

        toast({ title: "Đã tạo báo giá" });
        router.push(`/quotes/${inserted.id}`);
        router.refresh();
        return;
      }

      const { error: updateError } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quote!.id);

      if (updateError) throw updateError;

      toast({ title: "Đã cập nhật báo giá" });
      router.push(`/quotes/${quote!.id}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Tạo báo giá thất bại" : "Cập nhật báo giá thất bại",
        description: mapQuoteError(error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {mode === "edit" && quote && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Mã báo giá</label>
            <Input value={quote.code} disabled />
          </div>
        )}
        {mode === "create" && (
          <p className="text-sm text-muted-foreground">
            Mã báo giá sẽ được tự động tạo sau khi lưu (dạng BG-2026-001).
          </p>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Thông tin khách hàng</h2>
            {manualCustomer ? (
              <Button type="button" variant="link" className="h-auto p-0" onClick={switchToSelectMode}>
                Chọn khách hàng có sẵn thay vào đó
              </Button>
            ) : null}
          </div>

          {!manualCustomer && (
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách hàng</FormLabel>
                  <Select value={field.value ?? ""} onValueChange={handleCustomerSelect}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn khách hàng --" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customerOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.company_name} ({c.code})
                        </SelectItem>
                      ))}
                      <SelectItem value={NO_CUSTOMER_VALUE}>
                        Khách chưa có trong hệ thống...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {manualCustomer && (
            <p className="text-sm text-muted-foreground">
              Khách chưa có trong hệ thống -- nhập tay thông tin bên dưới. Báo giá này sẽ không gắn
              với bản ghi khách hàng nào cho tới khi được sửa lại.
            </p>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customer_name_snapshot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên khách hàng *</FormLabel>
                  <FormControl>
                    <Input placeholder="Công ty TNHH..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_address_snapshot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_contact_snapshot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người liên hệ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_phone_snapshot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_tax_code_snapshot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã số thuế</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên/Nội dung báo giá</FormLabel>
                <FormControl>
                  <Input placeholder="Báo giá dịch vụ kiểm định..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thời hạn báo giá</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trạng thái</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {QUOTE_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ghi chú</FormLabel>
              <FormControl>
                <Textarea placeholder="Ghi chú thêm..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push("/quotes")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Tạo báo giá" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
