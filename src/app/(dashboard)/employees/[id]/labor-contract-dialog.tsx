"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
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
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_BUCKET,
  validateAttachmentFile,
} from "@/lib/inspection/form-schema";
import {
  LABOR_CONTRACT_TYPE_LABELS,
  LABOR_CONTRACT_TYPE_VALUES,
  LABOR_CONTRACT_EMPTY_VALUES,
  laborContractFormSchema,
  type LaborContractFormValues,
} from "@/lib/employees/labor-contract-form-schema";
import { AttachmentLink } from "./attachment-link";

export interface LaborContractInitialData {
  contract_type: LaborContractFormValues["contract_type"];
  contract_no: string | null;
  signed_date: string;
  start_date: string;
  end_date: string | null;
  note: string | null;
  file_path: string | null;
}

// Giữ nguyên tên file gốc trong path (khác certificate-dialog.tsx dùng
// randomUUID) -- Hải cần thấy tên file quen mắt khi liệt kê Storage thủ
// công; chỉ thay khoảng trắng/ký tự đặc biệt để tránh lỗi URL-encode.
function sanitizeFileName(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
}

export function LaborContractDialog({
  profileId,
  mode = "create",
  contractId,
  initialData,
  trigger,
}: {
  profileId: string;
  mode?: "create" | "edit";
  contractId?: string;
  initialData?: LaborContractInitialData;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const defaultValues: LaborContractFormValues =
    mode === "edit" && initialData
      ? {
          contract_type: initialData.contract_type,
          contract_no: initialData.contract_no ?? "",
          signed_date: initialData.signed_date,
          start_date: initialData.start_date,
          end_date: initialData.end_date ?? "",
          note: initialData.note ?? "",
        }
      : LABOR_CONTRACT_EMPTY_VALUES;

  const form = useForm<LaborContractFormValues>({
    resolver: zodResolver(laborContractFormSchema),
    defaultValues,
  });

  const contractType = form.watch("contract_type");
  const isIndefinite = contractType === "khong_xac_dinh_thoi_han";

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

  function resetForm() {
    form.reset(defaultValues);
    setFile(null);
    setFileError(null);
    setFileInputKey((k) => k + 1);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) resetForm();
    setOpen(next);
  }

  async function onSubmit(values: LaborContractFormValues) {
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

    // Sửa: GIỮ NGUYÊN file đính kèm cũ theo mặc định, chỉ thay khi chọn file
    // mới (mirror certificate-dialog.tsx).
    let filePath: string | null = mode === "edit" ? (initialData?.file_path ?? null) : null;
    if (file) {
      const path = `labor-contracts/${profileId}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, file, { contentType: file.type || undefined });

      if (uploadError) {
        setSubmitting(false);
        toast({
          variant: "destructive",
          title: "Tải file lên thất bại",
          description: uploadError.message,
        });
        return;
      }
      filePath = path;
    }

    const payload = {
      contract_type: values.contract_type,
      contract_no: values.contract_no || null,
      signed_date: values.signed_date,
      start_date: values.start_date,
      end_date: isIndefinite ? null : values.end_date || null,
      note: values.note || null,
      file_path: filePath,
    };

    const { error } =
      mode === "edit"
        ? await supabase.from("employee_labor_contracts").update(payload).eq("id", contractId!)
        : await supabase
            .from("employee_labor_contracts")
            .insert({ ...payload, profile_id: profileId, created_by: user.id });

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: mode === "edit" ? "Cập nhật hợp đồng lao động thất bại" : "Thêm hợp đồng lao động thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: mode === "edit" ? "Đã cập nhật hợp đồng lao động" : "Đã thêm hợp đồng lao động" });
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button>+ Thêm hợp đồng lao động</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Sửa hợp đồng lao động" : "Thêm hợp đồng lao động"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contract_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại hợp đồng *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LABOR_CONTRACT_TYPE_VALUES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {LABOR_CONTRACT_TYPE_LABELS[value]}
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
                    <FormLabel>Số hợp đồng</FormLabel>
                    <FormControl>
                      <Input placeholder="..." {...field} />
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
                    <FormLabel>Ngày ký *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày bắt đầu *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày kết thúc {!isIndefinite && "*"}</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isIndefinite} {...field} value={isIndefinite ? "" : field.value} />
                    </FormControl>
                    {isIndefinite && (
                      <p className="text-xs text-muted-foreground">Không xác định thời hạn.</p>
                    )}
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
              <label className="text-sm font-medium">
                File hợp đồng đã ký (tùy chọn, PDF/JPG/PNG, tối đa 10MB)
              </label>
              {mode === "edit" && initialData?.file_path && !file && (
                <div className="flex items-center gap-2">
                  <AttachmentLink path={initialData.file_path} label="Xem file hợp đồng lao động" />
                  <span className="text-xs text-muted-foreground">
                    (chọn file mới bên dưới để thay thế, hoặc để trống giữ nguyên)
                  </span>
                </div>
              )}
              <Input
                key={fileInputKey}
                type="file"
                accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
                onChange={handleFileChange}
              />
              {file && <p className="text-xs text-muted-foreground">Đã chọn: {file.name}</p>}
              {fileError && <p className="text-[0.8rem] font-medium text-destructive">{fileError}</p>}
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
                {mode === "edit" ? "Lưu thay đổi" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
