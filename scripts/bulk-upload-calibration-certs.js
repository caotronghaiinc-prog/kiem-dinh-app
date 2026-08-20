// =========================================================================
// PROMPT-45 (bổ sung): Bulk-upload 33 giấy chứng nhận hiệu chuẩn (PDF scan)
// lên bucket Storage "inspection-files" + insert vào bảng
// inspection_tool_calibrations, theo mapping đã được anh Hải xác nhận qua
// chat (xem mapping-chung-nhan-hieu-chuan.md).
//
// ⚠️ CHẠY BẰNG SERVICE ROLE KEY (bỏ qua RLS hoàn toàn) -- CHỈ chạy script
// này 1 lần trên máy của anh Hải (hoặc qua Claude Code Desktop), KHÔNG
// chạy trên môi trường production/CI, KHÔNG commit .env.local.
//
// ĐIỀU KIỆN TRƯỚC KHI CHẠY:
//   1. Đã chạy migration 0025_inspection_tool_calibrations.sql (tạo bảng
//      inspection_tool_calibrations + trigger đồng bộ).
//   2. Đã chạy migration 0026_seed_3_dung_cu_ndt_be_tong.sql (thêm DC-049,
//      DC-050, DC-051 -- 3 dụng cụ mới phát hiện qua giấy chứng nhận).
//   3. Folder giay-chung-nhan-hieu-chuan/ (34 file PDF) nằm ở gốc repo,
//      CÙNG CẤP với package.json (đã copy sẵn theo hướng dẫn trước đó).
//
// CÁCH CHẠY (từ gốc repo, Node >= 20.6 hỗ trợ --env-file sẵn, không cần
// cài thêm dotenv):
//   node --env-file=.env.local scripts/bulk-upload-calibration-certs.js
//
// Script IDEMPOTENT theo cert_no: nếu cert_no đã tồn tại trong
// inspection_tool_calibrations cho đúng tool_id đó, sẽ BỎ QUA (không tạo
// trùng) -- an toàn khi lỡ chạy lại.
// =========================================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const REPO_ROOT = path.resolve(__dirname, "..");
const CERTS_DIR = path.join(REPO_ROOT, "giay-chung-nhan-hieu-chuan");
const BUCKET = "inspection-files";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY -- chạy lại với: node --env-file=.env.local scripts/bulk-upload-calibration-certs.js"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SO_KHCN_DN = "Sở KH&CN TP Đà Nẵng - Trung tâm Ứng dụng KHCN và TĐĐLCL";
const QUATEST_2 = "QUATEST 2 - Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 2";
const DAKCOM = "Công ty TNHH TM và Kiểm định DakCom";
const MIEN_TRUNG = "Công ty CP Dịch vụ Kiểm định Hiệu chuẩn Đo lường Miền Trung";
const SMETEST = "SMETEST - Trung tâm Kiểm định Hiệu chuẩn Đo lường Miền Nam";
const HANA_NDT = "HANA NDT Laboratory";

