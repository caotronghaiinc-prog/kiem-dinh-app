"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
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
import { INSPECTION_RESULT_CONFIG } from "@/lib/inspection/result";
import {
  ALLOWED_ATTACHMENT_EXTENSIONS,
  ATTACHMENT_BUCKET,
  inspectionFormSchema,
  validateAttachmentFile,
  type InspectionFormValues,
} from "@/lib/inspection/form-schema";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_VALUES: InspectionFormValues = {
  inspection_date: todayIso(),
  result: undefined as unknown as InspectionFormValues["result"],
  report_number: "",
  new_expiry_date: "",
  notes: "",
};

export function AddInspectionDialog({ equipmentId }: { equipmentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useCurrentUserProfile();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: EMPTY_VALUES,
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
    form.reset(EMPTY_VALUES);
    setFile(null);
    setFileError(null);
    setFileInputKey((k) => k + 1);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) resetForm();
    setOpen(next);
  }

  async function onSubmit(values: InspectionFormValues) {
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

    let attachmentPath: string | null = null;
    if (file) {
      const dotIndex = file.name.lastIndexOf(".");
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
      const path = `${equipmentId}/${crypto.randomUUID()}${ext}`;
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
      attachmentPath = path;
    }

    const { error } = await supabase.from("inspection_history").insert({
      equipment_id: equipmentId,
      inspection_date: values.inspection_date,
      result: values.result,
      report_number: values.report_number || null,
      new_expiry_date: values.new_expiry_date || null,
      notes: values.notes || null,
      inspector_id: user.id,
      attachment_url: attachmentPath,
    });

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Thêm bản ghi kiểm định thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã thêm bản ghi kiểm định" });
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>+ Thêm bản ghi kiểm định</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm bản ghi kiểm định</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="inspection_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày kiểm định *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kết quả *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Chọn kết quả --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(INSPECTION_RESULT_CONFIG).map(([value, cfg]) => (
                          <SelectItem key={value} value={value}>
                            {cfg.label}
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
                name="report_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số biên bản</FormLabel>
                    <FormControl>
                      <Input placeholder="..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="new_expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạn kiểm định mới</FormLabel>
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                File đính kèm (PDF/JPG/PNG, tối đa 10MB)
              </label>
              <Input
                key={fileInputKey}
                type="file"
                accept={ALLOWED_ATTACHMENT_EXTENSIONS.join(",")}
                onChange={handleFileChange}
              />
              {file && <p className="text-xs text-muted-foreground">Đã chọn: {file.name}</p>}
              {fileError && (
                <p className="text-[0.8rem] font-medium text-destructive">{fileError}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Người kiểm định
              </span>
              <span className="text-sm">{profile?.full_name || profile?.email || "—"}</span>
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
