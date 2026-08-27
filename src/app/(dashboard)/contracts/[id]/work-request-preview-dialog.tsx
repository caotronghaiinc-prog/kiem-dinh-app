"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { numberToVietnameseWords } from "@/lib/utils/number-to-words-vi";
import { getEquipmentModelCode } from "@/lib/equipment/spec-fields";
import { buildWorkRequestDocx } from "@/lib/reports/contract-work-request";
import { buildWorkRequestPayload, syncTechnicalResponsibles } from "@/lib/contracts/work-request-fields";
import type { ContractDetail, ContractEquipmentRow, ContractPerson } from "../types";

const DIRECTOR_TITLE = "Giám đốc";

function orPlaceholder(value: string): string {
  return value.trim() ? value.trim() : "……………………";
}

function workContentLine(row: ContractEquipmentRow): string {
  const modelCode = getEquipmentModelCode(row.equipment?.spec_values);
  const base = `Kiểm định kỹ thuật an toàn ${row.equipment?.name || "—"}`;
  return modelCode ? `${base} (mã hiệu ${modelCode})` : base;
}

// PROMPT-67: mirror phép tính trong buildWorkTable() của contract-work-
// request.ts -- KHÔNG sửa file đó (giữ nguyên "hàm thuần buildXxxDocx",
// quyết định mentor), tính lại tổng ở đây riêng cho panel xem trước.
function calcTotals(equipment: ContractEquipmentRow[]) {
  const totalBeforeVat = equipment.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  const vat = Math.round(totalBeforeVat * 0.08);
  return { totalBeforeVat, vat, grandTotal: totalBeforeVat + vat };
}

interface FieldValues {
  work_request_document_no: string;
  site_location: string;
  execution_time_note: string;
  contract_type_note: string;
  using_unit_name: string;
  using_unit_address: string;
}

function initialValues(contract: ContractDetail): FieldValues {
  return {
    work_request_document_no: contract.work_request_document_no ?? "",
    site_location: contract.site_location ?? "",
    execution_time_note: contract.execution_time_note ?? "",
    contract_type_note: contract.contract_type_note ?? "",
    using_unit_name: contract.using_unit_name ?? "",
    using_unit_address: contract.using_unit_address ?? "",
  };
}

