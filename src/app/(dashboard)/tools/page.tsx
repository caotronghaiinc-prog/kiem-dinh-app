import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { logAndGetSafeMessage } from "@/lib/errors";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getExpiryStatus } from "@/lib/utils/expiry-status";
import { ToolsToolbar } from "./tools-toolbar";
import { ToolTableRow } from "./tool-row";
import { ToolCard } from "./tool-card";
import type { ToolListItem } from "./types";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ khỏi
// input người dùng để tránh phá vỡ filter (mirror equipment/page.tsx).
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

interface RawLoan {
  borrower: { full_name: string | null } | null;
  borrowed_at: string;
  work_location: string | null;
  returned_at: string | null;
}

export default async function ToolsPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = firstParam(searchParams.q).trim();
  const statusFilter = firstParam(searchParams.status).trim();
  const calibrationFilter = firstParam(searchParams.calibration).trim();

  const supabase = await createClient();
  const profile = await getCurrentUserProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";

  const term = sanitizeSearchTerm(q);
  let query = supabase
    .from("inspection_tools")
    .select(
      "id, code, name, model, serial_number, calibration_due_date, calibration_not_applicable, custodian:profiles(full_name), loans:inspection_tool_loans(borrower:profiles!inspection_tool_loans_borrower_id_fkey(full_name), borrowed_at, work_location, returned_at)"
    )
    .order("code", { ascending: true });

  if (term) {
    query = query.or(
      [`name.ilike.%${term}%`, `code.ilike.%${term}%`, `model.ilike.%${term}%`].join(",")
    );
  }

  const { data, error } = await query;

  const tools: ToolListItem[] = (data ?? []).map((row) => {
    const loans = (row.loans ?? []) as unknown as RawLoan[];
    const activeLoan = loans.find((loan) => loan.returned_at === null) ?? null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      model: row.model,
      serial_number: row.serial_number,
      calibration_due_date: row.calibration_due_date,
      calibration_not_applicable: row.calibration_not_applicable,
      custodian: row.custodian as unknown as { full_name: string | null } | null,
      activeLoan: activeLoan
        ? {
            borrower: activeLoan.borrower,
            borrowed_at: activeLoan.borrowed_at,
            work_location: activeLoan.work_location,
          }
        : null,
    };
  });

  let filteredTools = tools;
  if (statusFilter === "available") {
    filteredTools = filteredTools.filter((t) => !t.activeLoan);
  } else if (statusFilter === "on_loan") {
    filteredTools = filteredTools.filter((t) => Boolean(t.activeLoan));
  }
  if (calibrationFilter === "expiring") {
    filteredTools = filteredTools.filter((t) => {
      if (t.calibration_not_applicable) return false;
      const color = getExpiryStatus(t.calibration_due_date).color;
      return color === "red" || color === "yellow";
    });
  }

  const hasFilters = Boolean(q) || Boolean(statusFilter) || Boolean(calibrationFilter);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Dụng cụ đo</h1>
        <p className="text-muted-foreground">
          Quản lý dụng cụ đo/thiết bị kiểm tra của công ty -- người quản lý, mượn/trả, hạn hiệu
          chuẩn.
        </p>
      </div>

      <ToolsToolbar
        initialQuery={q}
        initialStatus={statusFilter}
        initialCalibration={calibrationFilter}
      />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được danh sách dụng cụ. Vui lòng thử lại.")}
        </p>
      ) : filteredTools.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy dụng cụ phù hợp." : "Chưa có dụng cụ nào."}
          </p>
          {!hasFilters && (
            <RoleGate allowedRoles={["admin", "inspector"]}>
              <Button asChild>
                <Link href="/tools/new">+ Thêm dụng cụ</Link>
              </Button>
            </RoleGate>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên dụng cụ</TableHead>
                  <TableHead>Model/Serial</TableHead>
                  <TableHead>Người quản lý</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hạn hiệu chuẩn</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => (
                  <ToolTableRow key={tool.id} tool={tool} canEdit={canEdit} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} canEdit={canEdit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
