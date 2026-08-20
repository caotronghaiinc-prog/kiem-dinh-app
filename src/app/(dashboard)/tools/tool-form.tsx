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
import { toolFormSchema, TOOL_STATUS_OPTIONS, type ToolFormValues } from "@/lib/tools/form-schema";
import type { ProfileOption, ToolRecord } from "./types";

const UNASSIGNED_VALUE = "__unassigned__";

interface ToolFormProps {
  mode: "create" | "edit";
  tool?: ToolRecord;
  custodianOptions: ProfileOption[];
}

function mapToolError(message: string): string {
  if (message.includes("duplicate key") && message.includes("inspection_tools_code_key")) {
    return "Mã dụng cụ bị trùng do có người khác vừa tạo cùng lúc. Vui lòng thử lưu lại.";
  }
  // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST cho người
  // dùng -- log ra console để debug, chỉ hiện message chung.
  return logAndGetSafeMessage(
    new Error(message),
    "Có lỗi xảy ra khi lưu dụng cụ. Vui lòng thử lại."
  );
}

export function ToolForm({ mode, tool, custodianOptions }: ToolFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: tool?.name ?? "",
      model: tool?.model ?? "",
      serial_number: tool?.serial_number ?? "",
      ownership_doc: tool?.ownership_doc ?? "",
      calibration_due_date: tool?.calibration_due_date ?? "",
      calibration_not_applicable: tool?.calibration_not_applicable ?? false,
      calibration_cert_no: tool?.calibration_cert_no ?? "",
      custodian_id: tool?.custodian_id ?? "",
      default_location: tool?.default_location ?? "Kho INCERT",
      status: (tool?.status as ToolFormValues["status"]) ?? "active",
      note: tool?.note ?? "",
    },
  });

  const calibrationNotApplicable = form.watch("calibration_not_applicable");

  async function onSubmit(values: ToolFormValues) {
    setSubmitting(true);

    const supabase = createClient();
    const payload = {
      name: values.name,
      model: values.model || null,
      serial_number: values.serial_number || null,
      ownership_doc: values.ownership_doc || null,
      calibration_due_date: values.calibration_not_applicable
        ? null
        : values.calibration_due_date || null,
      calibration_not_applicable: values.calibration_not_applicable,
      calibration_cert_no: values.calibration_cert_no || null,
      custodian_id: values.custodian_id || null,
      default_location: values.default_location || null,
      status: values.status,
      note: values.note || null,
    };

    const { error } =
      mode === "create"
        ? await supabase.from("inspection_tools").insert(payload)
        : await supabase.from("inspection_tools").update(payload).eq("id", tool!.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Thêm dụng cụ thất bại" : "Cập nhật dụng cụ thất bại",
        description: mapToolError(error.message),
      });
      return;
    }

    toast({
      title: mode === "create" ? "Đã thêm dụng cụ" : "Đã cập nhật dụng cụ",
    });
    router.push("/tools");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {mode === "edit" && tool && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Mã dụng cụ</label>
            <Input value={tool.code} disabled />
          </div>
        )}
        {mode === "create" && (
          <p className="text-sm text-muted-foreground">
            Mã dụng cụ sẽ được tự động tạo sau khi lưu.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên dụng cụ *</FormLabel>
                <FormControl>
                  <Input placeholder="Máy kiểm tra khuyết tật bằng siêu âm..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
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
            name="ownership_doc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giấy tờ sở hữu</FormLabel>
                <FormControl>
                  <Input placeholder="Số hóa đơn, đơn vị cấp..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="calibration_due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hạn hiệu chuẩn</FormLabel>
                <FormControl>
                  <Input type="date" disabled={calibrationNotApplicable} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="calibration_not_applicable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>&nbsp;</FormLabel>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  Không áp dụng
                </label>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="calibration_cert_no"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số giấy kiểm định/hiệu chuẩn</FormLabel>
                <FormControl>
                  <Input placeholder="..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="custodian_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Người quản lý</FormLabel>
                <Select
                  value={field.value || UNASSIGNED_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === UNASSIGNED_VALUE ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chưa gán --" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>-- Chưa gán --</SelectItem>
                    {custodianOptions.map((p) => (
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
            name="default_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nơi cất giữ mặc định</FormLabel>
                <FormControl>
                  <Input placeholder="Kho INCERT" {...field} />
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
                    {TOOL_STATUS_OPTIONS.map((opt) => (
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
            onClick={() => router.push("/tools")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Thêm dụng cụ" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
