import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { Button } from "@/components/ui/button";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";
import { TOOL_STATUS_OPTIONS } from "@/lib/tools/form-schema";
import { LoanHistorySection } from "./loan-history-section";
import { CalibrationHistorySection } from "./calibration-history-section";
import type { CalibrationRow, CustomerOption, LoanRow, ProfileOption, ToolRecord } from "../types";

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("vi-VN");
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {value ? (
        <span className="whitespace-pre-wrap text-sm">{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground/70">Chưa có thông tin</span>
      )}
    </div>
  );
}

export default async function ToolDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const supabase = await createClient();

  const [
    { data: toolData },
    { data: loansData },
    { data: calibrationsData },
    { data: profilesData },
    { data: customersData },
    profile,
  ] = await Promise.all([
    supabase
      .from("inspection_tools")
      .select(
        "id, code, name, model, serial_number, ownership_doc, calibration_due_date, calibration_not_applicable, calibration_cert_no, custodian_id, default_location, status, note, custodian:profiles(full_name)"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("inspection_tool_loans")
      .select(
        "id, borrowed_at, expected_return_at, returned_at, work_location, note, borrower:profiles!inspection_tool_loans_borrower_id_fkey(full_name), customer:customers(company_name)"
      )
      .eq("tool_id", params.id)
      .order("borrowed_at", { ascending: false }),
    supabase
      .from("inspection_tool_calibrations")
      .select("id, cert_no, issued_date, due_date, issuer, file_path, note")
      .eq("tool_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true }),
    supabase.from("customers").select("id, company_name").order("company_name", { ascending: true }),
    getCurrentUserProfile(),
  ]);

  if (!toolData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy dụng cụ</h1>
        <p className="text-muted-foreground">
          Dụng cụ này không tồn tại hoặc đã bị xóa.
        </p>
        <Button asChild>
          <Link href="/tools">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const tool = toolData as unknown as ToolRecord & {
    custodian: { full_name: string | null } | null;
  };
  const loans = (loansData ?? []) as unknown as LoanRow[];
  const calibrations = (calibrationsData ?? []) as unknown as CalibrationRow[];
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";
  const hasActiveLoan = loans.some((loan) => loan.returned_at === null);
  const calibrationStatus = tool.calibration_not_applicable
    ? null
    : getExpiryStatus(tool.calibration_due_date);
  const statusLabel =
    TOOL_STATUS_OPTIONS.find((opt) => opt.value === tool.status)?.label ?? tool.status;

  const borrowerOptions: ProfileOption[] = (profilesData ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email,
  }));
  const customerOptions: CustomerOption[] = customersData ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <Link
        href="/tools"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">
              {tool.code} — {tool.name}
            </h1>
            {calibrationStatus ? (
              <span
                className={`inline-flex items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[calibrationStatus.color]}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[calibrationStatus.color]}`}
                />
                {calibrationStatus.label}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Không áp dụng hiệu chuẩn</span>
            )}
          </div>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/tools/${tool.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Model" value={tool.model} />
          <InfoField label="Số serial" value={tool.serial_number} />
          <InfoField label="Giấy tờ sở hữu" value={tool.ownership_doc} />
          <InfoField
            label="Hạn hiệu chuẩn"
            value={tool.calibration_not_applicable ? "Không áp dụng" : formatDate(tool.calibration_due_date)}
          />
          <InfoField label="Số giấy kiểm định/hiệu chuẩn" value={tool.calibration_cert_no} />
          <InfoField label="Người quản lý" value={tool.custodian?.full_name ?? null} />
          <InfoField label="Nơi cất giữ mặc định" value={tool.default_location} />
          <InfoField label="Trạng thái" value={statusLabel} />
          <InfoField label="Ghi chú" value={tool.note} />
        </div>
      </section>

      <CalibrationHistorySection toolId={tool.id} calibrations={calibrations} canEdit={canEdit} />

      <LoanHistorySection
        toolId={tool.id}
        loans={loans}
        canEdit={canEdit}
        hasActiveLoan={hasActiveLoan}
        borrowerOptions={borrowerOptions}
        customerOptions={customerOptions}
      />
    </div>
  );
}
