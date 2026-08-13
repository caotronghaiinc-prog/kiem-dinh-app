import { test, expect } from "@playwright/test";
import { createAdminClient, loginAs } from "./helpers/auth";

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";
const INSPECTOR_EMAIL = "caotronghai.incosaf@gmail.com";

// Tiền tố hiếm gặp để đảm bảo không trùng với dữ liệu thật đang có trong DB.
const CUSTOMER_TERM = "ZZZPWSEARCHCUST";
const EQUIPMENT_TERM = "ZZZPWSEARCHEQUIP";
const NO_MATCH_TERM = "ZZZPWSEARCHNOMATCH";

test.describe("PROMPT-13: Tìm kiếm toàn hệ thống", () => {
  let searchCustomerId: string;
  let ownerCustomerId: string;
  let searchEquipmentId: string;

  test.beforeAll(async () => {
    const supabase = createAdminClient();

    const { data: searchCustomer, error: searchCustomerError } = await supabase
      .from("customers")
      .insert({ company_name: `${CUSTOMER_TERM} Công ty`, type: "doanh nghiệp" })
      .select("id")
      .single();
    if (searchCustomerError || !searchCustomer) {
      throw new Error(`Seed customer tìm kiếm thất bại: ${searchCustomerError?.message}`);
    }
    searchCustomerId = searchCustomer.id;

    // Chủ sở hữu thiết bị -- tên KHÔNG chứa CUSTOMER_TERM/EQUIPMENT_TERM để 2
    // nhóm kết quả tách biệt rõ ràng khi test riêng từng nhóm.
    const { data: ownerCustomer, error: ownerCustomerError } = await supabase
      .from("customers")
      .insert({ company_name: "PW TEST Search Chủ sở hữu thiết bị", type: "doanh nghiệp" })
      .select("id")
      .single();
    if (ownerCustomerError || !ownerCustomer) {
      throw new Error(`Seed customer chủ thiết bị thất bại: ${ownerCustomerError?.message}`);
    }
    ownerCustomerId = ownerCustomer.id;

    const { data: searchEquipment, error: searchEquipmentError } = await supabase
      .from("equipment")
      .insert({
        customer_id: ownerCustomerId,
        name: `${EQUIPMENT_TERM} Thiết bị`,
        type: "Nồi hơi",
        inspection_cycle: 12,
      })
      .select("id")
      .single();
    if (searchEquipmentError || !searchEquipment) {
      throw new Error(`Seed equipment tìm kiếm thất bại: ${searchEquipmentError?.message}`);
    }
    searchEquipmentId = searchEquipment.id;
  });

  test.afterAll(async () => {
    const supabase = createAdminClient();
    if (searchEquipmentId) {
      await supabase.from("equipment").delete().eq("id", searchEquipmentId);
    }
    if (searchCustomerId) {
      await supabase.from("customers").delete().eq("id", searchCustomerId);
    }
    if (ownerCustomerId) {
      await supabase.from("customers").delete().eq("id", ownerCustomerId);
    }
  });

  test("gõ từ khóa khớp khách hàng -> dropdown hiện đúng nhóm Khách hàng", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);

    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();
    await expect(page.getByText("Khách hàng", { exact: true })).toBeVisible();
    await expect(page.getByTestId("global-search-customer-result")).toHaveCount(1);
    await expect(page.getByTestId("global-search-customer-result")).toContainText(CUSTOMER_TERM);
    await expect(page.getByTestId("global-search-equipment-result")).toHaveCount(0);
  });

  test("gõ từ khóa khớp thiết bị -> dropdown hiện đúng nhóm Thiết bị kèm tên KH sở hữu", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(EQUIPMENT_TERM);

    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();
    await expect(page.getByText("Thiết bị", { exact: true })).toBeVisible();
    await expect(page.getByTestId("global-search-equipment-result")).toHaveCount(1);
    await expect(page.getByTestId("global-search-equipment-result")).toContainText(EQUIPMENT_TERM);
    await expect(page.getByTestId("global-search-equipment-result")).toContainText(
      "PW TEST Search Chủ sở hữu thiết bị"
    );
    await expect(page.getByTestId("global-search-customer-result")).toHaveCount(0);
  });

  test("gõ từ khóa không khớp gì -> hiện Không tìm thấy kết quả", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(NO_MATCH_TERM);

    await expect(page.getByTestId("global-search-empty")).toBeVisible();
    await expect(page.getByText("Không tìm thấy kết quả")).toBeVisible();
  });

  test("click vào 1 kết quả -> điều hướng đúng trang chi tiết, đóng dropdown", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);
    await page.getByTestId("global-search-customer-result").click();

    await expect(page).toHaveURL(`/customers/${searchCustomerId}`);
    await expect(page.getByTestId("global-search-dropdown")).toHaveCount(0);
  });

  test("click ra ngoài / bấm Escape -> dropdown đóng", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);
    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();

    // Ô tìm kiếm giờ full-width ở hàng riêng nên dropdown có thể che cả
    // nội dung trang bên dưới (vd tiêu đề H1) tùy số kết quả -- click vào
    // 1 điểm chắc chắn nằm ngoài dropdown: góc trên-trái header (hàng nav,
    // luôn ở TRÊN hàng tìm kiếm nên không bao giờ bị dropdown che).
    await page.mouse.click(10, 10);
    await expect(page.getByTestId("global-search-dropdown")).toHaveCount(0);

    // Gõ lại rồi thử đóng bằng Escape.
    await page.getByTestId("global-search-input").fill(`${CUSTOMER_TERM}2`);
    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);
    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("global-search-dropdown")).toHaveCount(0);
  });

  test("hoạt động đúng với role inspector", async ({ page }) => {
    await loginAs(page, INSPECTOR_EMAIL);
    await page.goto("/dashboard");

    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);

    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();
    await expect(page.getByTestId("global-search-customer-result")).toHaveCount(1);
  });

  test("responsive mobile: ô tìm kiếm luôn hiện sẵn dạng input full-width, không còn icon thu gọn", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    // Input hiện sẵn ngay từ đầu -- không còn nút icon kính lúp riêng.
    await expect(page.getByTestId("global-search-mobile-trigger")).toHaveCount(0);
    await expect(page.getByTestId("global-search-input")).toBeVisible();

    await page.getByTestId("global-search-input").fill(CUSTOMER_TERM);
    await expect(page.getByTestId("global-search-dropdown")).toBeVisible();
    await expect(page.getByTestId("global-search-customer-result")).toHaveCount(1);
  });
});
