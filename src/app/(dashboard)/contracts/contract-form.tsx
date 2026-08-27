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
import { buildWorkRequestPayload, syncTechnicalResponsibles } from "@/lib/contracts/work-request-fields";
import { AttachmentLink } from "./attachment-link";
import type { ContractPerson, ContractRecord, CustomerOption } from "./types";

interface ContractFormProps {
  mode: "create" | "edit";
  contract?: ContractRecord;
  customerOptions: CustomerOption[];
  /** PROMPT-66: danh sách admin/inspector active, dùng cho checkbox "Kiểm định viên tham gia". */
  inspectorOptions: ContractPerson[];
  /** PROMPT-66: tổ kiểm định viên đã gán trước đó (mode="edit"), để prefill checkbox + người đề nghị. */
  initialTechnicalResponsibles?: { profile_id: string; is_requester: boolean }[];
  /** PROMPT-60 mục 7: "Tạo hợp đồng từ báo giá" -- chỉ áp dụng mode="create". */
  fromQuoteId?: string;
  prefill?: { customer_id: string; title: string | null; note: string | null };
}

function mapContractError(message: string): string {
  // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST -- log ở
  // console, chỉ hiện message chung cho người dùng.
  return logAndGetSafeMessage(new Error(message), "Có lỗi xảy ra khi lưu hợp đồng. Vui lòng thử lại.");
}

