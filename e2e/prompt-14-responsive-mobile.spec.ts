import { test, expect, type Page } from "@playwright/test";
import { createAdminClient, loginAs } from "./helpers/auth";

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE -- nhỏ nhất phổ biến
const SEED_PREFIX = "PW TEST Mobile";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Bắt lỗi tràn ngang tự động thay vì assert từng pixel thủ công. Dung sai
 * 1px cho sai số làm tròn sub-pixel giữa scrollWidth/innerWidth (không phải
 * tràn thật). */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
  expect(overflow, "document.body.scrollWidth phải <= viewport width (không tràn ngang)").toBeLessThanOrEqual(1);
}

async function expectDialogFitsViewport(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "dialog phải đo được bounding box").not.toBeNull();
  expect(viewport, "phải có viewport size").not.toBeNull();

  if (box && viewport) {
    expect(box.x, "dialog không được tràn bên trái").toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, "dialog không được tràn bên phải").toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y, "dialog không được tràn phía trên").toBeGreaterThanOrEqual(0);
  }

  await expectNoHorizontalOverflow(page);
}

test.describe("PROMPT-14: Responsive mobile toàn hệ thống", () => {
  let customerId: string;
  let equipmentId: string;

  test.beforeAll(async () => {
    const supabase = createAdminClient();

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        company_name: `${SEED_PREFIX} Công ty`,
        contact_name: "Nguyễn Văn Test",
        phone: "0900000099",
        type: "doanh nghiệp",
      })
      .select("id")
      .single();
    if (customerError || !customer) {
      throw new Error(`Seed customer thất bại: ${customerError?.message}`);
    }
    customerId = customer.id;

    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .insert({
        customer_id: customerId,
        name: `${SEED_PREFIX} Thiết bị`,
        type: "Nồi hơi",
        expiry_date: isoDate(addDays(new Date(), 10)), // <=30 ngày -> đỏ (để test nút Zalo + inspection)
        inspection_cycle: 12,
      })
      .select("id")
      .single();
    if (equipmentError || !equipment) {
      throw new Error(`Seed equipment thất bại: ${equipmentError?.message}`);
    }
    equipmentId = equipment.id;
  });

  test.afterAll(async () => {
    const supabase = createAdminClient();
    if (equipmentId) {
      await supabase.from("equipment").delete().eq("id", equipmentId);
    }
    if (customerId) {
      await supabase.from("customers").delete().eq("id", customerId);
    }
  });

  test("không trang nào tràn ngang ở viewport 375x667", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    // /login không cần đăng nhập.
    await page.goto("/login");
    await expectNoHorizontalOverflow(page);

    await loginAs(page, ADMIN_EMAIL);

    const routes = [
      "/dashboard",
      "/customers",
      "/customers/new",
      `/customers/${customerId}`,
      `/customers/${customerId}/edit`,
      "/equipment",
      "/equipment/new",
      `/equipment/${equipmentId}`,
      `/equipment/${equipmentId}/edit`,
    ];

    for (const route of routes) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("mobile: hamburger hiện đúng, mở menu đủ 3 link, click điều hướng đúng và đóng menu", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    // Nav ngang (desktop) phải ẩn, chỉ còn icon hamburger.
    await expect(page.getByTestId("mobile-nav-trigger")).toBeVisible();
    await expect(page.getByTestId("mobile-nav-menu")).toHaveCount(0);

    await page.getByTestId("mobile-nav-trigger").click();
    await expect(page.getByTestId("mobile-nav-menu")).toBeVisible();

    // PROMPT-15: bỏ "Kiểm tra kết nối" (trang debug lộ thông tin cho mọi
    // role, xem PROGRESS.md) -- menu giờ còn 3 link.
    const links = page.getByTestId("mobile-nav-link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveText("Tổng quan");
    await expect(links.nth(1)).toHaveText("Khách hàng");
    await expect(links.nth(2)).toHaveText("Thiết bị");

    await links.nth(1).click();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByTestId("mobile-nav-menu")).toHaveCount(0);
  });

  test("form thêm khách hàng không tràn màn hình mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/customers/new");

    await expect(page.getByRole("heading", { name: "Thêm khách hàng" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("modal '+ Thêm bản ghi kiểm định' vừa khít màn hình mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/equipment/${equipmentId}`);

    await page.getByRole("button", { name: "+ Thêm bản ghi kiểm định" }).click();
    await expectDialogFitsViewport(page);
  });

  test("modal 'Soạn tin nhắn Zalo' vừa khít màn hình mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/customers/${customerId}`);

    // Mock route API nội bộ -- không gọi OpenAI thật (tốn phí), chỉ cần
    // kiểm tra layout dialog, giống cách e2e/prompt-12-zalo-message.spec.ts
    // đã làm.
    await page.route(`**/api/customers/${customerId}/draft-zalo-message`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Nội dung test giả lập cho kiểm tra layout mobile." }),
      });
    });

    await page.getByTestId("zalo-draft-trigger").click();
    await expectDialogFitsViewport(page);
  });
});