// Mapping đã xác nhận qua chat với anh Hải (mục A/B/C/D trong
// mapping-chung-nhan-hieu-chuan.md). "Can treo dien tu 2.pdf" KHÔNG có
// trong danh sách này -- là bản scan trùng lặp 100% với file 1, chủ đích
// bỏ qua.
const ENTRIES = [
  { file: "Ap ke 1.pdf", code: "DC-013", cert_no: "1136.26.AS/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Ap ke 2.pdf", code: "DC-014", cert_no: "1137.26.AS/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Ap ke 3.pdf", code: "DC-015", cert_no: "1138.26.AS/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Ap ke 4.pdf", code: "DC-016", cert_no: "1139.26.AS/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Ap ke 5.pdf", code: "DC-017", cert_no: "1140.26.AS/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Can treo dien tu 1.pdf", code: "DC-006", cert_no: "23.26.CTĐT/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN, note: "Danh mục gốc ghi số/mã QL 210802, giấy chứng nhận ghi 210902 -- lệch 1 chữ số, đã xác nhận cùng 1 thiết bị (anh Hải xác nhận qua chat)." },
  { file: "Dong ho van nang 1.pdf", code: "DC-029", cert_no: "337.26.K/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN, note: "Danh mục gốc ghi tên 'Ampe kìm', giấy chứng nhận ghi 'Đồng hồ vạn năng' -- serial 170913114 khớp 100%, chỉ lệch tên gọi." },
  { file: "Dong ho van nang 2.pdf", code: "DC-007", cert_no: "336.26.K/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Dong ho van nang 3.pdf", code: "DC-038", cert_no: "134.26.ĐT/HC", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "Dong ho van nang 4.pdf", code: "DC-039", cert_no: "135.26.ĐT/HC", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "Gong tu.pdf", code: "DC-002", cert_no: "020C262301", issued_date: "2026-05-18", due_date: "2027-05-18", issuer: HANA_NDT },
  { file: "May do dien tro cach dien 1.pdf", code: "DC-010", cert_no: "113.26.ĐT/KĐ", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "May do dien tro cach dien 2.pdf", code: "DC-036", cert_no: "133.26.ĐT/KĐ", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "May do dien tro dat 1.pdf", code: "DC-008", cert_no: "112.26.ĐT/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "May do dien tro dat 2.pdf", code: "DC-037", cert_no: "132.26.ĐT/HC", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "May do khoang cach 1.pdf", code: "DC-004", cert_no: "334.26.PTK/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "May do khoang cach 2.pdf", code: "DC-031", cert_no: "335.26.PTK/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "May do khuyet tat bang sieu am.pdf", code: "DC-001", cert_no: "ATI7718.26.001", issued_date: "2026-07-27", due_date: "2027-09-30", issuer: SMETEST, note: "Giấy chỉ ghi hạn '09/2027' (không có ngày cụ thể) -- dùng 30/09/2027." },
  { file: "May do toc do vong quay.pdf", code: "DC-033", cert_no: "392.26.PTK/HC", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "May kinh vi dien tu.pdf", code: "DC-003", cert_no: "DK.KV.001.0031.26", issued_date: "2026-07-18", due_date: "2027-07-18", issuer: DAKCOM },
  { file: "May sieu am be tong.pdf", code: "DC-049", cert_no: "3593E.26/ĐLMT", issued_date: "2026-07-22", due_date: "2027-07-21", issuer: MIEN_TRUNG },
  { file: "May sieu am dinh vi cot thep.pdf", code: "DC-050", cert_no: "3594E.26/ĐLMT", issued_date: "2026-07-22", due_date: "2027-07-21", issuer: MIEN_TRUNG },
  { file: "May thuy binh tu dong.pdf", code: "DC-046", cert_no: "DK.TB.001.0211.26", issued_date: "2026-07-25", due_date: "2027-07-25", issuer: DAKCOM },
  { file: "Nhiet ke buc xa cong nghiep.pdf", code: "DC-040", cert_no: "2760-HC/KT2-K6/N", issued_date: "2026-07-29", due_date: "2027-07-29", issuer: QUATEST_2, note: "Danh mục gốc ghi serial VN85993, giấy chứng nhận ghi 60102249WS -- model + hạn hiệu lực khớp chính xác, có thể danh mục gốc dùng mã tài sản nội bộ." },
  { file: "Phuong tien do do on.pdf", code: "DC-035", cert_no: "2761-KĐ/KT2-K6/H", issued_date: "2026-07-30", due_date: "2027-07-30", issuer: QUATEST_2 },
  { file: "Phuong tien do do roi.pdf", code: "DC-034", cert_no: "2762-KĐ/KT2-K6/H", issued_date: "2026-07-30", due_date: "2027-07-30", issuer: QUATEST_2, note: "Danh mục gốc ghi serial 0192-5354, giấy chứng nhận ghi 83667920/1125 -- model + hạn hiệu lực khớp chính xác, có thể danh mục gốc dùng mã tài sản nội bộ." },
  { file: "TB do do day kim loai 1.pdf", code: "DC-012", cert_no: "338.26.PTK/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "TB do do day kim loai 2.pdf", code: "DC-043", cert_no: "391.26.PTK/HC", issued_date: "2026-07-27", due_date: "2027-07-27", issuer: SO_KHCN_DN },
  { file: "Thiet bi do cuong do be tong.pdf", code: "DC-051", cert_no: "3592E.26/ĐLMT", issued_date: "2026-07-22", due_date: "2027-07-21", issuer: MIEN_TRUNG },
  { file: "Thuoc cuon 1.pdf", code: "DC-032", cert_no: "50.26.T/KĐ", issued_date: "2026-07-16", due_date: null, issuer: SO_KHCN_DN, note: "Giấy chứng nhận không ghi hạn hiệu lực (thước cuộn, kiểm định Ban đầu)." },
  { file: "Thuoc cuon 2.pdf", code: "DC-005", cert_no: "49.26.T/KĐ", issued_date: "2026-07-16", due_date: null, issuer: SO_KHCN_DN, note: "Giấy chứng nhận không ghi hạn hiệu lực (thước cuộn, kiểm định Ban đầu)." },
  { file: "Thuoc kep 1.pdf", code: "DC-009", cert_no: "48.26.T/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
  { file: "Thuoc kep 2.pdf", code: "DC-030", cert_no: "47.26.T/HC", issued_date: "2026-07-16", due_date: "2027-07-16", issuer: SO_KHCN_DN },
];

async function main() {
  console.log(`Tổng cộng ${ENTRIES.length} bản ghi cần xử lý.\n`);

  // 1. Lấy id của tất cả tool code liên quan trong 1 lần query.
  const codes = [...new Set(ENTRIES.map((e) => e.code))];
  const { data: tools, error: toolsErr } = await supabase
    .from("inspection_tools")
    .select("id, code")
    .in("code", codes);

  if (toolsErr) {
    console.error("Không đọc được inspection_tools:", toolsErr.message);
    process.exit(1);
  }

  const idByCode = new Map(tools.map((t) => [t.code, t.id]));
  const missingCodes = codes.filter((c) => !idByCode.has(c));
  if (missingCodes.length > 0) {
    console.error(
      "Các mã dụng cụ sau KHÔNG tồn tại trong inspection_tools -- kiểm tra đã chạy migration 0024/0026 chưa:",
      missingCodes.join(", ")
    );
    process.exit(1);
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of ENTRIES) {
    const toolId = idByCode.get(entry.code);
    const filePath = path.join(CERTS_DIR, entry.file);

    if (!fs.existsSync(filePath)) {
      console.error(`[BỎ QUA] Không tìm thấy file: ${entry.file}`);
      failed++;
      continue;
    }

    // Idempotent: đã có bản ghi cùng tool_id + cert_no thì bỏ qua.
    const { data: existing, error: existErr } = await supabase
      .from("inspection_tool_calibrations")
      .select("id")
      .eq("tool_id", toolId)
      .eq("cert_no", entry.cert_no)
      .maybeSingle();

    if (existErr) {
      console.error(`[LỖI] ${entry.file}: kiểm tra trùng thất bại -- ${existErr.message}`);
      failed++;
      continue;
    }
    if (existing) {
      console.log(`[BỎ QUA - đã có] ${entry.file} (${entry.code}, cert ${entry.cert_no})`);
      skipped++;
      continue;
    }

    // Upload file lên Storage.
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `tool-certs/${toolId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, { contentType: "application/pdf" });

    if (uploadErr) {
      console.error(`[LỖI UPLOAD] ${entry.file}: ${uploadErr.message}`);
      failed++;
      continue;
    }

    // Insert bản ghi hiệu chuẩn -- trigger sync_tool_after_calibration()
    // (migration 0025) tự đồng bộ inspection_tools.calibration_due_date.
    const { error: insertErr } = await supabase.from("inspection_tool_calibrations").insert({
      tool_id: toolId,
      cert_no: entry.cert_no,
      issued_date: entry.issued_date,
      due_date: entry.due_date,
      issuer: entry.issuer,
      file_path: storagePath,
      note: entry.note || null,
    });

    if (insertErr) {
      console.error(`[LỖI INSERT] ${entry.file}: ${insertErr.message}`);
      // Dọn lại file vừa upload để không rác trong bucket.
      await supabase.storage.from(BUCKET).remove([storagePath]);
      failed++;
      continue;
    }

    console.log(`[OK] ${entry.file} -> ${entry.code} (cert ${entry.cert_no}, hạn ${entry.due_date || "không ghi"})`);
    ok++;
  }

  console.log(`\nHoàn tất: ${ok} thành công, ${skipped} bỏ qua (đã có), ${failed} lỗi.`);
  if (failed > 0) process.exit(1);
}

main();
