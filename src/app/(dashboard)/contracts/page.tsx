import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
import { ContractsToolbar } from "./contracts-toolbar";
import { ContractTableRow } from "./contract-row";
import { ContractCard } from "./contract-card";
import { PaginationControls } from "./pagination-controls";
import type { ContractListItem } from "./types";

const PAGE_SIZE = 20;
const VALID_STATUSES = ["dang_thuc_hien", "hoan_thanh", "da_thanh_ly", "huy"] as const;
type StatusFilter = "all" | (typeof VALID_STATUSES)[number];

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ khỏi
// input người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export default async function ContractsPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const q = firstParam(searchParams.q).trim();
  const rawStatus = firstParam(searchParams.status);
  const status: StatusFilter = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);

  const supabase = await createClient();

  // Tìm theo tên KH thực chất là tìm qua bảng customers -- lấy trước danh
  // sách id khách hàng khớp tên rồi ghép vào .or() bằng customer_id.in.(...)
  // (mirror đúng cách equipment/page.tsx đang làm).
  const term = sanitizeSearchTerm(q);
  let matchingCustomerIds: string[] = [];
  if (term) {
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .ilike("company_name", `%${term}%`);
    matchingCustomerIds = (matchedCustomers ?? []).map((c) => c.id);
  }

  let query = supabase
    .from("contracts")
    .select(
      "id, code, contract_no, total_value, paid_total, status, customer:customers(company_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (term) {
    const orParts = [`contract_no.ilike.%${term}%`, `code.ilike.%${term}%`];
    if (matchingCustomerIds.length > 0) {
      orParts.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  const contracts = (data ?? []) as unknown as ContractListItem[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Hợp đồng</h1>
        <p className="text-muted-foreground">Quản lý hợp đồng và công nợ khách hàng.</p>
      </div>

      <ContractsToolbar initialQuery={q} initialStatus={status} />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được danh sách hợp đồng. Vui lòng thử lại.")}
        </p>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy hợp đồng phù hợp." : "Chưa có hợp đồng nào."}
          </p>
          {!hasFilters && (
            <RoleGate allowedRoles={["admin", "inspector"]}>
              <Button asChild>
                <Link href="/contracts/new">+ Thêm hợp đồng</Link>
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
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Số hợp đồng</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Còn nợ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <ContractTableRow key={contract.id} contract={contract} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} />
            ))}
          </div>

          <PaginationControls page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
