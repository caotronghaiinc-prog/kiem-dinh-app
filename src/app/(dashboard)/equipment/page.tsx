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
import { EquipmentToolbar } from "./equipment-toolbar";
import { EquipmentTableRow } from "./equipment-row";
import { EquipmentCard } from "./equipment-card";
import type { EquipmentListItem, FilterOption } from "./types";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp — loại bỏ khỏi input
// người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const q = firstParam(searchParams.q).trim();
  const typeFilter = firstParam(searchParams.type).trim();
  const customerIdFilter = firstParam(searchParams.customerId).trim();

  const supabase = await createClient();
  const profile = await getCurrentUserProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "inspector";

  // Dữ liệu để dựng option cho 2 dropdown lọc -- lấy toàn bộ (không áp filter
  // hiện tại) để dropdown luôn đủ lựa chọn dù đang lọc dở. Dataset thiết bị
  // nội bộ công ty ở quy mô nhỏ nên fetch trọn "type" + "customer" là đủ rẻ,
  // không cần một cơ chế DISTINCT phía SQL riêng.
  const { data: filterSourceData } = await supabase
    .from("equipment")
    .select("type, customer:customers(id, company_name)");

  const typeOptions = Array.from(
    new Set(
      (filterSourceData ?? [])
        .map((row) => row.type)
        .filter((t): t is string => Boolean(t))
    )
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const customerOptionsMap = new Map<string, string>();
  for (const row of filterSourceData ?? []) {
    const customer = row.customer as unknown as { id: string; company_name: string } | null;
    if (customer) customerOptionsMap.set(customer.id, customer.company_name);
  }
  const customerOptions: FilterOption[] = Array.from(customerOptionsMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));

  // Tìm theo tên KH thực chất là tìm qua bảng customers -- lấy trước danh
  // sách id khách hàng khớp tên rồi ghép vào .or() bằng customer_id.in.(...)
  // thay vì lọc trên bảng embed, để chắc chắn đúng thay vì phụ thuộc cú pháp
  // filter-qua-embedded-table nâng cao của PostgREST (không kiểm thử trực
  // tiếp được trong sandbox này).
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
    .from("equipment")
    .select(
      "id, code, name, type, expiry_date, status, customer:customers(company_name)",
      { count: "exact" }
    )
    .order("expiry_date", { ascending: true, nullsFirst: false });

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  }
  if (customerIdFilter) {
    query = query.eq("customer_id", customerIdFilter);
  }
  if (term) {
    const orParts = [`name.ilike.%${term}%`, `code.ilike.%${term}%`];
    if (matchingCustomerIds.length > 0) {
      orParts.push(`customer_id.in.(${matchingCustomerIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data, error } = await query;
  const equipment = (data ?? []) as unknown as EquipmentListItem[];
  const hasFilters = Boolean(q) || Boolean(typeFilter) || Boolean(customerIdFilter);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Thiết bị</h1>
        <p className="text-muted-foreground">Quản lý thiết bị của khách hàng.</p>
      </div>

      <EquipmentToolbar
        initialQuery={q}
        initialType={typeFilter}
        initialCustomerId={customerIdFilter}
        typeOptions={typeOptions}
        customerOptions={customerOptions}
      />

      {error ? (
        // OWASP RULE-20: không hiện nguyên văn lỗi Postgres/PostgREST --
        // log ở server, chỉ hiện message chung cho người dùng.
        <p className="text-sm text-destructive">
          {logAndGetSafeMessage(error, "Không tải được danh sách thiết bị. Vui lòng thử lại.")}
        </p>
      ) : equipment.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {hasFilters ? "Không tìm thấy thiết bị phù hợp." : "Chưa có thiết bị nào."}
          </p>
          {!hasFilters && (
            <RoleGate allowedRoles={["admin", "inspector"]}>
              <Button asChild>
                <Link href="/equipment/new">+ Thêm thiết bị</Link>
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
                  <TableHead>Mã TB</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hạn kiểm định</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <EquipmentTableRow key={item.id} equipment={item} canEdit={canEdit} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {equipment.map((item) => (
              <EquipmentCard key={item.id} equipment={item} canEdit={canEdit} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
