import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient, getRoleClient, loginAs } from "./helpers/auth";
import { loadEnvLocal } from "./helpers/env";

loadEnvLocal();

// =========================================================================
// PROMPT-15: Bộ test RANH GIỚI PHÂN QUYỀN hợp nhất -- khác với các spec
// theo từng tính năng trước đó (prompt-10, prompt-13...), file này CHỈ tập
// trung vào "role nào được làm gì" trên MỌI tính năng đã build, để dễ chạy
// lại nguyên khối mỗi khi có tính năng mới thay vì phải nhớ rải rác nhiều
// spec. 2 tầng test riêng biệt:
//
//   1. Tầng DB (RLS) -- gọi thẳng Supabase bằng JWT thật của từng role, HOÀN
//      TOÀN không qua UI/browser. Đây là bằng chứng bảo mật thật: ẩn nút
//      trong UI không ngăn được ai đó gọi thẳng REST API.
//   2. Tầng UI -- xác nhận app cũng ẩn đúng nút / chặn đúng route, để trải
//      nghiệm người dùng nhất quán với những gì RLS cho phép (không phải để
//      "bảo mật" mà để UI không gây hiểu lầm/gây lỗi 403 khó hiểu).
// =========================================================================

const ADMIN_EMAIL = "caotronghai.inc@gmail.com";
const INSPECTOR_EMAIL = "caotronghai.incosaf@gmail.com";
const SEED_PREFIX = "PW PERM";

