"use client";

import { useState, type ChangeEvent } from "react";
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
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_BUCKET,
  validateAttachmentFile,
} from "@/lib/inspection/form-schema";
import { contractFormSchema, type ContractFormValues } from "@/lib/contracts/form-schema";
import { CONTRACT_STATUS_OPTIONS } from "@/lib/contracts/status";
import { AttachmentLink } from "./attachment-link";
import type { ContractRecord, CustomerOption } from "./types";

interface ContractFormProps {
  mode: "create" | "edit";
  contract?: ContractRecord;
  customerOptions: CustomerOption[];
}

function mapContractError(message: string): string {
  // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST -- log ở
  // console, chỉ hiện message chung cho người dùng.
  return logAndGetSafeMessage(new Error(message), "Có lỗi xảy ra khi lưu hợp đồng. Vui lòng thử lại.");
}

export function ContractForm({ mode, contract, customerOptions }: ContractFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      customer_id: contract?.customer_id ?? "",
      contract_no: contract?.contract_no ?? "",
      title: contract?.title ?? "",
      signed_date: contract?.signed_date ?? "",
      status: (contract?.status as ContractFormValues["status"]) ?? "dang_thuc_hien",
      note: contract?.note ?? "",
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }
    const error = validateAttachmentFile(selected);
    if (error) {
      setFileError(error);
      setFile(null);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setFile(selected);
  }

  async function uploadContractFile(contractId: string): Promise<string | null> {
    if (!file) return null;
    const supabase = createClient();
    const dotIndex = file.name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    const path = `contract-files/${contractId}/${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type || undefined });

    if (uploadError) {
      throw uploadError;
    }
    return path;
  }

  async function onSubmit(values: ContractFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      customer_id: values.customer_id,
      contract_no: values.contract_no,
      title: values.title || null,
      signed_date: values.signed_date || null,
      status: values.status,
      note: values.note || null,
    };

    try {
      if (mode === "create") {
        // Chưa có contractId để build path upload -- insert trước với
        // contract_file_path = null, có id rồi mới upload + update lại
        // (mirror cách inspect-checklist-form.tsx xử lý ảnh kiểm định).
        const { data: inserted, error: insertError } = await supabase
          .from("contracts")
          .insert(payload)
          .select("id")
          .single();

        if (insertError || !inserted) {
          throw insertError ?? new Error("Không tạo được hợp đồng.");
        }

        if (file) {
          const filePath = await uploadContractFile(inserted.id);
          const { error: updateFileError } = await supabase
            .from("contracts")
            .update({ contract_file_path: filePath })
            .eq("id", inserted.id);
          if (updateFileError) throw updateFileError;
        }

        toast({ title: "Đã thêm hợp đồng" });
        router.push(`/contracts/${inserted.id}`);
        router.refresh();
        return;
      }

      // Sửa: GIỮ NGUYÊN file cũ theo mặc định, chỉ thay khi chọn file mới.
      let contractFilePath = contract?.contract_file_path ?? null;
      if (file) {
        contractFilePath = await uploadContractFile(contract!.id);
      }

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ ...payload, contract_file_path: contractFilePath })
        .eq("id", contract!.id);

      if (updateError) throw updateError;

      toast({ title: "Đã cập nhật hợp đồng" });
      router.push(`/contracts/${contract!.id}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Thêm hợp đồng thất bại" : "Cập nhật hợp đồng thất bại",
        description: mapContractError(error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {mode === "edit" && contract && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Mã hợp đồng</label>
            <Input value={contract.code} disabled />
            <p className="text-sm text-muted-foreground">
              Giá trị hợp đồng được tự động tính bằng tổng số lượng × đơn giá thiết bị, sửa ở trang
              chi tiết hợp đồng.
            </p>
          </div>
        )}
        {mode === "create" && (
          <p className="text-sm text-muted-foreground">
            Mã hợp đồng sẽ được tự động tạo sau khi lưu (dạng HD-2026-001). Giá trị hợp đồng được tự
            động tính bằng tổng số lượng × đơn giá thiết bị, cập nhật ở trang chi tiết hợp đồng sau
            khi tạo.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
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

          <FormField
            control={form.control}
            name="contract_no"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số hợp đồng *</FormLabel>
                <FormControl>
                  <Input placeholder="15/2026/HĐKT-INCOSAF" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên/Nội dung hợp đồng</FormLabel>
                <FormControl>
                  <Input placeholder="Hợp đồng kiểm định thiết bị..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signed_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày ký</FormLabel>
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
                    {CONTRACT_STATUS_OPTIONS.map((opt) => (
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">File hợp đồng đã ký (PDF/JPG/PNG, tối đa 10MB)</label>
          {mode === "edit" && contract?.contract_file_path && !file && (
            <div className="flex items-center gap-2">
              <AttachmentLink path={contract.contract_file_path} />
              <span className="text-xs text-muted-foreground">
                (chọn file mới bên dưới để thay thế, hoặc để trống giữ nguyên)
              </span>
            </div>
          )}
          <Input
            type="file"
            accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
            onChange={handleFileChange}
          />
          {file && <p className="text-xs text-muted-foreground">Đã chọn: {file.name}</p>}
          {fileError && <p className="text-[0.8rem] font-medium text-destructive">{fileError}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => router.push("/contracts")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Thêm hợp đồng" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
