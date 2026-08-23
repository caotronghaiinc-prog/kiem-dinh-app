import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { logAndGetSafeMessage } from "@/lib/errors";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeesToolbar } from "./employees-toolbar";
import { EmployeeTableRow } from "./employee-row";
import { EmployeeCard } from "./employee-card";
import type { EmployeeListItem } from "./types";
import type { UserRole } from "@/lib/types/profile";

const VALID_ROLES: readonly UserRole[] = ["admin", "inspector", "accountant", "office"];

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ khỏi
// input người dùng để tránh phá vỡ filter (mirror tools/page.tsx).
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export default async function EmployeesPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  // PROMPT-63: trang danh sách nhân viên/chứng chỉ CHỈ admin -- chặn cả
  // server-side (không chỉ ẩn UI), mirror requireRole ở audit-log/page.tsx.
  await requireRole(["admin"]);

  const searchParams = await props.searchParams;
  const q = firstParam(searchParams.q).trim();
  const rawRole = firstParam(searchParams.role).trim();
  const roleFilter = (VALID_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as UserRole)
    : null;

  const supabase = await createClient();
  const term = sanitizeSearchTerm(q);

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, active")
    .order("full_name", { ascending: true });

  if (roleFilter) {
    query = query.eq("role", roleFilter);
  }
  if (term) {
    query = query.or([`full_name.ilike.%${term}%`, `email.ilike.%${term}%`].join(","));
  }

  const { data, error } = await query;
  const employees = (data ?? []) as EmployeeListItem[];
  const hasFilters = Boolean(q) || Boolean(roleFilter);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Nhân viên</h1>
        <p className="text-muted-foreground">
          Danh sách nhân viên, kiểm định viên và chứng chỉ hoạt động.
        </p>
      </div>

      <EmployeesToolbar initialQuery={q} initialRole={roleFilter ?? ""} />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được danh sách nhân viên. Vui lòng thử lại.")}
        </p>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy nhân viên phù hợp." : "Chưa có nhân viên nào."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <EmployeeTableRow key={employee.id} employee={employee} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {employees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
