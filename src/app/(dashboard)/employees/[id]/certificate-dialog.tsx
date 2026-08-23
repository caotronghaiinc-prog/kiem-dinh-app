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
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_BUCKET,
  validateAttachmentFile,
} from "@/lib/inspection/form-schema";
import { EQUIPMENT_TYPE_GROUPS } from "@/lib/equipment/form-schema";
import {
  certificateFormSchema,
  CERTIFICATE_EMPTY_VALUES,
  type CertificateFormValues,
} from "@/lib/employees/certificate-form-schema";
import { AttachmentLink } from "./attachment-link";

// PROMPT-63: dữ liệu chứng chỉ hiện có, dùng điền sẵn form khi mode ===
// "edit" (mirror EditInspectionInitialData ở add-inspection-dialog.tsx).
export interface CertificateInitialData {
  certificate_type: string | null;
  certificate_number: string | null;
  issued_by: string | null;
  issued_date: string | null;
  expiry_date: string;
  equipment_types: string[];
  scope_note: string | null;
  note: string | null;
  file_path: string | null;
}

export function CertificateDialog({
  profileId,
  mode = "create",
  certificateId,
  initialData,
  trigger,
}: {
  profileId: string;
  mode?: "create" | "edit";
  certificateId?: string;
  initialData?: CertificateInitialData;
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const defaultValues: CertificateFormValues =
    mode === "edit" && initialData
      ? {
          certificate_type: initialData.certificate_type ?? "",
          certificate_number: initialData.certificate_number ?? "",
          issued_by: initialData.issued_by ?? "",
          issued_date: initialData.issued_date ?? "",
          expiry_date: initialData.expiry_date,
          equipment_types: initialData.equipment_types,
          scope_note: initialData.scope_note ?? "",
          note: initialData.note ?? "",
        }
      : CERTIFICATE_EMPTY_VALUES;

  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues,
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

  function toggleType(type: string) {
    const current = form.getValues("equipment_types");
    form.setValue(
      "equipment_types",
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  }

  async function onSubmit(values: CertificateFormValues) {
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
    // mới (mirror add-inspection-dialog.tsx).
    let filePath: string | null = mode === "edit" ? (initialData?.file_path ?? null) : null;
    if (file) {
      const dotIndex = file.name.lastIndexOf(".");
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
      const path = `employee-certs/${profileId}/${crypto.randomUUID()}${ext}`;
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
      certificate_type: values.certificate_type || null,
      certificate_number: values.certificate_number || null,
      issued_by: values.issued_by || null,
      issued_date: values.issued_date || null,
      expiry_date: values.expiry_date,
      equipment_types: values.equipment_types,
      scope_note: values.scope_note || null,
      note: values.note || null,
      file_path: filePath,
    };

    const { error } =
      mode === "edit"
        ? await supabase.from("inspector_certificates").update(payload).eq("id", certificateId!)
        : await supabase
            .from("inspector_certificates")
            .insert({ ...payload, profile_id: profileId, created_by: user.id });

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: mode === "edit" ? "Cập nhật chứng chỉ thất bại" : "Thêm chứng chỉ thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: mode === "edit" ? "Đã cập nhật chứng chỉ" : "Đã thêm chứng chỉ" });
    resetForm();
    setOpen(false);
    router.refresh();
  }

  const selectedTypes = form.watch("equipment_types");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button>+ Thêm chứng chỉ</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Sửa chứng chỉ" : "Thêm chứng chỉ"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="certificate_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại/hạng chứng chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder="Kiểm định viên hạng 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certificate_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số hiệu</FormLabel>
                    <FormControl>
                      <Input placeholder="..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issued_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cơ quan cấp</FormLabel>
                    <FormControl>
                      <Input placeholder="..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issued_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày cấp</FormLabel>
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
                    <FormLabel>Hạn hiệu lực *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipment_types"
              render={() => (
                <FormItem>
                  <FormLabel>Phạm vi thiết bị</FormLabel>
                  <div className="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-md border p-3">
                    {EQUIPMENT_TYPE_GROUPS.map((group) => (
                      <div key={group.label} className="flex flex-col gap-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {group.label}
                        </span>
                        <div className="flex flex-col gap-1">
                          {group.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={selectedTypes.includes(opt)}
                                onChange={() => toggleType(opt)}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scope_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả phạm vi (ghi nguyên văn theo chứng chỉ gốc)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                File chứng chỉ (PDF/JPG/PNG, tối đa 10MB)
              </label>
              {mode === "edit" && initialData?.file_path && !file && (
                <div className="flex items-center gap-2">
                  <AttachmentLink path={initialData.file_path} />
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
                {mode === "edit" ? "Lưu thay đổi" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
