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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { loanFormSchema, LOAN_EMPTY_VALUES, type LoanFormValues } from "@/lib/tools/loan-form-schema";
import type { CustomerOption, ProfileOption } from "../types";

const NO_CUSTOMER_VALUE = "__none__";

// Chỉ báo trạng thái "đang được mượn" -- ràng buộc "không trùng lặp" của
// anh Hải, ép bằng unique index MỘT PHẦN inspection_tool_loans_one_active_idx
// (tool_id) WHERE returned_at IS NULL, xem migration 0024. Postgrest trả về
// mã lỗi "23505" khi vi phạm unique constraint.
function isActiveLoanConflict(error: { code?: string; message: string }): boolean {
  return (
    error.code === "23505" ||
    error.message.includes("inspection_tool_loans_one_active_idx")
  );
}

export function LoanDialog({
  toolId,
  borrowerOptions,
  customerOptions,
}: {
  toolId: string;
  borrowerOptions: ProfileOption[];
  customerOptions: CustomerOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: LOAN_EMPTY_VALUES,
  });

  function resetForm() {
    form.reset(LOAN_EMPTY_VALUES);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) resetForm();
    setOpen(next);
  }

  async function onSubmit(values: LoanFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Phiên đăng nhập đã hết hạn",
        description: "Vui lòng đăng nhập lại rồi thử lại.",
      });
      return;
    }

    const { error } = await supabase.from("inspection_tool_loans").insert({
      tool_id: toolId,
      borrower_id: values.borrower_id,
      borrowed_at: values.borrowed_at,
      expected_return_at: values.expected_return_at || null,
      work_location: values.work_location,
      customer_id: values.customer_id || null,
      note: values.note || null,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      if (isActiveLoanConflict(error)) {
        toast({
          variant: "destructive",
          title: "Không thể cho mượn",
          description: "Dụng cụ này đang được mượn, không thể cho mượn tiếp. Vui lòng tải lại trang.",
        });
        router.refresh();
        return;
      }
      toast({
        variant: "destructive",
        title: "Cho mượn thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã ghi nhận lượt mượn" });
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>+ Cho mượn</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cho mượn dụng cụ</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="borrower_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người mượn *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Chọn người mượn --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {borrowerOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
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
                name="borrowed_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày mượn *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_return_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày dự kiến trả</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khách hàng (nếu có)</FormLabel>
                    <Select
                      value={field.value || NO_CUSTOMER_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === NO_CUSTOMER_VALUE ? "" : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Không --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CUSTOMER_VALUE}>-- Không --</SelectItem>
                        {customerOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.company_name}
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
              name="work_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đang làm ở đâu *</FormLabel>
                  <FormControl>
                    <Input placeholder="Công trình / địa điểm hiện tại..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
