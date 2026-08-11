import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { getExpiryStatus, type ExpiryColor } from "@/lib/utils/expiry-status";
import { ExpiryAlertWidget } from "./expiry-alert-widget";
import { InspectionStatsWidget } from "./inspection-stats-widget";
import { NewCustomersWidget } from "./new-customers-widget";
import { EquipmentStatusWidget } from "./equipment-status-widget";
import type { EquipmentAlertRow } from "./types";

// Chuỗi ngày dạng YYYY-MM-DD dùng cho .gte()/.lt() trên cột date lẫn
// timestamptz -- Postgres tự cast, không cần format riêng cho từng cột.
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentUserProfile();

  const now = new Date();
  const thisMonthStart = currentMonthStart();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthLabel = `${now.getMonth() + 1}/${now.getFullYear()}`;

  const [
    { data: equipmentData },
    { count: inactiveCount },
    { count: passCount },
    { count: failCount },
    { count: pendingCount },
    { count: newCustomersThisMonth },
    { count: newCustomersLastMonth },
  ] = await Promise.all([
    // Chỉ 4 cột cần thiết + lọc sẵn status != 'inactive' -- widget 1 và 4
    // dùng chung 1 lần fetch này, tự tính đỏ/vàng/xanh bằng
    // getExpiryStatus() từ expiry_date (KHÔNG dùng cột status, vì status
    // không phân biệt được đỏ/vàng -- xem PROGRESS.md / ghi chú PROMPT-08).
    supabase
      .from("equipment")
      .select("id, code, name, expiry_date, customer:customers(company_name)")
      .neq("status", "inactive"),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("status", "inactive"),
    supabase
      .from("inspection_history")
      .select("id", { count: "exact", head: true })
      .eq("result", "pass")
      .gte("inspection_date", isoDate(thisMonthStart))
      .lte("inspection_date", isoDate(now)),
    supabase
      .from("inspection_history")
      .select("id", { count: "exact", head: true })
      .eq("result", "fail")
      .gte("inspection_date", isoDate(thisMonthStart))
      .lte("inspection_date", isoDate(now)),
    supabase
      .from("inspection_history")
      .select("id", { count: "exact", head: true })
      .eq("result", "pending")
      .gte("inspection_date", isoDate(thisMonthStart))
      .lte("inspection_date", isoDate(now)),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", isoDate(thisMonthStart)),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", isoDate(lastMonthStart))
      .lt("created_at", isoDate(thisMonthStart)),
  ]);

  const equipment = (equipmentData ?? []) as unknown as EquipmentAlertRow[];

  const colorCounts: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
  for (const item of equipment) {
    colorCounts[getExpiryStatus(item.expiry_date).color] += 1;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">
          Xin chào {profile?.full_name || profile?.email}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2" data-testid="dashboard-widget-grid">
        <ExpiryAlertWidget equipment={equipment} />
        <InspectionStatsWidget
          pass={passCount ?? 0}
          fail={failCount ?? 0}
          pending={pendingCount ?? 0}
          monthLabel={monthLabel}
        />
        <NewCustomersWidget
          thisMonth={newCustomersThisMonth ?? 0}
          lastMonth={newCustomersLastMonth ?? 0}
        />
        <EquipmentStatusWidget
          valid={colorCounts.green}
          expiringSoon={colorCounts.yellow}
          expired={colorCounts.red}
          inactive={inactiveCount ?? 0}
        />
      </div>
    </div>
  );
}
