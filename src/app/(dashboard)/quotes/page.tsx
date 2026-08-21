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
import { QuotesToolbar } from "./quotes-toolbar";
import { QuoteTableRow } from "./quote-row";
import { QuoteCard } from "./quote-card";
import { PaginationControls } from "./pagination-controls";
import type { QuoteListItem } from "./types";

const PAGE_SIZE = 20;
const VALID_STATUSES = ["nhap", "da_gui", "da_chap_nhan", "tu_choi", "het_han"] as const;
type StatusFilter = "all" | (typeof VALID_STATUSES)[number];

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ khỏi
// input người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export default async function QuotesPage(
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
  const term = sanitizeSearchTerm(q);

  // customer_name_snapshot nằm THẲNG trên quotes (không phải join qua
  // customers) -- khác contracts/page.tsx, không cần pre-query customers.
  let query = supabase
    .from("quotes")
    .select("id, code, customer_id, customer_name_snapshot, total_value, status, valid_until", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (term) {
    query = query.or(`code.ilike.%${term}%,customer_name_snapshot.ilike.%${term}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  const quotes = (data ?? []) as unknown as QuoteListItem[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Báo giá</h1>
        <p className="text-muted-foreground">Quản lý báo giá dịch vụ kiểm định.</p>
      </div>

      <QuotesToolbar initialQuery={q} initialStatus={status} />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được danh sách báo giá. Vui lòng thử lại.")}
        </p>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy báo giá phù hợp." : "Chưa có báo giá nào."}
          </p>
          {!hasFilters && (
            <RoleGate allowedRoles={["admin", "inspector"]}>
              <Button asChild>
                <Link href="/quotes/new">+ Tạo báo giá</Link>
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
                  <TableHead>Mã BG</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Hạn báo giá</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <QuoteTableRow key={quote.id} quote={quote} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
          </div>

          <PaginationControls page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
