"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { formatNumberInput } from "@/lib/utils/currency";
import {
  contractEquipmentFormSchema,
  type ContractEquipmentFormValues,
} from "@/lib/contracts/contract-equipment-form-schema";
import type { ContractEquipmentRow } from "../types";

// PROMPT-59: sửa số lượng/đơn giá/số tem/ngày kiểm định QUA DIALOG, không
// inline-edit từng ô -- update xong chỉ router.refresh(), contracts.total_value
// tự đúng ngay nhờ trigger sync_contract_total_value() (migration 0031),
// KHÔNG tự tính lại ở client.
export function EditContractEquipmentDialog({ row }: { row: ContractEquipmentRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ContractEquipmentFormValues>({
    resolver: zodResolver(contractEquipmentFormSchema),
    defaultValues: {
      unit_price: String(row.unit_price),
      quantity: String(row.quantity),
      so_tem: row.so_tem ?? "",
      ngay_kiem_dinh: row.ngay_kiem_dinh ?? "",
    },
  });

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      form.reset({
        unit_price: String(row.unit_price),
        quantity: String(row.quantity),
        so_tem: row.so_tem ?? "",
        ngay_kiem_dinh: row.ngay_kiem_dinh ?? "",
      });
    }
    setOpen(next);
  }

  async function onSubmit(values: ContractEquipmentFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("contract_equipment")
      .update({
        unit_price: Number(values.unit_price),
        quantity: Number(values.quantity),
        so_tem: values.so_tem || null,
        ngay_kiem_dinh: values.ngay_kiem_dinh || null,
      })
      .eq("id", row.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Cập nhật thiết bị thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã cập nhật thiết bị trong hợp đồng" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa thông tin thiết bị trong hợp đồng</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {row.equipment?.code} — {row.equipment?.name}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng *</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn giá (đ) *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="5.000.000"
                        value={formatNumberInput(field.value)}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="so_tem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tem</FormLabel>
                    <FormControl>
                      <Input placeholder="Số tem kiểm định" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ngay_kiem_dinh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày kiểm định</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