export function ContractForm({
  mode,
  contract,
  customerOptions,
  inspectorOptions,
  initialTechnicalResponsibles,
  fromQuoteId,
  prefill,
}: ContractFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // PROMPT-66: "Kiểm định viên tham gia"/"Người đề nghị" là quan hệ nhiều-
  // dòng ở bảng nối contract_technical_responsibles, không phải cột của
  // contracts -- 2 state riêng ngoài react-hook-form (mirror file/fileError
  // đã có sẵn trong file này).
  const [technicalResponsibleIds, setTechnicalResponsibleIds] = useState<string[]>(
    initialTechnicalResponsibles?.map((r) => r.profile_id) ?? []
  );
  const [requesterId, setRequesterId] = useState<string>(
    initialTechnicalResponsibles?.find((r) => r.is_requester)?.profile_id ?? ""
  );
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      customer_id: contract?.customer_id ?? prefill?.customer_id ?? "",
      contract_no: contract?.contract_no ?? "",
      title: contract?.title ?? prefill?.title ?? "",
      signed_date: contract?.signed_date ?? "",
      status: (contract?.status as ContractFormValues["status"]) ?? "dang_thuc_hien",
      note: contract?.note ?? prefill?.note ?? "",
      site_location: contract?.site_location ?? "",
      execution_time_note: contract?.execution_time_note ?? "",
      contract_type_note: contract?.contract_type_note ?? "",
      using_unit_name: contract?.using_unit_name ?? "",
      using_unit_address: contract?.using_unit_address ?? "",
      work_request_document_no: contract?.work_request_document_no ?? "",
    },
  });

  // Bỏ tick 1 người đang là "Người đề nghị" -- tự reset lựa chọn người đề
  // nghị, không để lại tham chiếu treo tới người đã bỏ chọn (đúng quyết
  // định mentor đã chốt).
  function toggleResponsible(id: string) {
    setTechnicalResponsibleIds((current) => {
      const next = current.includes(id) ? current.filter((r) => r !== id) : [...current, id];
      if (!next.includes(requesterId)) {
        setRequesterId("");
      }
      return next;
    });
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

  // Đồng bộ tổ kiểm định viên tham gia -- không throw nếu lỗi -- hợp đồng
  // chính đã lưu thành công, chỉ toast riêng (mirror mức rủi ro đã có sẵn
  // ở bước insert-rồi-upload-file trong file này). Logic thật nằm ở
  // work-request-fields.ts (PROMPT-67, tách ra để dùng chung với
  // work-request-preview-dialog.tsx mới).
  async function syncResponsibles(contractId: string) {
    const supabase = createClient();
    const { error } = await syncTechnicalResponsibles(
      supabase,
      contractId,
      technicalResponsibleIds,
      requesterId
    );
    if (error) {
      toast({ variant: "destructive", title: "Lưu tổ kiểm định viên tham gia thất bại", description: error });
    }
  }

  async function onSubmit(values: ContractFormValues) {
    setAssignmentError(null);
    if (technicalResponsibleIds.length > 0 && !requesterId) {
      setAssignmentError(
        "Vui lòng chọn \"Người đề nghị (đứng tên ký)\" trong số kiểm định viên đã tick."
      );
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      customer_id: values.customer_id,
      contract_no: values.contract_no,
      title: values.title || null,
      signed_date: values.signed_date || null,
      status: values.status,
      note: values.note || null,
      ...buildWorkRequestPayload(values),
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

        await syncResponsibles(inserted.id);

        // PROMPT-60 mục 7: "Tạo hợp đồng từ báo giá" -- copy CÁC quote_items
        // CÓ equipment_id sang contract_equipment (bỏ qua item không có
        // equipment_id, thiết bị đó chưa tồn tại trong /equipment), rồi đánh
        // dấu báo giá đã chuyển đổi. Không chặn luồng tạo hợp đồng nếu bước
        // này lỗi -- hợp đồng đã tạo thành công, chỉ báo riêng qua toast.
        if (fromQuoteId) {
          const { data: quoteItems } = await supabase
            .from("quote_items")
            .select("equipment_id, quantity, unit_price")
            .eq("quote_id", fromQuoteId);

          const linkedItems = (quoteItems ?? []).filter((i) => i.equipment_id);
          const skippedCount = (quoteItems?.length ?? 0) - linkedItems.length;

          if (linkedItems.length > 0) {
            await supabase.from("contract_equipment").insert(
              linkedItems.map((i) => ({
                contract_id: inserted.id,
                equipment_id: i.equipment_id as string,
                quantity: i.quantity,
                unit_price: i.unit_price,
              }))
            );
          }

          await supabase
            .from("quotes")
            .update({ converted_contract_id: inserted.id, status: "da_chap_nhan" })
            .eq("id", fromQuoteId);

          toast(
            skippedCount > 0
              ? {
                  title: "Đã thêm hợp đồng",
                  description: `Còn ${skippedCount} hạng mục chưa có thiết bị trong hệ thống -- thêm tay ở phần Thiết bị trong hợp đồng.`,
                }
              : { title: "Đã thêm hợp đồng" }
          );
          router.push(`/contracts/${inserted.id}`);
          router.refresh();
          return;
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

      await syncResponsibles(contract!.id);

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
                  <Input placeholder="15/2026/HĐKT-INCERT" {...field} />
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

        <div className="flex flex-col gap-4 rounded-md border p-4">
          <div>
            <h3 className="text-sm font-semibold">Thông tin đề nghị thực hiện công việc</h3>
            <p className="text-xs text-muted-foreground">
              Dùng khi xuất Giấy đề nghị thực hiện công việc — có thể để trống nếu chưa cần.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="work_request_document_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số văn bản</FormLabel>
                  <FormControl>
                    <Input placeholder="12/2026" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Chỉ nhập số/năm — khi xuất, hệ thống tự ghép thành "Số: {"{giá trị}"}/KĐ".
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa điểm thực hiện</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="execution_time_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời gian thực hiện</FormLabel>
                  <FormControl>
                    <Input placeholder="24/08/2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contract_type_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại hình hợp đồng</FormLabel>
                  <FormControl>
                    <Input placeholder="Giấy đề nghị theo Hợp đồng nguyên tắc" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="using_unit_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Đơn vị/Dự án sử dụng</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="using_unit_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ ĐV/DA sử dụng</FormLabel>
                  <FormControl>
                    <Input placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Kiểm định viên tham gia</label>
            {inspectorOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có tài khoản kiểm định viên nào.</p>
            ) : (
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-3">
                {inspectorOptions.map((person) => (
                  <label key={person.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={technicalResponsibleIds.includes(person.id)}
                      onChange={() => toggleResponsible(person.id)}
                    />
                    {person.full_name || "—"}
                  </label>
                ))}
              </div>
            )}
          </div>

          {technicalResponsibleIds.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Người đề nghị (đứng tên ký)</label>
              <div className="flex flex-col gap-1 rounded-md border p-3">
                {inspectorOptions
                  .filter((person) => technicalResponsibleIds.includes(person.id))
                  .map((person) => (
                    <label key={person.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="requester"
                        className="h-4 w-4"
                        checked={requesterId === person.id}
                        onChange={() => setRequesterId(person.id)}
                      />
                      {person.full_name || "—"}
                    </label>
                  ))}
              </div>
            </div>
          )}

          {assignmentError && (
            <p className="text-[0.8rem] font-medium text-destructive">{assignmentError}</p>
          )}
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
