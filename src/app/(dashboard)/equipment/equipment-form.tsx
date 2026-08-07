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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  equipmentFormSchema,
  EQUIPMENT_TYPE_GROUPS,
  EQUIPMENT_TYPE_OTHER,
  type EquipmentFormValues,
} from "@/lib/equipment/form-schema";
import type { CustomerOption, EquipmentRecord } from "./types";

interface EquipmentFormProps {
  mode: "create" | "edit";
  equipment?: EquipmentRecord;
  customerOptions?: CustomerOption[];
}

function mapEquipmentError(message: string): string {
  if (message.includes("duplicate key") && message.includes("equipment_code")) {
    return "Mã thiết bị bị trùng do có người khác vừa tạo cùng lúc. Vui lòng thử lưu lại.";
  }
  return message;
}

export function EquipmentForm({ mode, equipment, customerOptions = [] }: EquipmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      customer_id: equipment?.customer_id ?? "",
      name: equipment?.name ?? "",
      type: (equipment?.type as EquipmentFormValues["type"]) ?? undefined,
      manufacturer: equipment?.manufacturer ?? "",
      manufacture_year: equipment?.manufacture_year ? String(equipment.manufacture_year) : "",
      serial_number: equipment?.serial_number ?? "",
      specifications: equipment?.specifications ?? "",
      location: equipment?.location ?? "",
      last_inspection_date: equipment?.last_inspection_date ?? "",
      expiry_date: equipment?.expiry_date ?? "",
      inspection_cycle: equipment?.inspection_cycle ? String(equipment.inspection_cycle) : "12",
      is_inactive: equipment?.status === "inactive",
      notes: equipment?.notes ?? "",
    },
  });

  async function onSubmit(values: EquipmentFormValues) {
    setSubmitting(true);

    const supabase = createClient();
    const payload = {
      name: values.name,
      type: values.type,
      manufacturer: values.manufacturer || null,
      manufacture_year: values.manufacture_year ? Number(values.manufacture_year) : null,
      serial_number: values.serial_number || null,
      specifications: values.specifications || null,
      location: values.location || null,
      last_inspection_date: values.last_inspection_date || null,
      expiry_date: values.expiry_date,
      inspection_cycle: Number(values.inspection_cycle),
      // "valid" chỉ là giá trị tạm -- trigger compute_equipment_status()
      // phía DB sẽ tự tính lại đúng valid/expiring_soon/expired theo
      // expiry_date, trừ khi gửi đúng "inactive" thì được giữ nguyên.
      status: values.is_inactive ? "inactive" : "valid",
      notes: values.notes || null,
    };

    const { error } =
      mode === "create"
        ? await supabase.from("equipment").insert({ ...payload, customer_id: values.customer_id })
        : await supabase.from("equipment").update(payload).eq("id", equipment!.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Thêm thiết bị thất bại" : "Cập nhật thiết bị thất bại",
        description: mapEquipmentError(error.message),
      });
      return;
    }

    toast({
      title: mode === "create" ? "Đã thêm thiết bị" : "Đã cập nhật thiết bị",
    });
    router.push("/equipment");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {mode === "edit" && equipment && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Mã thiết bị</label>
              <Input value={equipment.code} disabled />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Khách hàng</label>
              <Input
                value={
                  equipment.customer
                    ? `${equipment.customer.company_name} (${equipment.customer.code})`
                    : "—"
                }
                disabled
              />
            </div>
          </div>
        )}

        {mode === "create" && (
          <>
            <p className="text-sm text-muted-foreground">
              Mã thiết bị sẽ được tự động tạo sau khi lưu.
            </p>
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách hàng *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên thiết bị *</FormLabel>
                <FormControl>
                  <Input placeholder="Nồi hơi ống lò 500kg" {...field} />
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
                <FormLabel>Loại thiết bị *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn loại thiết bị --" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EQUIPMENT_TYPE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    <SelectItem value={EQUIPMENT_TYPE_OTHER}>{EQUIPMENT_TYPE_OTHER}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hãng sản xuất</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="manufacture_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Năm sản xuất</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="2020" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số serial</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vị trí lắp đặt</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_inspection_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày kiểm định gần nhất</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày hết hạn kiểm định *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="inspection_cycle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chu kỳ kiểm định (tháng) *</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thông số kỹ thuật</FormLabel>
              <FormControl>
                <Textarea placeholder="Công suất, kích thước, áp suất làm việc..." {...field} />
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

        <FormField
          control={form.control}
          name="is_inactive"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
                Ngừng sử dụng
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push("/equipment")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Thêm thiết bị" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
