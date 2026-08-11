import { test, expect, type Page } from "@playwright/test";
import { getExpiryStatus, type ExpiryColor } from "../src/lib/utils/expiry-status";
import { createAdminClient, loginAs } from "./helpers/auth";

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";
const INSPECTOR_EMAIL = "caotronghai.incosaf@gmail.com";
const SEED_PREFIX = "PW TEST";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function widgetCount(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(testId).innerText();
  const parsed = Number(text.trim());
  expect(Number.isNaN(parsed), `data-testid="${testId}" không phải số: "${text}"`).toBe(false);
  return parsed;
}

test.describe("PROMPT-10: Dashboard (/dashboard)", () => {
  // Toàn bộ test seed/đọc dữ liệu THẬT trên cùng project Supabase (không có
  // DB test riêng ở quy mô app này) -- seed thêm vài bản ghi "PW TEST ..."
  // để đảm bảo widget 1/2 luôn có gì đó để hiện (không rơi vào empty state
  // ngẫu nhiên tùy thời điểm chạy), rồi dọn sạch ở afterAll. Số liệu kỳ
  // vọng của MỌI assertion đều tính lại bằng cách query trực tiếp Supabase
  // ngay trong test (không hard-code số) -- test kiểm tra đúng cả dữ liệu
  // seed lẫn dữ liệu thật sẵn có trong DB.
  let seededCustomerId: string;
  const seededEquipmentIds: string[] = [];
  const seededInspectionIds: string[] = [];

  test.beforeAll(async () => {
    const supabase = createAdminClient();

    const { data: inspectorProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", INSPECTOR_EMAIL)
      .single();
    if (profileError || !inspectorProfile) {
      throw new Error(
        `Không tìm thấy profile inspector (${INSPECTOR_EMAIL}) để seed inspection_history: ${profileError?.message}`
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({ company_name: `${SEED_PREFIX} Công ty Playwright`, type: "doanh nghiệp" })
      .select("id")
      .single();
    if (customerError || !customer) {
      throw new Error(`Seed customer thất bại: ${customerError?.message}`);
    }
    seededCustomerId = customer.id;

    const today = new Date();
    const expirySeeds = [
      { name: `${SEED_PREFIX} Đỏ`, expiry_date: isoDate(addDays(today, 10)) }, // <=30 ngày -> đỏ
      { name: `${SEED_PREFIX} Vàng`, expiry_date: isoDate(addDays(today, 45)) }, // 31-60 -> vàng
      { name: `${SEED_PREFIX} Xanh`, expiry_date: isoDate(addDays(today, 200)) }, // >60 -> xanh
    ];

    for (const seed of expirySeeds) {
      const { data: eq, error: eqError } = await supabase
        .from("equipment")
        .insert({
          customer_id: seededCustomerId,
          name: seed.name,
          type: "Nồi hơi",
          expiry_date: seed.expiry_date,
          inspection_cycle: 12,
        })
        .select("id")
        .single();
      if (eqError || !eq) {
        throw new Error(`Seed equipment "${seed.name}" thất bại: ${eqError?.message}`);
      }
      seededEquipmentIds.push(eq.id);
    }

    const resultSeeds = ["pass", "fail", "pending"] as const;
    for (const result of resultSeeds) {
      const { data: insp, error: inspError } = await supabase
        .from("inspection_history")
        .insert({
          equipment_id: seededEquipmentIds[0],
          inspection_date: isoDate(today),
          result,
          inspector_id: inspectorProfile.id,
        })
        .select("id")
        .single();
      if (inspError || !insp) {
        throw new Error(`Seed inspection_history (${result}) thất bại: ${inspError?.message}`);
      }
      seededInspectionIds.push(insp.id);
    }
  });

  test.afterAll(async () => {
    const supabase = createAdminClient();
    if (seededInspectionIds.length) {
      await supabase.from("inspection_history").delete().in("id", seededInspectionIds);
    }
    if (seededEquipmentIds.length) {
      await supabase.from("equipment").delete().in("id", seededEquipmentIds);
    }
    if (seededCustomerId) {
      await supabase.from("customers").delete().eq("id", seededCustomerId);
    }
  });

  test("hiện đủ 4 widget cho admin", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.getByTestId("widget-expiry-alert")).toBeVisible();
    await expect(page.getByTestId("widget-inspection-stats")).toBeVisible();
    await expect(page.getByTestId("widget-new-customers")).toBeVisible();
    await expect(page.getByTestId("widget-equipment-status")).toBeVisible();

    // <CardTitle> (components/ui/card.tsx) render bằng <div>, không phải thẻ
    // heading thật -- dùng getByText thay vì getByRole("heading").
    await expect(page.getByTestId("widget-expiry-alert").getByText("Cảnh báo hạn kiểm định")).toBeVisible();
    await expect(page.getByTestId("widget-inspection-stats").getByText("Thống kê kiểm định")).toBeVisible();
    await expect(
      page.getByTestId("widget-new-customers").getByText("Khách hàng mới", { exact: true })
    ).toBeVisible();
    await expect(page.getByTestId("widget-equipment-status").getByText("Thiết bị theo trạng thái")).toBeVisible();
  });

  test("hiện đủ 4 widget cho inspector (mọi role xem được, không cần phân quyền riêng)", async ({
    page,
  }) => {
    await loginAs(page, INSPECTOR_EMAIL);
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.getByTestId("widget-expiry-alert")).toBeVisible();
    await expect(page.getByTestId("widget-inspection-stats")).toBeVisible();
    await expect(page.getByTestId("widget-new-customers")).toBeVisible();
    await expect(page.getByTestId("widget-equipment-status")).toBeVisible();
  });

  test("widget 1: số đếm đỏ/vàng/xanh khớp getExpiryStatus() tính từ TẤT CẢ equipment (không dùng cột status)", async ({
    page,
  }) => {
    const supabase = createAdminClient();
    const { data: equipmentRows, error } = await supabase
      .from("equipment")
      .select("expiry_date")
      .neq("status", "inactive");
    if (error || !equipmentRows) {
      throw new Error(`Không đọc được equipment để tính số kỳ vọng: ${error?.message}`);
    }

    const expected: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
    for (const row of equipmentRows) {
      expected[getExpiryStatus(row.expiry_date).color] += 1;
    }

    await loginAs(page, ADMIN_EMAIL);

    for (const color of ["red", "yellow", "green"] as const) {
      const actual = await widgetCount(page, `expiry-count-${color}`);
      expect(actual, `số đếm màu ${color}`).toBe(expected[color]);
    }
  });

  test("widget 1: danh sách 5 thiết bị hạn gần nhất đúng thứ tự expiry_date tăng dần", async ({
    page,
  }) => {
    const supabase = createAdminClient();
    const { data: expectedNearest, error } = await supabase
      .from("equipment")
      .select("code")
      .neq("status", "inactive")
      .not("expiry_date", "is", null)
      .order("expiry_date", { ascending: true })
      .limit(5);
    if (error || !expectedNearest) {
      throw new Error(`Không đọc được equipment để tính top 5 hạn gần nhất: ${error?.message}`);
    }

    await loginAs(page, ADMIN_EMAIL);

    if (expectedNearest.length === 0) {
      await expect(page.getByTestId("expiry-nearest-empty")).toBeVisible();
      return;
    }

    const rows = page.getByTestId("expiry-nearest-row");
    await expect(rows).toHaveCount(expectedNearest.length);

    const rowTexts = await rows.allInnerTexts();
    expectedNearest.forEach((expectedRow, index) => {
      expect(rowTexts[index], `dòng thứ ${index + 1} phải chứa mã ${expectedRow.code}`).toContain(
        expectedRow.code
      );
    });
  });

  test("widget 2: số bản ghi kiểm định tháng này theo kết quả khớp dữ liệu thật", async ({
    page,
  }) => {
    const supabase = createAdminClient();
    const now = new Date();
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const today = isoDate(now);

    const expected: Record<"pass" | "fail" | "pending", number> = { pass: 0, fail: 0, pending: 0 };
    for (const result of ["pass", "fail", "pending"] as const) {
      const { count, error } = await supabase
        .from("inspection_history")
        .select("id", { count: "exact", head: true })
        .eq("result", result)
        .gte("inspection_date", monthStart)
        .lte("inspection_date", today);
      if (error) {
        throw new Error(`Không đếm được inspection_history (${result}): ${error.message}`);
      }
      expected[result] = count ?? 0;
    }

    await loginAs(page, ADMIN_EMAIL);

    for (const result of ["pass", "fail", "pending"] as const) {
      const actual = await widgetCount(page, `inspection-count-${result}`);
      expect(actual, `số bản ghi kết quả ${result}`).toBe(expected[result]);
    }
  });

  test("widget 3: số khách hàng mới tháng này và tháng trước khớp dữ liệu thật", async ({
    page,
  }) => {
    const supabase = createAdminClient();
    const now = new Date();
    const thisMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthStart = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const { count: expectedThisMonth, error: thisMonthError } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thisMonthStart);
    const { count: expectedLastMonth, error: lastMonthError } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastMonthStart)
      .lt("created_at", thisMonthStart);
    if (thisMonthError || lastMonthError) {
      throw new Error(
        `Không đếm được customers: ${thisMonthError?.message ?? lastMonthError?.message}`
      );
    }

    await loginAs(page, ADMIN_EMAIL);

    const actualThisMonth = await widgetCount(page, "new-customers-this-month");
    const actualLastMonth = await widgetCount(page, "new-customers-last-month");
    expect(actualThisMonth, "khách hàng mới tháng này").toBe(expectedThisMonth ?? 0);
    expect(actualLastMonth, "khách hàng mới tháng trước").toBe(expectedLastMonth ?? 0);
  });

  test("widget 4: đếm thiết bị theo 4 nhóm (còn hạn/sắp hết hạn/quá hạn tính qua expiry_date, ngừng sử dụng tính qua status) khớp dữ liệu thật", async ({
    page,
  }) => {
    const supabase = createAdminClient();
    const { data: equipmentRows, error } = await supabase
      .from("equipment")
      .select("expiry_date")
      .neq("status", "inactive");
    const { count: expectedInactive, error: inactiveError } = await supabase
      .from("equipment")
      .select("id", { count: "exact", head: true })
      .eq("status", "inactive");
    if (error || !equipmentRows || inactiveError) {
      throw new Error(`Không đọc được equipment: ${error?.message ?? inactiveError?.message}`);
    }

    const expected: Record<ExpiryColor, number> = { red: 0, yellow: 0, green: 0 };
    for (const row of equipmentRows) {
      expected[getExpiryStatus(row.expiry_date).color] += 1;
    }

    await loginAs(page, ADMIN_EMAIL);

    expect(await widgetCount(page, "equipment-status-count-valid"), "còn hạn").toBe(expected.green);
    expect(await widgetCount(page, "equipment-status-count-expiring-soon"), "sắp hết hạn").toBe(
      expected.yellow
    );
    expect(await widgetCount(page, "equipment-status-count-expired"), "quá hạn").toBe(expected.red);
    expect(await widgetCount(page, "equipment-status-count-inactive"), "ngừng sử dụng").toBe(
      expectedInactive ?? 0
    );
  });

  test("responsive: lưới 2 cột trên desktop, 1 cột trên mobile", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    await page.setViewportSize({ width: 1280, height: 900 });
    const desktopColumns = await page
      .getByTestId("dashboard-widget-grid")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(desktopColumns, "số cột lưới ở desktop (lg breakpoint)").toBe(2);

    await page.setViewportSize({ width: 375, height: 812 });
    const mobileColumns = await page
      .getByTestId("dashboard-widget-grid")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(mobileColumns, "số cột lưới ở mobile").toBe(1);

    // Ở mobile, tất cả 4 widget vẫn phải hiển thị được (cuộn dọc), không bị
    // cắt/ẩn do layout vỡ.
    await expect(page.getByTestId("widget-expiry-alert")).toBeVisible();
    await expect(page.getByTestId("widget-inspection-stats")).toBeVisible();
    await expect(page.getByTestId("widget-new-customers")).toBeVisible();
    await expect(page.getByTestId("widget-equipment-status")).toBeVisible();
  });

  test("click 1 dòng trong widget 1 điều hướng đúng sang /equipment/[id]", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    const firstRow = page.getByTestId("expiry-nearest-row").first();
    // Nếu DB thật sự trống thiết bị có hạn thì bỏ qua (empty state đã được
    // test riêng ở test "danh sách 5 thiết bị hạn gần nhất" phía trên).
    if ((await firstRow.count()) === 0) {
      test.skip();
      return;
    }

    const href = await firstRow.getAttribute("href");
    expect(href).toMatch(/^\/equipment\/[^/]+$/);

    // Lần đầu ghé /equipment/[id] trong 1 lần chạy `next dev`, route được
    // compile on-demand nên có thể mất hơn timeout mặc định (5s) -- chờ
    // song song với click (đúng khuyến nghị của Playwright, tránh race) và
    // nới timeout riêng cho điều hướng này thay vì set timeout chung cho
    // cả file/test.
    await Promise.all([page.waitForURL(href!, { timeout: 30_000 }), firstRow.click()]);
  });

  test("link 'Xem tất cả' / 'Xem danh sách' trỏ đúng route", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    await expect(page.getByTestId("widget-expiry-alert").getByRole("link", { name: "Xem tất cả →" })).toHaveAttribute(
      "href",
      "/equipment"
    );
    await expect(
      page.getByTestId("widget-new-customers").getByRole("link", { name: "Xem danh sách →" })
    ).toHaveAttribute("href", "/customers");
  });
});
