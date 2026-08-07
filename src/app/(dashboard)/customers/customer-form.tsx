"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  customerFormSchema,
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_SOURCE_OPTIONS,
  type CustomerFormValues,
} from "@/lib/customers/form-schema";
import { CUSTOMER_STATUS_CONFIG } from "@/lib/customers/status";
import type { CustomerRecord } from "@/lib/types/customer";

// Radix Select không cho phép value="" (dùng để phân biệt placeholder) nên
// dùng 1 sentinel riêng cho lựa chọn "không chọn" rồi map về "" khi submit.
const NO_SELECTION = "__none__";

interface CustomerFormProps {
  mode: "create" | "edit";
  customer?: CustomerRecord;
}

interface DuplicateMatch {
  id: string;
  code: string;
  company_name: string;
  phone: string | null;
}

function mapCustomerError(message: string): string {
  if (message.includes("customers_tax_code_unique_idx") || message.includes("duplicate key")) {
    return "Mã số thuế này đã được đăng ký cho một khách hàng khác. Vui lòng kiểm tra lại.";
  }
  return message;
}

export function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [nameDuplicates, setNameDuplicates] = useState<DuplicateMatch[]>([]);
  const [pendingValues, setPendingValues] = useState<CustomerFormValues | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      company_name: customer?.company_name ?? "",
      contact_name: customer?.contact_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      tax_code: customer?.tax_code ?? "",
      type: (customer?.type as CustomerFormValues["type"]) ?? "",
      industry: customer?.industry ?? "",
      source: (customer?.source as CustomerFormValues["source"]) ?? "",
      status: customer?.status ?? "potential",
      notes: customer?.notes ?? "",
    },
  });

  // Theo dõi Loại khách hàng để hiện dấu * bắt buộc ở MST ngay khi đổi
  // sang "doanh nghiệp", không cần chờ submit mới biết.
  const isBusinessType = form.watch("type") === "doanh nghiệp";

  function buildPayload(values: CustomerFormValues) {
    return {
      company_name: values.company_name,
      contact_name: values.contact_name,
      phone: values.phone,
      email: values.email || null,
      address: values.address,
      tax_code: values.tax_code || null,
      type: values.type || null,
      industry: values.industry || null,
      source: values.source || null,
      status: values.status,
      notes: values.notes || null,
    };
  }

  async function saveCustomer(values: CustomerFormValues) {
    setSubmitting(true);
    const supabase = createClient();
    const payload = buildPayload(values);

    const { error } =
      mode === "create"
        ? await supabase.from("customers").insert(payload)
        : await supabase.from("customers").update(payload).eq("id", customer!.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create" ? "Thêm khách hàng thất bại" : "Cập nhật khách hàng thất bại",
        description: mapCustomerError(error.message),
      });
      return;
    }

    toast({
      title: mode === "create" ? "Đã thêm khách hàng" : "Đã cập nhật khách hàng",
    });
    router.push("/customers");
    router.refresh();
  }

  async function onSubmit(values: CustomerFormValues) {
    setSubmitting(true);
    const supabase = createClient();
    const excludeId = mode === "edit" ? customer?.id : undefined;

    // 1. Trùng mã số thuế -- chặn cứng, không cho lưu.
    if (values.tax_code) {
      let taxQuery = supabase
        .from("customers")
        .select("id, code, company_name, phone")
        .eq("tax_code", values.tax_code)
        .limit(1);
      if (excludeId) taxQuery = taxQuery.neq("id", excludeId);

      const { data: taxMatches } = await taxQuery;
      const taxMatch = taxMatches?.[0];

      if (taxMatch) {
        setSubmitting(false);
        form.setError("tax_code", {
          type: "manual",
          message: `Mã số thuế này đã được đăng ký cho khách hàng ${taxMatch.code} - ${taxMatch.company_name}`,
        });
        return;
      }
    }

    // 2. Trùng tên công ty -- cảnh báo mềm, hỏi xác nhận trước khi lưu.
    let nameQuery = supabase
      .from("customers")
      .select("id, code, company_name, phone")
      .ilike("company_name", values.company_name.trim());
    if (excludeId) nameQuery = nameQuery.neq("id", excludeId);

    const { data: nameMatches } = await nameQuery;

    setSubmitting(false);

    if (nameMatches && nameMatches.length > 0) {
      setNameDuplicates(nameMatches);
      setPendingValues(values);
      return;
    }

    await saveCustomer(values);
  }

  async function handleConfirmDuplicate() {
    const values = pendingValues;
    setNameDuplicates([]);
    setPendingValues(null);
    if (values) {
      await saveCustomer(values);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {mode === "edit" && customer && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Mã khách hàng</label>
              <Input value={customer.code} disabled />
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công ty/khách hàng *</FormLabel>
                  <FormControl>
                    <Input placeholder="Công ty TNHH ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người liên hệ *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại *</FormLabel>
                  <FormControl>
                    <Input placeholder="0901234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ten@congty.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tax_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mã số thuế
                    {isBusinessType && <span className="text-destructive"> *</span>}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="0123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại khách hàng</FormLabel>
                  <Select
                    value={field.value || NO_SELECTION}
                    onValueChange={(value) =>
                      field.onChange(value === NO_SELECTION ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn --" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>-- Không chọn --</SelectItem>
                      {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt === "doanh nghiệp" ? "Doanh nghiệp" : "Cá nhân"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngành nghề</FormLabel>
                  <FormControl>
                    <Input placeholder="Xây dựng, Cơ khí, ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nguồn khách hàng</FormLabel>
                  <Select
                    value={field.value || NO_SELECTION}
                    onValueChange={(value) =>
                      field.onChange(value === NO_SELECTION ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Chọn --" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_SELECTION}>-- Không chọn --</SelectItem>
                      {CUSTOMER_SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(
                        Object.keys(CUSTOMER_STATUS_CONFIG) as Array<
                          keyof typeof CUSTOMER_STATUS_CONFIG
                        >
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {CUSTOMER_STATUS_CONFIG[key].label}
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
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Địa chỉ *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
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
              onClick={() => router.push("/customers")}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Thêm khách hàng" : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Form>

      <Dialog
        open={nameDuplicates.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setNameDuplicates([]);
            setPendingValues(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đã có khách hàng tên tương tự</DialogTitle>
            <DialogDescription>
              Hệ thống tìm thấy {nameDuplicates.length} khách hàng có tên trùng hoặc gần
              giống. Bạn có chắc muốn {mode === "create" ? "tạo khách hàng mới" : "lưu thay đổi"}{" "}
              không?
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {nameDuplicates.map((d) => (
              <li key={d.id} className="rounded-md border p-2">
                <span className="font-medium">{d.code}</span> — {d.company_name}
                {d.phone && <span className="text-muted-foreground"> · SĐT: {d.phone}</span>}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNameDuplicates([]);
                setPendingValues(null);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleConfirmDuplicate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Vẫn tạo mới" : "Vẫn lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
