import { test, expect, type Locator } from "@playwright/test";
import { loginAs } from "./helpers/auth";

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";

// Test màu sắc chính xác (pixel/hex) dễ giòn theo thay đổi thiết kế nhỏ --
// chỉ xác nhận logo load được (không 404/vỡ ảnh) và các trang vẫn hoạt
// động bình thường sau khi đổi theme, đúng tinh thần yêu cầu.
async function expectImageLoaded(locator: Locator) {
  await expect(locator).toBeVisible();
  const naturalWidth = await locator.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(naturalWidth, "ảnh phải load được (naturalWidth > 0), không phải ảnh vỡ/404").toBeGreaterThan(0);
}

test.describe("Branding: logo INCERT + màu thương hiệu", () => {
  test("logo hiện và load được ở header sau khi đăng nhập", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/dashboard");

    await expectImageLoaded(page.locator("header img[alt='INCERT']"));
  });

  test("logo hiện và load được ở trang /login", async ({ page }) => {
    await page.goto("/login");

    await expectImageLoaded(page.locator("img[alt='INCERT']"));
  });

  test("các trang chính vẫn load bình thường sau khi đổi theme màu", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();

    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Khách hàng" })).toBeVisible();

    await page.goto("/equipment");
    await expect(page.getByRole("heading", { name: "Thiết bị" })).toBeVisible();
  });
});
