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
import { AuditLogToolbar } from "./audit-log-toolbar";
import { AuditLogTableRow } from "./audit-log-row";
import { AuditLogCard } from "./audit-log-card";
import { PaginationControls } from "./pagination-controls";
import type { AuditLogRow, ProfileOption } from "./types";

const PAGE_SIZE = 20;
const VALID_TABLES = ["equipment", "customers", "inspection_history"] as const;
const VALID_ACTIONS = ["insert", "update", "delete"] as const;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AuditLogPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  await requireRole(["admin"]);

  const searchParams = await props.searchParams;
  const rawTable = firstParam(searchParams.table).trim();
  const table = (VALID_TABLES as readonly string[]).includes(rawTable) ? rawTable : "";
  const rawAction = firstParam(searchParams.action).trim();
  const action = (VALID_ACTIONS as readonly string[]).includes(rawAction) ? rawAction : "";
  const changedBy = firstParam(searchParams.changed_by).trim();
  const from = firstParam(searchParams.from).trim();
  const to = firstParam(searchParams.to).trim();
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);

  const supabase = await createClient();

  // Công ty ít người -- fetch trọn danh sách profiles làm option cho dropdown
  // "Người thực hiện", không cần lazy-load/search riêng.
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });
  const profileOptions: ProfileOption[] = profilesData ?? [];

  // Chỉ 1 FK từ audit_log tới profiles (changed_by) -- không bị lỗi PGRST201
  // ambiguous như inspection_tool_loans/inspection_edit_requests, không cần
  // cú pháp !fkey_name.
  let query = supabase
    .from("audit_log")
    .select(
      "id, table_name, record_id, action, changed_at, old_data, new_data, changed_by:profiles(full_name)",
      { count: "exact" }
    )
    .order("changed_at", { ascending: false });

  if (table) query = query.eq("table_name", table);
  if (action) query = query.eq("action", action);
  if (changedBy) query = query.eq("changed_by", changedBy);
  if (from) query = query.gte("changed_at", `${from}T00:00:00`);
  if (to) query = query.lte("changed_at", `${to}T23:59:59.999`);

  const pageFrom = (page - 1) * PAGE_SIZE;
  const pageTo = pageFrom + PAGE_SIZE - 1;
  query = query.range(pageFrom, pageTo);

  const { data, count, error } = await query;

  const logs = (data ?? []) as unknown as AuditLogRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(table || action || changedBy || from || to);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Nhật ký thay đổi</h1>
        <p className="text-muted-foreground">
          Lịch sử thêm/sửa/xóa trên thiết bị, khách hàng và bản ghi kiểm định.
        </p>
      </div>

      <AuditLogToolbar
        initialTable={table}
        initialAction={action}
        initialChangedBy={changedBy}
        initialFrom={from}
        initialTo={to}
        profileOptions={profileOptions}
      />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được nhật ký thay đổi. Vui lòng thử lại.")}
        </p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy bản ghi phù hợp." : "Chưa có nhật ký nào."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Bản ghi</TableHead>
                  <TableHead>Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogTableRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} />
            ))}
          </div>

          <PaginationControls page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
