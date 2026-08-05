import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomersToolbar } from "./customers-toolbar";
import { CustomerTableRow } from "./customer-row";
import { CustomerCard } from "./customer-card";
import { PaginationControls } from "./pagination-controls";
import type { CustomerListItem } from "@/lib/types/customer";

const PAGE_SIZE = 20;
const VALID_STATUSES = ["active", "potential", "inactive"] as const;
type StatusFilter = "all" | (typeof VALID_STATUSES)[number];

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp — loại bỏ khỏi input
// người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q = firstParam(searchParams.q).trim();
  const rawStatus = firstParam(searchParams.status);
  const status: StatusFilter = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select(
      "id, code, company_name, contact_name, phone, status, equipment(count)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const term = sanitizeSearchTerm(q);
  if (term) {
    query = query.or(
      `company_name.ilike.%${term}%,code.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  const customers = (data ?? []) as unknown as CustomerListItem[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Khách hàng</h1>
        <p className="text-muted-foreground">Quản lý danh sách khách hàng.</p>
      </div>

      <CustomersToolbar initialQuery={q} initialStatus={status} />

      {error ? (
        <p className="text-sm text-destructive">
          Không tải được danh sách khách hàng: {error.message}
        </p>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? "Không tìm thấy khách hàng phù hợp."
              : "Chưa có khách hàng nào."}
          </p>
          {!hasFilters && (
            <RoleGate allowedRoles={["admin"]}>
              <Button asChild>
                <Link href="/dashboard/customers/new">+ Thêm khách hàng</Link>
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
                  <TableHead>Mã KH</TableHead>
                  <TableHead>Tên công ty</TableHead>
                  <TableHead>Người liên hệ</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead className="text-center">Số thiết bị</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <CustomerTableRow key={customer.id} customer={customer} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          <PaginationControls page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
