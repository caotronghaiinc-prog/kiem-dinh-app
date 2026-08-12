import { test, expect } from "@playwright/test";
import { createAdminClient, loginAs } from "./helpers/auth";

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";
const SEED_PREFIX = "PW TEST Zalo";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Draft-zalo-message chạy server-side trong Route Handler (fetch tới
// api.openai.com xảy ra trong tiến trình Node của `next dev`, KHÔNG phải
// từ trình duyệt) -- page.route() của Playwright chỉ chặn được request do
// chính trang trong trình duyệt phát ra, không chặn được request server-
// side đó. Vì vậy mock ở đúng ranh giới Playwright kiểm soát được: request
// trình duyệt gọi TỚI route API nội bộ của app
// (/api/customers/[id]/draft-zalo-message) -- vẫn đạt đúng mục tiêu (không
// gọi OpenAI thật, không tốn phí, không phụ thuộc mạng/quota, test được đủ
// mọi trạng thái UI: loading/thành công/lỗi/thử lại).
test.describe("PROMPT-12: Soạn tin nhắn Zalo bằng AI", () => {
  let alertCustomerId: string;
  let noAlertCustomerId: string;
  const seededEquipmentIds: string[] = [];

  test.beforeAll(async () => {
    const supabase = createAdminClient();
    const today = new Date();

    const { data: alertCustomer, error: alertCustomerError } = await supabase
      .from("customers")
      .insert({
        company_name: `${SEED_PREFIX} Có Cảnh Báo`,
        contact_name: "Nguyễn Văn A",
        phone: "0900000001",
        type: "doanh nghiệp",
      })
      .select("id")
      .single();
    if (alertCustomerError || !alertCustomer) {
      throw new Error(`Seed khách hàng có cảnh báo thất bại: ${alertCustomerError?.message}`);
    }
    alertCustomerId = alertCustomer.id;

    const { data: redEquipment, error: redEquipmentError } = await supabase
      .from("equipment")
      .insert({
        customer_id: alertCustomerId,
        name: `${SEED_PREFIX} Thiết bị đỏ`,
        type: "Nồi hơi",
        expiry_date: isoDate(addDays(today, 10)), // <=30 ngày -> đỏ
        inspection_cycle: 12,
      })
      .select("id")
      .single();
    if (redEquipmentError || !redEquipment) {
      throw new Error(`Seed thiết bị đỏ thất bại: ${redEquipmentError?.message}`);
    }
    seededEquipmentIds.push(redEquipment.id);

    const { data: noAlertCustomer, error: noAlertCustomerError } = await supabase
      .from("customers")
      .insert({ company_name: `${SEED_PREFIX} Không Cảnh Báo`, type: "doanh nghiệp" })
      .select("id")
      .single();
    if (noAlertCustomerError || !noAlertCustomer) {
      throw new Error(`Seed khách hàng không cảnh báo thất bại: ${noAlertCustomerError?.message}`);
    }
    noAlertCustomerId = noAlertCustomer.id;

    const { data: greenEquipment, error: greenEquipmentError } = await supabase
      .from("equipment")
      .insert({
        customer_id: noAlertCustomerId,
        name: `${SEED_PREFIX} Thiết bị xanh`,
        type: "Nồi hơi",
        expiry_date: isoDate(addDays(today, 200)), // >60 ngày -> xanh
        inspection_cycle: 12,
      })
      .select("id")
      .single();
    if (greenEquipmentError || !greenEquipment) {
      throw new Error(`Seed thiết bị xanh thất bại: ${greenEquipmentError?.message}`);
    }
    seededEquipmentIds.push(greenEquipment.id);
  });

  test.afterAll(async () => {
    const supabase = createAdminClient();
    if (seededEquipmentIds.length) {
      await supabase.from("equipment").delete().in("id", seededEquipmentIds);
    }
    if (alertCustomerId) {
      await supabase.from("customers").delete().eq("id", alertCustomerId);
    }
    if (noAlertCustomerId) {
      await supabase.from("customers").delete().eq("id", noAlertCustomerId);
    }
  });

  test("hiện nút khi khách hàng có thiết bị đỏ/vàng", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/customers/${alertCustomerId}`);
    await expect(page.getByTestId("zalo-draft-trigger")).toBeVisible();
  });

  test("ẩn hẳn nút khi khách hàng không có thiết bị đỏ/vàng nào", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/customers/${noAlertCustomerId}`);
    await expect(page.getByTestId("zalo-draft-trigger")).toHaveCount(0);
  });

  test("bấm nút -> hiện loading -> hiện nội dung mock -> Copy hoạt động", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/customers/${alertCustomerId}`);

    const mockMessage =
      "Chào anh/chị, thiết bị của mình sắp đến hạn kiểm định, INCOSAF xin liên hệ để sắp xếp lịch tái kiểm định ạ.";

    await page.route(`**/api/customers/${alertCustomerId}/draft-zalo-message`, async (route) => {
      // Delay ngắn để có thời gian assert trạng thái loading trước khi
      // response về, giả lập độ trễ gọi OpenAI thật.
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: mockMessage }),
      });
    });

    await page.getByTestId("zalo-draft-trigger").click();
    await expect(page.getByTestId("zalo-draft-loading")).toBeVisible();
    await expect(page.getByTestId("zalo-draft-textarea")).toBeVisible();
    await expect(page.getByTestId("zalo-draft-textarea")).toHaveValue(mockMessage);

    await page.getByTestId("zalo-draft-copy").click();
    await expect(
      page.getByText("Đã copy, dán vào Zalo để gửi", { exact: true })
    ).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(mockMessage);
  });

  test("API lỗi -> hiện thông báo lỗi + nút Thử lại; Thử lại thành công thì hiện nội dung", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/customers/${alertCustomerId}`);

    let callCount = 0;
    await page.route(`**/api/customers/${alertCustomerId}/draft-zalo-message`, async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "Soạn tin nhắn thất bại: giả lập lỗi OpenAI" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Nội dung sau khi thử lại thành công." }),
        });
      }
    });

    await page.getByTestId("zalo-draft-trigger").click();
    await expect(page.getByTestId("zalo-draft-error")).toBeVisible();
    await expect(page.getByText("giả lập lỗi OpenAI")).toBeVisible();
    await expect(page.getByTestId("zalo-draft-retry")).toBeVisible();

    await page.getByTestId("zalo-draft-retry").click();
    await expect(page.getByTestId("zalo-draft-textarea")).toBeVisible();
    await expect(page.getByTestId("zalo-draft-textarea")).toHaveValue(
      "Nội dung sau khi thử lại thành công."
    );
  });
});
