import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/role-labels";
import { CertificatesSection } from "./certificates-section";
import type { CertificateRow, EmployeeDetail } from "../types";

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

export default async function EmployeeDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  // PROMPT-63: trang chi tiết nhân viên/chứng chỉ CHỈ admin.
  await requireRole(["admin"]);

  const supabase = await createClient();

  const [{ data: employeeData }, { data: certificatesData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, active")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("inspector_certificates")
      .select(
        "id, certificate_type, certificate_number, issued_by, issued_date, expiry_date, equipment_types, scope_note, file_path, note"
      )
      .eq("profile_id", params.id)
      .order("expiry_date", { ascending: true }),
  ]);

  if (!employeeData) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy nhân viên</h1>
        <p className="text-muted-foreground">Nhân viên này không tồn tại.</p>
        <Button asChild>
          <Link href="/employees">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const employee = employeeData as EmployeeDetail;
  const certificates = (certificatesData ?? []) as unknown as CertificateRow[];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <Link
        href="/employees"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{employee.full_name || employee.email}</h1>
            {employee.active ? (
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                Đang làm việc
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                Ngừng
              </Badge>
            )}
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Họ tên" value={employee.full_name} />
          <InfoField label="Email" value={employee.email} />
          <InfoField label="SĐT" value={employee.phone} />
          <InfoField label="Vai trò" value={ROLE_LABELS[employee.role] ?? employee.role} />
        </div>
      </section>

      <CertificatesSection profileId={employee.id} certificates={certificates} canEdit />
    </div>
  );
}
