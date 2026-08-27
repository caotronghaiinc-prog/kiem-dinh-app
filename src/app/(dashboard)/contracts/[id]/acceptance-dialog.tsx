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
import {
  acceptanceFormSchema,
  buildAcceptanceEmptyValues,
  type AcceptanceFormValues,
} from "@/lib/contracts/acceptance-form-schema";
import { buildContractAcceptanceDocx } from "@/lib/reports/contract-acceptance";
import { numberToVietnameseWords } from "@/lib/utils/number-to-words-vi";
import { AttachmentLink } from "../attachment-link";
import type { ContractDetail, ContractEquipmentRow } from "../types";

// Mirror nguyên xi từ export-acceptance-button.tsx (file đó KHÔNG đổi gì
// theo quyết định PROMPT-67, nên không export dùng chung được -- chấp
// nhận trùng 1 hàm nhỏ 6 dòng).
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const RESULT_LABELS: Record<string, string> = {
  dat: "Đạt yêu cầu hoàn toàn",
  co_van_de: "Có vấn đề, ghi chú",
};

export function AcceptanceDialog({
  contract,
  equipment,
}: {
  contract: ContractDetail;
  equipment: ContractEquipmentRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const emptyValues = buildAcceptanceEmptyValues({
    acceptance_date: contract.acceptance_date,
    acceptance_location: contract.acceptance_location,
    acceptance_result: contract.acceptance_result,
    acceptance_note: contract.acceptance_note,
    representative_a_name: contract.representative_a_name,
    representative_a_title: contract.representative_a_title,
    acceptance_copies_note: contract.acceptance_copies_note,
    customerAddress: contract.customer?.address ?? null,
    customerContactName: contract.customer?.contact_name ?? null,
  });

  const form = useForm<AcceptanceFormValues>({
    resolver: zodResolver(acceptanceFormSchema),
    defaultValues: emptyValues,
  });

  const result = form.watch("acceptance_result");
  // PROMPT-67: watch TOÀN BỘ form -- panel xem trước bên trái đọc từ đây để
  // cập nhật theo thời gian thực khi gõ (không đọc từ contract đã lưu).
  const watched = form.watch();

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      form.reset(emptyValues);
      setFile(null);
      setFileError(null);
    }
    setOpen(next);
  }

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

  // path phân biệt với file hợp đồng gốc ("contract-files/<id>/<uuid>.ext",
  // xem contract-form.tsx) bằng tiền tố "acceptance-" trong tên file.
  async function uploadAcceptanceFile(): Promise<string | null> {
    if (!file) return null;
    const supabase = createClient();
    const dotIndex = file.name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
    const path = `contract-files/${contract.id}/acceptance-${crypto.randomUUID()}${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;
    return path;
  }

  // Lưu vào contracts, trả về bản ghi vừa lưu (shape ContractDetail đủ để
  // buildContractAcceptanceDocx dùng ngay) -- TÁCH ra để 2 nút "Lưu"/"Lưu &
  // Tải xuống" cùng gọi, chỉ khác bước cuối (tải file hay không), mirror
  // quyết định PROMPT-67.
  async function saveAcceptance(values: AcceptanceFormValues): Promise<ContractDetail> {
    const supabase = createClient();
    // GIỮ NGUYÊN file cũ theo mặc định, chỉ thay khi chọn file mới (mirror
    // pattern contract-form.tsx đang dùng cho contract_file_path).
    let acceptanceFilePath = contract.acceptance_file_path;
    if (file) {
      acceptanceFilePath = await uploadAcceptanceFile();
    }

    const payload = {
      acceptance_date: values.acceptance_date || null,
      acceptance_location: values.acceptance_location || null,
      acceptance_result: values.acceptance_result,
      acceptance_note:
        values.acceptance_result === "co_van_de" ? values.acceptance_note || null : null,
      representative_a_name: values.representative_a_name || null,
      representative_a_title: values.representative_a_title || null,
      acceptance_copies_note: values.acceptance_copies_note || null,
      acceptance_file_path: acceptanceFilePath,
    };

    const { error } = await supabase.from("contracts").update(payload).eq("id", contract.id);
    if (error) throw error;

    return { ...contract, ...payload };
  }

  async function onSubmit(values: AcceptanceFormValues) {
    setSubmitting(true);
    try {
      await saveAcceptance(values);
      toast({ title: "Đã cập nhật thông tin nghiệm thu" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Cập nhật thông tin nghiệm thu thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitAndDownload(values: AcceptanceFormValues) {
    setSubmitting(true);
    try {
      const saved = await saveAcceptance(values);
      const blob = await buildContractAcceptanceDocx(saved, contract.customer, equipment);
      const fileName = `Bien_ban_nghiem_thu_${saved.code}_${slugify(contract.customer?.company_name ?? "khach_hang")}.docx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Đã lưu và tải biên bản nghiệm thu" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lưu & tải biên bản nghiệm thu thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Cập nhật thông tin nghiệm thu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông tin nghiệm thu hợp đồng</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="text-center font-semibold">BIÊN BẢN NGHIỆM THU</p>

            <div className="flex flex-col gap-1">
              <p className="font-medium">I. ĐẠI DIỆN BÊN A: {contract.customer?.company_name || "—"}</p>
              <p>
                {watched.representative_a_name?.trim() || "……"} — Chức vụ:{" "}
                {watched.representative_a_title?.trim() || "……"}
              </p>
              <p>Địa chỉ: {contract.customer?.address || "……"}</p>
            </div>

            <div className="overflow-x-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Nội dung công việc</th>
                    <th className="p-2 text-right">SL</th>
                    <th className="p-2 text-right">Đơn giá (đã VAT)</th>
                    <th className="p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((row) => {
                    const unitPriceWithVat = Math.round(row.unit_price * 1.08);
                    return (
                      <tr key={row.id} className="border-b">
                        <td className="p-2">{row.equipment?.name || "—"}</td>
                        <td className="p-2 text-right">{row.quantity}</td>
                        <td className="p-2 text-right">{unitPriceWithVat.toLocaleString("vi-VN")}</td>
                        <td className="p-2 text-right">
                          {(row.quantity * unitPriceWithVat).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-semibold">
                      Tổng cộng (đã bao gồm thuế GTGT 8%):
                    </td>
                    <td className="p-2 text-right font-semibold">
                      {contract.total_value.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="italic">Bằng chữ: {numberToVietnameseWords(contract.total_value)} đồng./.</p>

            <div className="flex flex-col gap-1">
              <p className="font-medium">2. NHẬN XÉT, ĐÁNH GIÁ</p>
              <p>- Đã tiến hành kiểm định đúng quy trình, tiêu chuẩn kỹ thuật hiện hành;</p>
              <p>
                -{" "}
                {watched.acceptance_result === "co_van_de"
                  ? watched.acceptance_note?.trim() || "……"
                  : "Kết quả kiểm định đạt yêu cầu;"}
              </p>
              <p>- Đã bàn giao đầy đủ hồ sơ kỹ thuật (biên bản kiểm định, kết quả kiểm định, tem kiểm định);</p>
              <p>
                - Khối lượng, chất lượng công việc thực hiện đúng theo thỏa thuận tại Hợp đồng kinh tế
                nêu trên.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-medium">3. KẾT LUẬN</p>
              <p>
                Hai bên thống nhất nghiệm thu khối lượng, chất lượng công việc nêu trên, xác nhận Bên B
                đã hoàn thành đầy đủ nghĩa vụ theo Hợp đồng kinh tế đã ký. Biên bản này là cơ sở để hai
                bên tiến hành thanh toán theo thỏa thuận.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Kết quả kiểm định: {RESULT_LABELS[watched.acceptance_result] ?? "—"}
            </p>
          </div>

          <div className="flex flex-col gap-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="acceptance_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày nghiệm thu *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptance_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa điểm nghiệm thu</FormLabel>
                    <FormControl>
                      <Input placeholder="Địa chỉ khách hàng..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acceptance_result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kết quả kiểm định</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={field.value === "dat"}
                          onChange={() => field.onChange("dat")}
                        />
                        Đạt yêu cầu hoàn toàn
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          className="h-4 w-4"
                          checked={field.value === "co_van_de"}
                          onChange={() => field.onChange("co_van_de")}
                        />
                        Có vấn đề, ghi chú
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {result === "co_van_de" && (
              <FormField
                control={form.control}
                name="acceptance_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ghi chú vấn đề *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Mô tả vấn đề..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="representative_a_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người đại diện Bên A</FormLabel>
                    <FormControl>
                      <Input placeholder="Ông/Bà..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="representative_a_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức vụ</FormLabel>
                    <FormControl>
                      <Input placeholder="Giám đốc..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acceptance_copies_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú số bản lập</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                File biên bản đã ký (tùy chọn, PDF/JPG/PNG, tối đa 10MB)
              </label>
              {contract.acceptance_file_path && !file && (
                <div className="flex items-center gap-2">
                  <AttachmentLink path={contract.acceptance_file_path} label="Xem biên bản đã ký" />
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={form.handleSubmit(onSubmitAndDownload)}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu & Tải xuống
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
