// =============================================================================
// scripts/bulk-create-user-accounts.js
//
// Tạo hàng loạt tài khoản đăng nhập cho đồng nghiệp dùng thử — dùng Admin API
// của Supabase (auth.admin.createUser) thay vì giao diện "Add user" trên
// Dashboard, vì màn hình đó KHÔNG có ô "User metadata" nên role/full_name
// không được set tự động (đã gặp thật với tài khoản thaitan@incert.vn).
//
// Dùng service-role key (KHÔNG dùng anon key) — script này chạy 1 LẦN trên
// máy Hải qua Claude Code Desktop, giống pattern bulk-upload-calibration-
// certs.js (PROMPT-45). KHÔNG commit .env chứa key vào git.
//
// Cách chạy:
//   node --env-file=.env.local scripts/bulk-create-user-accounts.js
// (đổi tên file .env cho đúng file đang chứa SUPABASE_SERVICE_ROLE_KEY thật)
//
// Cần thêm biến BULK_ACCOUNT_PASSWORD vào .env.local trước khi chạy (mật
// khẩu dùng chung ban đầu cho các tài khoản mới tạo) -- KHÔNG hardcode mật
// khẩu thật ngay trong file này, vì file này được commit vào git (repo có
// remote GitHub) nên bất kỳ chuỗi nào viết thẳng ở đây sẽ nằm vĩnh viễn
// trong lịch sử git kể cả sau này đổi mật khẩu. .env.local đã có sẵn trong
// .gitignore, không bao giờ lên git.
//
// An toàn khi chạy lại nhiều lần: nếu email đã tồn tại, script sẽ KHÔNG tạo
// trùng — thay vào đó tự sửa lại full_name/role/phone trong bảng `profiles`
// cho khớp danh sách bên dưới (xử lý đúng trường hợp thaitan@incert.vn đã lỡ
// tạo tay thiếu metadata).
//
// LƯU Ý QUAN TRỌNG: tài khoản admin gốc caotronghai.inc@gmail.com (Cao Trọng
// Hải, tạo từ PROMPT-03) CỐ TÌNH KHÔNG có trong danh sách ACCOUNTS bên dưới —
// dù trong bảng chức vụ nội bộ ghi "Kiểm định viên", đây chỉ là chức vụ công
// việc, KHÔNG phải quyền hệ thống. Không đụng tài khoản đó qua script này để
// tránh hạ nhầm quyền admin duy nhất đang dùng.
//
// Cột SĐT/CCCD/Ngày sinh trong danh sách nhân viên gốc: bảng `profiles` đã có
// sẵn cột `phone` (từ migration 0001) nên script có ghi lại SĐT; KHÔNG có cột
// lưu CCCD/Ngày sinh trong DB hiện tại (ngoài phạm vi script này — nếu cần
// lưu thì phải làm PROMPT riêng thêm cột + UI).
// =============================================================================

const { createClient } = require("@supabase/supabase-js");

// ---------------------------------------------------------------------------
// Danh sách đồng nghiệp thật do Hải cung cấp (23/08/2026). Mật khẩu ban đầu
// đọc từ biến môi trường BULK_ACCOUNT_PASSWORD (xem ghi chú đầu file) --
// khuyến nghị từng người tự đổi mật khẩu sau lần đăng nhập đầu tiên (hệ
// thống hiện chưa ép buộc đổi mật khẩu lần đầu — backlog).
// role hợp lệ: "admin" | "inspector" | "accountant" | "office"
// ---------------------------------------------------------------------------
const ACCOUNTS = [
  { email: "thaitan@incert.vn", full_name: "Thái Tân", role: "inspector", phone: "0936565579" },
  { email: "thaianh@incert.vn", full_name: "Thái Văn Anh", role: "inspector", phone: "0905888639" },
  { email: "duongminhtuan@incert.vn", full_name: "Dương Minh Tuấn", role: "inspector", phone: "0905645601" },
  { email: "vohongtrung@incert.vn", full_name: "Võ Hồng Trung", role: "inspector", phone: "0987349647" },
  { email: "hohongsy@incert.vn", full_name: "Hồ Hồng Sỹ", role: "inspector", phone: "0949288123" },
  { email: "nguyenthanhnguyen@incert.vn", full_name: "Nguyễn Thanh Nguyên", role: "inspector", phone: null },
  { email: "nguyennhutuan@incert.vn", full_name: "Nguyễn Như Tuấn", role: "inspector", phone: "0905158658" },
  { email: "nguyenthuhuong@incert.vn", full_name: "Nguyễn Thị Thu Hương", role: "accountant", phone: null },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.BULK_ACCOUNT_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env đang dùng."
  );
  process.exit(1);
}

if (!DEFAULT_PASSWORD) {
  console.error(
    "Thiếu BULK_ACCOUNT_PASSWORD trong file .env đang dùng -- thêm dòng BULK_ACCOUNT_PASSWORD=<mật khẩu ban đầu> vào .env.local rồi chạy lại."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VALID_ROLES = ["admin", "inspector", "accountant", "office"];

async function findExistingUserByEmail(email) {
  // Admin API không có "getUserByEmail" trực tiếp -- liệt kê theo trang và
  // lọc thủ công (danh sách 8 người + vài user cũ, không cần tối ưu).
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  for (const acc of ACCOUNTS) {
    if (!VALID_ROLES.includes(acc.role)) {
      console.error(`⚠️  Bỏ qua ${acc.email}: role "${acc.role}" không hợp lệ.`);
      continue;
    }

    const existing = await findExistingUserByEmail(acc.email);

    if (existing) {
      // Đã có tài khoản đăng nhập (vd tạo tay thiếu metadata) -- chỉ cần
      // sửa lại đúng profiles, không tạo trùng user.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: acc.full_name, role: acc.role, phone: acc.phone ?? null })
        .eq("id", existing.id);

      if (updateError) {
        console.error(`❌ ${acc.email}: đã có tài khoản nhưng sửa profiles lỗi -`, updateError.message);
      } else {
        console.log(`✅ ${acc.email}: đã có tài khoản từ trước -- đã sửa lại full_name/role/phone đúng.`);
      }
      continue;
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // tương đương tick "Auto Confirm User"
      user_metadata: { full_name: acc.full_name, role: acc.role },
    });

    if (createError) {
      console.error(`❌ ${acc.email}: tạo tài khoản lỗi -`, createError.message);
      continue;
    }

    // Trigger handle_new_user() (migration 0002) chỉ đọc full_name/role từ
    // user_metadata -- KHÔNG đọc phone -- nên set thêm phone bằng 1 update
    // riêng ngay sau khi tạo, nếu có số.
    if (acc.phone) {
      const { error: phoneError } = await supabase
        .from("profiles")
        .update({ phone: acc.phone })
        .eq("id", created.user.id);
      if (phoneError) {
        console.error(`⚠️  ${acc.email}: tạo tài khoản OK nhưng lưu SĐT lỗi -`, phoneError.message);
      }
    }

    console.log(`✅ ${acc.email}: đã tạo tài khoản mới, role=${acc.role}, full_name="${acc.full_name}".`);
  }

  console.log("\nXong. Kiểm tra lại nhanh trong app, mục Nhân viên, xem đủ tên/vai trò/SĐT.");
}

main().catch((err) => {
  console.error("Lỗi không mong muốn:", err);
  process.exit(1);
});
