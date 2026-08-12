import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SearchResults } from "@/components/search/types";

const RESULT_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp, "%" là wildcard
// ilike -- loại bỏ khỏi input người dùng để tránh phá vỡ filter (giống
// cách /customers, /equipment đã làm).
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

const EMPTY_RESULTS: SearchResults = {
  customers: [],
  customersTotal: 0,
  equipment: [],
  equipmentTotal: 0,
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const term = sanitizeSearchTerm(searchParams.get("q") ?? "");

  if (term.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(EMPTY_RESULTS);
  }

  // 2 bảng tìm song song, không tuần tự.
  const [customersResult, equipmentResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, code, company_name", { count: "exact" })
      .or(`company_name.ilike.%${term}%,code.ilike.%${term}%,phone.ilike.%${term}%`)
      .order("company_name", { ascending: true })
      .range(0, RESULT_LIMIT - 1),
    supabase
      .from("equipment")
      .select("id, code, name, customer:customers(company_name)", { count: "exact" })
      .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
      .order("name", { ascending: true })
      .range(0, RESULT_LIMIT - 1),
  ]);

  if (customersResult.error || equipmentResult.error) {
    return NextResponse.json(
      { error: "Không tìm kiếm được, vui lòng thử lại." },
      { status: 500 }
    );
  }

  const results: SearchResults = {
    customers: (customersResult.data ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      companyName: c.company_name,
    })),
    customersTotal: customersResult.count ?? 0,
    equipment: (equipmentResult.data ?? []).map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      customerCompanyName:
        (e.customer as unknown as { company_name: string } | null)?.company_name ?? null,
    })),
    equipmentTotal: equipmentResult.count ?? 0,
  };

  return NextResponse.json(results);
}
