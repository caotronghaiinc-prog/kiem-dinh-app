import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { getExpiryStatus, type ExpiryColor } from "@/lib/utils/expiry-status";
import { ExpiryAlertWidget } from "./expiry-alert-widget";
import { InspectionStatsWidget } from "./inspection-stats-widget";
import { NewCustomersWidget } from "./new-customers-widget";
import { EquipmentStatusWidget } from "./equipment-status-widget";
import { CalibrationAlertWidget } from "./calibration-alert-widget";
import { EditRequestAlertWidget } from "./edit-request-alert-widget";
import type { EditRequestAlertRow, EquipmentAlertRow, ToolAlertRow } from "./types";

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
  const isAdmin = profile?.role === "admin";

  const [
    { data: equipmentData },
    { count: inactiveCount },
    { count: passCount },
    { count: failCount },
    { count: pendingCount },
    { count: newCustomersThisMonth },
    { count: newCustomersLastMonth },
    { data: toolsData },
    { data: editRequestsData, count: editRequestsCount },
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
    supabase
      .from("inspection_tools")
      .select("id, code, name, calibration_due_date, calibration_not_applicable"),
    // PROMPT-51: chỉ admin cần thấy -- không query cho role khác, tránh phí
    // 1 round-trip vô ích (isAdmin đã biết trước từ profile fetch ở trên).
    isAdmin
      ? supabase
          .from("inspection_edit_requests")
          .select(
            "id, reason, created_at, requested_by:profiles!inspection_edit_requests_requested_by_fkey(full_name), inspection_history:inspection_history(equipment:equipment(id, code, name))",
            { count: "exact" }
          )
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null, count: null }),
  ]);

  const equipment = (equipmentData ?? []) as unknown as EquipmentAlertRow[];

  const colorCounts: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
  for (const item of equipment) {
    colorCounts[getExpiryStatus(item.expiry_date).color] += 1;
  }

  // calibration_not_applicable = true -- coi như không có hạn cần theo dõi,
  // loại khỏi widget ngay ở đây (xem ghi chú ToolAlertRow ở types.ts).
  const tools: ToolAlertRow[] = (toolsData ?? [])
    .filter((t) => !t.calibration_not_applicable)
    .map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      calibration_due_date: t.calibration_due_date,
    }));

  // Bỏ qua dòng nào lỡ thiếu equipment (không nên xảy ra vì FK not null
  // xuyên suốt inspection_edit_requests -> inspection_history -> equipment,
  // nhưng an toàn hơn khi join lồng nhiều tầng).
  const editRequests: EditRequestAlertRow[] = (editRequestsData ?? [])
    .map((r) => {
      const historyRow = r.inspection_history as unknown as {
        equipment: { id: string; code: string; name: string } | null;
      } | null;
      const equipmentRow = historyRow?.equipment ?? null;
      if (!equipmentRow) return null;
      return {
        id: r.id,
        reason: r.reason,
        created_at: r.created_at,
        requested_by_name:
          (r.requested_by as unknown as { full_name: string | null } | null)?.full_name ?? null,
        equipment_id: equipmentRow.id,
        equipment_code: equipmentRow.code,
        equipment_name: equipmentRow.name,
      };
    })
    .filter((r): r is EditRequestAlertRow => r !== null);

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
        <CalibrationAlertWidget tools={tools} />
        {isAdmin && (
          <EditRequestAlertWidget requests={editRequests} totalCount={editRequestsCount ?? 0} />
        )}
      </div>
    </div>
  );
}