// PROMPT-67: thay tải thẳng bằng dialog xem trước + sửa trực tiếp -- mỗi
// dòng nội dung là 1 ô nhập thật, panel bên trái đọc lại state ĐANG GÕ DỞ
// (không phải dữ liệu đã lưu) để cập nhật theo thời gian thực. Nút mở dialog
// LUÔN bật khi còn thiết bị (khác PROMPT-66 disable-khi-thiếu-dữ-liệu cũ --
// giờ sửa ngay tại chỗ được nên chỉ chặn ở nút "Lưu & Tải xuống").
export function WorkRequestPreviewDialog({
  contract,
  equipment,
  inspectorOptions,
}: {
  contract: ContractDetail;
  equipment: ContractEquipmentRow[];
  inspectorOptions: ContractPerson[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [values, setValues] = useState<FieldValues>(() => initialValues(contract));
  const [technicalResponsibleIds, setTechnicalResponsibleIds] = useState<string[]>(
    contract.technicalResponsibles.map((p) => p.id)
  );
  const [requesterId, setRequesterId] = useState<string>(contract.requester?.id ?? "");

  function resetState() {
    setValues(initialValues(contract));
    setTechnicalResponsibleIds(contract.technicalResponsibles.map((p) => p.id));
    setRequesterId(contract.requester?.id ?? "");
    setAssignmentError(null);
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) resetState();
    setOpen(next);
  }

  function updateField(key: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Bỏ tick 1 người đang là "Người đề nghị" -- tự reset lựa chọn người đề
  // nghị, không để lại tham chiếu treo (mirror contract-form.tsx).
  function toggleResponsible(id: string) {
    setTechnicalResponsibleIds((current) => {
      const next = current.includes(id) ? current.filter((r) => r !== id) : [...current, id];
      if (!next.includes(requesterId)) setRequesterId("");
      return next;
    });
  }

  const selectedResponsibles = inspectorOptions.filter((p) => technicalResponsibleIds.includes(p.id));
  const responsibleNames = orPlaceholder(
    selectedResponsibles
      .map((p) => p.full_name)
      .filter((n): n is string => !!n?.trim())
      .join(", ")
  );
  const requesterName = inspectorOptions.find((p) => p.id === requesterId)?.full_name ?? null;

  const { totalBeforeVat, vat, grandTotal } = calcTotals(equipment);
  const amountWords = numberToVietnameseWords(grandTotal);

  async function handleSaveAndDownload() {
    setAssignmentError(null);
    // Giữ NGUYÊN đúng ràng buộc bắt buộc trước khi tải đã có từ PROMPT-66
    // (trước đây chặn ở nút mở dialog: technicalResponsibles rỗng HOẶC
    // chưa có requester) -- giờ dialog cho sửa ngay tại chỗ nên chuyển gate
    // này sang lúc bấm "Lưu & Tải xuống" thay vì chặn từ lúc mở dialog.
    // KHÁC validate nhẹ hơn của contract-form.tsx (form "Sửa hợp đồng"
    // không bắt buộc phải có người tham gia mới lưu được hợp đồng).
    if (technicalResponsibleIds.length === 0 || !requesterId) {
      setAssignmentError(
        "Cần chọn ít nhất 1 \"Kiểm định viên tham gia\" và 1 \"Người đề nghị\" trước khi lưu & tải giấy đề nghị."
      );
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload = buildWorkRequestPayload(values);
    const { error: updateError } = await supabase
      .from("contracts")
      .update(payload)
      .eq("id", contract.id);

    if (updateError) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu đề nghị thực hiện công việc thất bại",
        description: logAndGetSafeMessage(updateError, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    const { error: syncError } = await syncTechnicalResponsibles(
      supabase,
      contract.id,
      technicalResponsibleIds,
      requesterId
    );

    if (syncError) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Lưu tổ kiểm định viên tham gia thất bại",
        description: syncError,
      });
      return;
    }

    const mergedContract: ContractDetail = {
      ...contract,
      ...payload,
      technicalResponsibles: selectedResponsibles,
      requester: requesterId
        ? { id: requesterId, full_name: requesterName }
        : null,
    };

    try {
      const blob = await buildWorkRequestDocx(mergedContract, equipment, new Date().toISOString());
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Giay_de_nghi_${contract.contract_no.replace(/[\\/]/g, "-")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Đã lưu và tải đề nghị thực hiện công việc" });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Tải file thất bại",
        description: logAndGetSafeMessage(
          error,
          "Dữ liệu đã lưu nhưng tải file lỗi, vui lòng thử xuất lại."
        ),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={equipment.length === 0}>
          <Download className="h-4 w-4" />
          Xuất đề nghị thực hiện công việc
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xem trước & sửa Giấy đề nghị thực hiện công việc</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 text-sm">
            <p className="text-center font-semibold">GIẤY ĐỀ NGHỊ THỰC HIỆN CÔNG VIỆC</p>
            <p>Tôi tên là: {orPlaceholder(requesterName ?? "")}</p>
            <p>Đề nghị {DIRECTOR_TITLE} cho phép thực hiện công việc như sau:</p>

            <div className="overflow-x-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Nội dung công việc</th>
                    <th className="p-2 text-right">SL</th>
                    <th className="p-2 text-right">Đơn giá</th>
                    <th className="p-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{workContentLine(row)}</td>
                      <td className="p-2 text-right">{row.quantity}</td>
                      <td className="p-2 text-right">{row.unit_price.toLocaleString("vi-VN")}</td>
                      <td className="p-2 text-right">
                        {(row.quantity * row.unit_price).toLocaleString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Tổng tiền chưa VAT:
                    </td>
                    <td className="p-2 text-right font-medium">{totalBeforeVat.toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-medium">
                      Tiền thuế VAT (8%):
                    </td>
                    <td className="p-2 text-right font-medium">{vat.toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right font-semibold">
                      Tổng cộng:
                    </td>
                    <td className="p-2 text-right font-semibold">{grandTotal.toLocaleString("vi-VN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="italic">Số tiền bằng chữ: {amountWords} đồng</p>

            <div className="flex flex-col gap-1">
              <p>- Đơn vị yêu cầu (Bên A): {orPlaceholder(contract.customer?.company_name ?? "")}</p>
              <p>- Địa chỉ: {orPlaceholder(contract.customer?.address ?? "")}</p>
              <p>- Mã số thuế: {orPlaceholder(contract.customer?.tax_code ?? "")}</p>
              <p>- Địa điểm thực hiện: {orPlaceholder(values.site_location)}</p>
              <p>- Thời gian thực hiện: {orPlaceholder(values.execution_time_note)}</p>
              <p>
                - Người liên hệ: {orPlaceholder(contract.customer?.contact_name ?? "")} — Số điện
                thoại liên hệ: {orPlaceholder(contract.customer?.phone ?? "")}
              </p>
              <p>- Người chịu trách nhiệm kỹ thuật: {responsibleNames}</p>
              <p>- Loại hình hợp đồng: {orPlaceholder(values.contract_type_note)}</p>
              <p>- Đơn vị/Dự án sử dụng: {orPlaceholder(values.using_unit_name)}</p>
              <p>- Địa chỉ ĐV/DA sử dụng: {orPlaceholder(values.using_unit_address)}</p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="font-semibold">GIÁM ĐỐC</p>
                <p className="text-xs text-muted-foreground">(Ký, ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-semibold">NGƯỜI ĐỀ NGHỊ</p>
                <p className="text-xs text-muted-foreground">{orPlaceholder(requesterName ?? "")}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-document-no" className="text-sm font-medium">
                  Số văn bản
                </label>
                <Input
                  id="wr-document-no"
                  placeholder="12/2026"
                  value={values.work_request_document_no}
                  onChange={(e) => updateField("work_request_document_no", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-site-location" className="text-sm font-medium">
                  Địa điểm thực hiện
                </label>
                <Input
                  id="wr-site-location"
                  value={values.site_location}
                  onChange={(e) => updateField("site_location", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-execution-time" className="text-sm font-medium">
                  Thời gian thực hiện
                </label>
                <Input
                  id="wr-execution-time"
                  placeholder="24/08/2026"
                  value={values.execution_time_note}
                  onChange={(e) => updateField("execution_time_note", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-contract-type" className="text-sm font-medium">
                  Loại hình hợp đồng
                </label>
                <Input
                  id="wr-contract-type"
                  placeholder="Giấy đề nghị theo Hợp đồng nguyên tắc"
                  value={values.contract_type_note}
                  onChange={(e) => updateField("contract_type_note", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-using-unit-name" className="text-sm font-medium">
                  Đơn vị/Dự án sử dụng
                </label>
                <Input
                  id="wr-using-unit-name"
                  value={values.using_unit_name}
                  onChange={(e) => updateField("using_unit_name", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wr-using-unit-address" className="text-sm font-medium">
                  Địa chỉ ĐV/DA sử dụng
                </label>
                <Input
                  id="wr-using-unit-address"
                  value={values.using_unit_address}
                  onChange={(e) => updateField("using_unit_address", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Kiểm định viên tham gia</label>
              {inspectorOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có tài khoản kiểm định viên nào.</p>
              ) : (
                <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-3">
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
                  {selectedResponsibles.map((person) => (
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
          <Button type="button" disabled={submitting} onClick={handleSaveAndDownload}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu & Tải xuống
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