function uniqueCode(label: string): string {
  return `${SEED_PREFIX}-${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("PROMPT-15: Ranh giới phân quyền", () => {
  let seededCustomerId: string;
  let seededEquipmentId: string;
  const cleanupCustomerIds: string[] = [];
  const cleanupEquipmentIds: string[] = [];
  const cleanupInspectionIds: string[] = [];

  test.beforeAll(async () => {
    const admin = createAdminClient();

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({ code: uniqueCode("CUST-SEED"), company_name: `${SEED_PREFIX} Công ty gốc` })
      .select("id")
      .single();
    if (customerError || !customer) {
      throw new Error(`Seed customer gốc thất bại: ${customerError?.message}`);
    }
    seededCustomerId = customer.id;
    cleanupCustomerIds.push(customer.id);

    const { data: equipment, error: equipmentError } = await admin
      .from("equipment")
      .insert({
        code: uniqueCode("EQ-SEED"),
        customer_id: seededCustomerId,
        name: `${SEED_PREFIX} Thiết bị gốc`,
      })
      .select("id")
      .single();
    if (equipmentError || !equipment) {
      throw new Error(`Seed equipment gốc thất bại: ${equipmentError?.message}`);
    }
    seededEquipmentId = equipment.id;
    cleanupEquipmentIds.push(equipment.id);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (cleanupInspectionIds.length) {
      await admin.from("inspection_history").delete().in("id", cleanupInspectionIds);
    }
    if (cleanupEquipmentIds.length) {
      await admin.from("equipment").delete().in("id", cleanupEquipmentIds);
    }
    if (cleanupCustomerIds.length) {
      await admin.from("customers").delete().in("id", cleanupCustomerIds);
    }
  });

  test.describe("Tầng DB (RLS) -- gọi thẳng Supabase với JWT thật của từng role", () => {
    test("customers: inspector CREATE được, KHÔNG UPDATE/DELETE được (RLS chặn ở Postgres)", async () => {
      const inspectorClient = await getRoleClient(INSPECTOR_EMAIL);

      const { data: created, error: createError } = await inspectorClient
        .from("customers")
        .insert({ code: uniqueCode("CUST-INS"), company_name: `${SEED_PREFIX} Inspector tạo` })
        .select("id")
        .single();
      expect(createError, "inspector phải tạo customer được (RULE matrix: Inspector Create)").toBeNull();
      expect(created).not.toBeNull();
      if (created) cleanupCustomerIds.push(created.id);

      // PostgREST không throw lỗi khi UPDATE/DELETE bị RLS chặn -- nó âm
      // thầm trả về 0 dòng bị ảnh hưởng. Phải dùng .select() sau update/
      // delete để phân biệt "0 dòng vì bị chặn" với "chạy thành công".
      const { data: updateResult, error: updateError } = await inspectorClient
        .from("customers")
        .update({ company_name: "Sửa trái phép bởi inspector" })
        .eq("id", seededCustomerId)
        .select();
      expect(updateError, "update không nên trả lỗi (RLS âm thầm chặn)").toBeNull();
      expect(updateResult, "inspector KHÔNG được sửa customer -- RLS phải trả về 0 dòng").toEqual([]);

      const { data: deleteResult, error: deleteError } = await inspectorClient
        .from("customers")
        .delete()
        .eq("id", seededCustomerId)
        .select();
      expect(deleteError).toBeNull();
      expect(deleteResult, "inspector KHÔNG được xóa customer -- RLS phải trả về 0 dòng").toEqual([]);

      const admin = createAdminClient();
      const { data: stillIntact } = await admin
        .from("customers")
        .select("company_name")
        .eq("id", seededCustomerId)
        .single();
      expect(stillIntact?.company_name, "customer gốc phải còn nguyên, chưa bị sửa/xóa").toBe(
        `${SEED_PREFIX} Công ty gốc`
      );
    });

    test("customers: admin UPDATE/DELETE được", async () => {
      const admin = createAdminClient();
      const { data: disposable, error: seedError } = await admin
        .from("customers")
        .insert({ code: uniqueCode("CUST-ADM"), company_name: `${SEED_PREFIX} Admin disposable` })
        .select("id")
        .single();
      if (seedError || !disposable) {
        throw new Error(`Seed customer cho admin test thất bại: ${seedError?.message}`);
      }

      const adminClient = await getRoleClient(ADMIN_EMAIL);
      const { data: updated, error: updateError } = await adminClient
        .from("customers")
        .update({ company_name: "Đã sửa bởi admin" })
        .eq("id", disposable.id)
        .select();
      expect(updateError).toBeNull();
      expect(updated?.length, "admin phải sửa được customer").toBe(1);

      const { data: deleted, error: deleteError } = await adminClient
        .from("customers")
        .delete()
        .eq("id", disposable.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleted?.length, "admin phải xóa được customer").toBe(1);
    });

    test("equipment: inspector CREATE+UPDATE được, KHÔNG DELETE được", async () => {
      const inspectorClient = await getRoleClient(INSPECTOR_EMAIL);

      const { data: created, error: createError } = await inspectorClient
        .from("equipment")
        .insert({
          code: uniqueCode("EQ-INS"),
          customer_id: seededCustomerId,
          name: `${SEED_PREFIX} Inspector tạo TB`,
        })
        .select("id")
        .single();
      expect(createError, "inspector phải tạo equipment được").toBeNull();
      expect(created).not.toBeNull();
      if (!created) return;
      cleanupEquipmentIds.push(created.id);

      const { data: updated, error: updateError } = await inspectorClient
        .from("equipment")
        .update({ name: `${SEED_PREFIX} Inspector đã sửa TB` })
        .eq("id", created.id)
        .select();
      expect(updateError).toBeNull();
      expect(updated?.length, "inspector phải sửa được equipment").toBe(1);

      const { data: deleteResult, error: deleteError } = await inspectorClient
        .from("equipment")
        .delete()
        .eq("id", created.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleteResult, "inspector KHÔNG được xóa equipment").toEqual([]);
    });

    test("equipment: admin DELETE được", async () => {
      const admin = createAdminClient();
      const { data: disposable, error: seedError } = await admin
        .from("equipment")
        .insert({
          code: uniqueCode("EQ-ADM"),
          customer_id: seededCustomerId,
          name: `${SEED_PREFIX} Admin disposable TB`,
        })
        .select("id")
        .single();
      if (seedError || !disposable) {
        throw new Error(`Seed equipment cho admin test thất bại: ${seedError?.message}`);
      }

      const adminClient = await getRoleClient(ADMIN_EMAIL);
      const { data: deleted, error: deleteError } = await adminClient
        .from("equipment")
        .delete()
        .eq("id", disposable.id)
        .select();
      expect(deleteError).toBeNull();
      expect(deleted?.length, "admin phải xóa được equipment").toBe(1);
    });

    test("inspection_history: cả admin và inspector đều CREATE được", async () => {
      for (const email of [ADMIN_EMAIL, INSPECTOR_EMAIL]) {
        const client = await getRoleClient(email);
        const { data, error } = await client
          .from("inspection_history")
          .insert({
            equipment_id: seededEquipmentId,
            inspection_date: new Date().toISOString().slice(0, 10),
            result: "pass",
          })
          .select("id")
          .single();
        expect(error, `${email} phải tạo được inspection_history`).toBeNull();
        if (data) cleanupInspectionIds.push(data.id);
      }
    });

    test("profiles: SELECT mở cho mọi role đã đăng nhập (tech debt đã chấp nhận từ trước, xác nhận vẫn giữ nguyên)", async () => {
      const inspectorClient = await getRoleClient(INSPECTOR_EMAIL);
      const { data, error } = await inspectorClient.from("profiles").select("id, email, role").limit(5);
      expect(error).toBeNull();
      expect(data?.length ?? 0, "inspector phải đọc được danh sách profiles").toBeGreaterThan(0);
    });

    test("chưa đăng nhập (anon, không có JWT): mọi bảng nghiệp vụ trả về 0 dòng", async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const anonClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: customersData } = await anonClient.from("customers").select("id").limit(1);
      const { data: equipmentData } = await anonClient.from("equipment").select("id").limit(1);
      const { data: inspectionData } = await anonClient.from("inspection_history").select("id").limit(1);
      const { data: profilesData } = await anonClient.from("profiles").select("id").limit(1);

      expect(customersData, "anonymous không được đọc customers").toEqual([]);
      expect(equipmentData, "anonymous không được đọc equipment").toEqual([]);
      expect(inspectionData, "anonymous không được đọc inspection_history").toEqual([]);
      expect(profilesData, "anonymous không được đọc profiles").toEqual([]);
    });

    test.describe("Role chưa có tính năng (accountant/office) -- Phần C: phải an toàn mặc định, không có quyền ghi ở đâu cả", () => {
      let accountantUserId: string;
      let accountantEmail: string;

      test.beforeAll(async () => {
        const admin = createAdminClient();
        accountantEmail = `pw-perm-accountant-${Date.now()}@example.com`;
        const { data: userData, error: userError } = await admin.auth.admin.createUser({
          email: accountantEmail,
          email_confirm: true,
          user_metadata: { role: "accountant" },
        });
        if (userError || !userData?.user) {
          throw new Error(`Không tạo được user test accountant: ${userError?.message}`);
        }
        accountantUserId = userData.user.id;
      });

      test.afterAll(async () => {
        if (accountantUserId) {
          const admin = createAdminClient();
          // xóa auth.users cascade xóa luôn row profiles tương ứng (FK on
          // delete cascade, xem migration 0001).
          await admin.auth.admin.deleteUser(accountantUserId);
        }
      });

      test("accountant KHÔNG tạo/sửa/xóa được customers, equipment, inspection_history ở đâu cả", async () => {
        const accountantClient = await getRoleClient(accountantEmail);

        const { data: custInsert, error: custInsertError } = await accountantClient
          .from("customers")
          .insert({ code: uniqueCode("CUST-ACC"), company_name: "Accountant thử tạo" })
          .select();
        expect(custInsertError, "accountant tạo customer phải bị RLS chặn (báo lỗi)").not.toBeNull();
        expect(custInsert ?? []).toEqual([]);

        const { data: eqInsert, error: eqInsertError } = await accountantClient
          .from("equipment")
          .insert({ code: uniqueCode("EQ-ACC"), customer_id: seededCustomerId, name: "Accountant thử tạo TB" })
          .select();
        expect(eqInsertError, "accountant tạo equipment phải bị RLS chặn").not.toBeNull();
        expect(eqInsert ?? []).toEqual([]);

        const { data: eqUpdate, error: eqUpdateError } = await accountantClient
          .from("equipment")
          .update({ name: "Accountant thử sửa TB" })
          .eq("id", seededEquipmentId)
          .select();
        expect(eqUpdateError, "update không nên trả lỗi (RLS âm thầm chặn)").toBeNull();
        expect(eqUpdate, "accountant KHÔNG được sửa equipment").toEqual([]);

        const { data: inspInsert, error: inspInsertError } = await accountantClient
          .from("inspection_history")
          .insert({
            equipment_id: seededEquipmentId,
            inspection_date: new Date().toISOString().slice(0, 10),
            result: "pass",
          })
          .select();
        expect(inspInsertError, "accountant tạo inspection_history phải bị RLS chặn").not.toBeNull();
        expect(inspInsert ?? []).toEqual([]);

        // SELECT vẫn đọc được (mọi role đã đăng nhập đều SELECT mở, đúng
        // thiết kế hiện tại) -- xác nhận riêng để phân biệt "không có quyền
        // GHI" với "không đăng nhập được".
        const { data: custSelect, error: custSelectError } = await accountantClient
          .from("customers")
          .select("id")
          .limit(1);
        expect(custSelectError).toBeNull();
      });
    });
  });

  test.describe("Tầng UI -- nút/route hiển thị nhất quán với RLS ở trên", () => {
    test("customers: danh sách -- inspector KHÔNG thấy nút Sửa, admin thấy", async ({ page }) => {
      await loginAs(page, INSPECTOR_EMAIL);
      await page.goto("/customers");
      await expect(page.getByRole("button", { name: "Sửa" }).first()).toHaveCount(0);

      await loginAs(page, ADMIN_EMAIL);
      await page.goto("/customers");
      await expect(page.getByRole("button", { name: "Sửa" }).first()).toBeVisible();
    });

    test("customers: inspector truy cập trực tiếp URL /customers/[id]/edit -> bị đá về /unauthorized", async ({
      page,
    }) => {
      await loginAs(page, INSPECTOR_EMAIL);
      await page.goto(`/customers/${seededCustomerId}/edit`);
      await expect(page).toHaveURL(/\/unauthorized/);
      await expect(page.getByText("Bạn không có quyền truy cập trang này.")).toBeVisible();
    });

    test("customers: admin truy cập /customers/[id]/edit -> vào được, thấy form sửa", async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL);
      await page.goto(`/customers/${seededCustomerId}/edit`);
      await expect(page).toHaveURL(new RegExp(`/customers/${seededCustomerId}/edit`));
      await expect(page.getByRole("heading", { name: "Sửa khách hàng" })).toBeVisible();
    });

    test("equipment: chi tiết -- cả inspector và admin đều thấy nút Sửa (Update được phép cho cả 2)", async ({
      page,
    }) => {
      await loginAs(page, INSPECTOR_EMAIL);
      await page.goto(`/equipment/${seededEquipmentId}`);
      await expect(page.getByRole("link", { name: "Sửa" })).toBeVisible();

      await loginAs(page, ADMIN_EMAIL);
      await page.goto(`/equipment/${seededEquipmentId}`);
      await expect(page.getByRole("link", { name: "Sửa" })).toBeVisible();
    });

    test("equipment: inspector truy cập trực tiếp URL /equipment/[id]/edit -> vào được (Update được phép)", async ({
      page,
    }) => {
      await loginAs(page, INSPECTOR_EMAIL);
      await page.goto(`/equipment/${seededEquipmentId}/edit`);
      await expect(page).toHaveURL(new RegExp(`/equipment/${seededEquipmentId}/edit`));
      await expect(page.getByRole("heading", { name: "Sửa thiết bị" })).toBeVisible();
    });

    test("cả 2 role: vào được dashboard, tìm kiếm, xem chi tiết customer/equipment", async ({ page }) => {
      for (const email of [ADMIN_EMAIL, INSPECTOR_EMAIL]) {
        await loginAs(page, email);
        await expect(page).toHaveURL(/\/dashboard/);

        await page.goto(`/customers/${seededCustomerId}`);
        await expect(page.getByText(`${SEED_PREFIX} Công ty gốc`)).toBeVisible();

        await page.goto(`/equipment/${seededEquipmentId}`);
        await expect(page.getByText(`${SEED_PREFIX} Thiết bị gốc`, { exact: false })).toBeVisible();
      }
    });
  });
});
