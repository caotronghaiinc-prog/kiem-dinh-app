// =========================================================================
// PROMPT-17: Dọn dữ liệu cũ + nạp dữ liệu mẫu để onboard 7-9 đồng nghiệp.
//
// ⚠️ CHẠY BẰNG SERVICE ROLE KEY (bỏ qua RLS hoàn toàn) -- XÓA DỮ LIỆU
// PRODUCTION KHÔNG THỂ HOÀN TÁC. Đã được anh Hải xác nhận qua AskUserQuestion
// tại thời điểm chạy (không dựa vào đồng ý ở buổi phỏng vấn trước) + đã có
// backup GitHub Actions mới (workflow_dispatch thủ công) trước khi chạy.
//
// PHẠM VI XÓA (đúng thứ tự con->cha, không dựa vào cascade ngầm để log rõ
// số dòng từng bảng): contract_payments, inspection_checklist_results,
// inspection_photos, inspection_edit_requests, inspection_history,
// contract_equipment, contracts, equipment.
//
// KHÔNG đụng: customers, quotes/quote_items, inspection_tools/
// inspection_tool_calibrations/inspection_tool_loans, profiles/
// inspector_certificates, audit_log.
//
// Sau khi xóa, nạp dữ liệu DEMO (khách hàng tiền tố "DEMO - ", thiết bị rải
// đều loại có/không checklist template, 2 hợp đồng gắn thiết bị, 1 báo giá)
// -- KHÔNG seed inspection_history (để nguyên "chưa từng kiểm định", đây là
// tính năng cốt lõi cần đồng nghiệp tự trải nghiệm) và KHÔNG seed
// inspector_certificates (cần profile_id thật của tài khoản đồng nghiệp,
// Hải tự thêm sau khi tạo tài khoản, xem tài liệu hướng dẫn sử dụng riêng).
//
// CÁCH CHẠY (từ gốc repo, Node >= 20.6 hỗ trợ --env-file sẵn):
//   node --env-file=.env.local scripts/reset-and-seed-demo-data.js
// =========================================================================

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY -- chạy với --env-file=.env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function countRows(table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`Đếm ${table} lỗi: ${JSON.stringify(error)}`);
  return count ?? 0;
}

const DELETE_TABLES_IN_ORDER = [
  "contract_payments",
  "inspection_checklist_results",
  "inspection_photos",
  "inspection_edit_requests",
  "inspection_history",
  "contract_equipment",
  "contracts",
  "equipment",
];

// PostgREST từ chối DELETE không có filter (an toàn mặc định) -- dùng
// .not("id","is",null) để khớp MỌI dòng (id là khóa chính, không bao giờ
// null) thay vì phải liệt kê từng id.
async function deleteAllRows(table) {
  const before = await countRows(table);
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) throw new Error(`Xóa ${table} lỗi: ${JSON.stringify(error)}`);
  const after = await countRows(table);
  console.log(`  ${table}: trước=${before}, đã xóa=${count ?? 0}, còn lại=${after}`);
  if (after !== 0) {
    throw new Error(`${table} còn ${after} dòng sau khi xóa -- DỪNG LẠI, kiểm tra thủ công.`);
  }
}

async function runDeletePhase() {
  console.log("=== PHASE 1: XÓA DỮ LIỆU CŨ (contracts/equipment + 4 bảng con) ===");
  for (const table of DELETE_TABLES_IN_ORDER) {
    await deleteAllRows(table);
  }
  console.log("Xong Phase 1.\n");
}

const DEMO_CUSTOMERS = [
  {
    company_name: "DEMO - Công ty TNHH Cơ khí Sao Việt",
    address: "123 Nguyễn Văn Linh, Quận Thanh Khê, TP. Đà Nẵng",
    tax_code: "0401234567",
    contact_name: "Nguyễn Văn Minh",
    phone: "0905111222",
    email: "saoviet.demo@example.com",
    type: "company",
    status: "active",
  },
  {
    company_name: "DEMO - Công ty CP Xây dựng Đông Á",
    address: "45 Điện Biên Phủ, Quận Hải Châu, TP. Đà Nẵng",
    tax_code: "0402345678",
    contact_name: "Trần Thị Hương",
    phone: "0905222333",
    email: "donga.demo@example.com",
    type: "company",
    status: "active",
  },
  {
    company_name: "DEMO - Nhà máy Thép Miền Trung",
    address: "Khu công nghiệp Hòa Khánh, Quận Liên Chiểu, TP. Đà Nẵng",
    tax_code: "0403456789",
    contact_name: "Lê Hoàng Nam",
    phone: "0905333444",
    email: "thepmientrung.demo@example.com",
    type: "company",
    status: "active",
  },
];

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 6 thiết bị: 2 "Thiết bị nâng - Cầu trục" + 1 "Thiết bị nâng - Palăng" (có
// checklist template), 1 "Nồi hơi" (có checklist template riêng, PROMPT-38/
// 39), 2 loại KHÔNG có checklist template ("Thang máy, thang cuốn", "Hệ
// thống ống áp lực") -- rải đều 3 khách hàng DEMO. expiry_date trải đều 3
// màu đỏ/vàng/xanh (getExpiryStatus) để demo widget dashboard đầy đủ.
function buildEquipmentPayload(customerIdByName) {
  const c1 = customerIdByName["DEMO - Công ty TNHH Cơ khí Sao Việt"];
  const c2 = customerIdByName["DEMO - Công ty CP Xây dựng Đông Á"];
  const c3 = customerIdByName["DEMO - Nhà máy Thép Miền Trung"];

  return [
    {
      customer_id: c1,
      name: "Cầu trục 10 tấn DEMO",
      type: "Thiết bị nâng - Cầu trục",
      manufacturer: "Việt Nam",
      manufacture_year: 2022,
      serial_number: "DEMO-CT-001",
      location: "Xưởng sản xuất số 1",
      expiry_date: daysFromNow(20), // đỏ
      inspection_cycle: 12,
      status: "valid",
      spec_values: {
        ma_hieu: "QC-10T",
        trong_tai: "10",
        van_toc_nang_ha: "8",
        khau_do: "22",
        do_cao_nang_moc: "12",
        cong_dung: "Nâng hạ vật tư trong xưởng",
      },
    },
    {
      customer_id: c2,
      name: "Cầu trục 5 tấn DEMO",
      type: "Thiết bị nâng - Cầu trục",
      manufacturer: "Nhật Bản",
      manufacture_year: 2020,
      serial_number: "DEMO-CT-002",
      location: "Công trình Đông Á, tầng hầm B1",
      expiry_date: daysFromNow(45), // vàng
      inspection_cycle: 12,
      status: "valid",
      spec_values: {
        ma_hieu: "QC-05T",
        trong_tai: "5",
        van_toc_nang_ha: "6",
        khau_do: "18",
        do_cao_nang_moc: "9",
        cong_dung: "Nâng hạ vật liệu xây dựng",
      },
    },
    {
      customer_id: c3,
      name: "Nồi hơi công nghiệp DEMO",
      type: "Nồi hơi",
      manufacturer: "Hàn Quốc",
      manufacture_year: 2019,
      serial_number: "DEMO-NH-001",
      location: "Nhà máy Thép Miền Trung, khu lò hơi",
      expiry_date: daysFromNow(200), // xanh
      inspection_cycle: 12,
      status: "valid",
      spec_values: {
        loai_ma_hieu: "WNS-2000",
        cong_suat: "2",
        nhien_lieu_su_dung: "Dầu FO",
        ap_suat_thiet_ke: "10",
        ap_suat_lam_viec_lon_nhat: "8",
        cong_dung: "Cấp hơi cho dây chuyền sản xuất thép",
      },
    },
    {
      customer_id: c1,
      name: "Thang máy tải khách DEMO",
      type: "Thang máy, thang cuốn",
      manufacturer: "Mitsubishi",
      manufacture_year: 2021,
      serial_number: "DEMO-TM-001",
      location: "Tòa nhà văn phòng Sao Việt",
      expiry_date: daysFromNow(40), // vàng
      inspection_cycle: 12,
      status: "valid",
      spec_values: {},
    },
    {
      customer_id: c2,
      name: "Hệ thống ống dẫn hơi áp lực DEMO",
      type: "Hệ thống ống áp lực",
      manufacturer: "Việt Nam",
      manufacture_year: 2018,
      serial_number: "DEMO-HT-001",
      location: "Công trình Đông Á, khu kỹ thuật",
      expiry_date: daysFromNow(300), // xanh
      inspection_cycle: 12,
      status: "valid",
      spec_values: {},
    },
    {
      customer_id: c3,
      name: "Palăng điện 3 tấn DEMO",
      type: "Thiết bị nâng - Palăng",
      manufacturer: "Trung Quốc",
      manufacture_year: 2023,
      serial_number: "DEMO-PL-001",
      location: "Nhà máy Thép Miền Trung, khu kho",
      expiry_date: daysFromNow(15), // đỏ
      inspection_cycle: 12,
      status: "valid",
      spec_values: {
        ma_hieu: "CD1-3T",
        trong_tai: "3",
        van_toc_nang_ha: "8",
        chieu_dai_duong_chay: "15",
        do_cao_nang_moc: "6",
        cong_dung: "Nâng hạ hàng hóa trong kho",
      },
    },
  ];
}

async function runSeedPhase() {
  console.log("=== PHASE 2: NẠP DỮ LIỆU DEMO ===");

  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .insert(DEMO_CUSTOMERS)
    .select("id, code, company_name");
  if (custErr) throw new Error(`Tạo khách hàng DEMO lỗi: ${JSON.stringify(custErr)}`);
  console.log("Khách hàng DEMO đã tạo:");
  customers.forEach((c) => console.log(`  ${c.code} - ${c.company_name}`));

  const customerIdByName = Object.fromEntries(customers.map((c) => [c.company_name, c.id]));

  const { data: equipmentRows, error: eqErr } = await supabase
    .from("equipment")
    .insert(buildEquipmentPayload(customerIdByName))
    .select("id, code, name, type");
  if (eqErr) throw new Error(`Tạo thiết bị DEMO lỗi: ${JSON.stringify(eqErr)}`);
  console.log("\nThiết bị DEMO đã tạo:");
  equipmentRows.forEach((e) => console.log(`  ${e.code} - ${e.name} (${e.type})`));

  const equipmentIdByCode = Object.fromEntries(equipmentRows.map((e) => [e.code, e.id]));
  // Thứ tự insert ở buildEquipmentPayload() cố định -- map lại theo tên để
  // không phụ thuộc code tự sinh (KH-.../TB-... đổi theo dữ liệu đã có).
  const equipmentIdByName = Object.fromEntries(equipmentRows.map((e) => [e.name, e.id]));

  // 2 hợp đồng DEMO -- unit_price là giá CHƯA VAT (quy ước PROMPT-62).
  const { data: contract1, error: c1Err } = await supabase
    .from("contracts")
    .insert({
      customer_id: customerIdByName["DEMO - Công ty TNHH Cơ khí Sao Việt"],
      contract_no: "DEMO-01/2026/HĐKT-INCERT",
      title: "Hợp đồng kiểm định thiết bị DEMO - Sao Việt",
      signed_date: daysFromNow(-5),
      status: "dang_thuc_hien",
      note: "Hợp đồng dữ liệu mẫu, dùng để demo cho đồng nghiệp -- không phải hợp đồng thật.",
    })
    .select("id, code, contract_no")
    .single();
  if (c1Err) throw new Error(`Tạo hợp đồng DEMO 1 lỗi: ${JSON.stringify(c1Err)}`);

  const { error: ce1Err } = await supabase.from("contract_equipment").insert([
    {
      contract_id: contract1.id,
      equipment_id: equipmentIdByName["Cầu trục 10 tấn DEMO"],
      quantity: 1,
      unit_price: 5000000,
      unit: "Cái",
    },
    {
      contract_id: contract1.id,
      equipment_id: equipmentIdByName["Thang máy tải khách DEMO"],
      quantity: 1,
      unit_price: 8000000,
      unit: "Cái",
    },
  ]);
  if (ce1Err) throw new Error(`Gắn thiết bị hợp đồng DEMO 1 lỗi: ${JSON.stringify(ce1Err)}`);

  const { data: contract2, error: c2Err } = await supabase
    .from("contracts")
    .insert({
      customer_id: customerIdByName["DEMO - Công ty CP Xây dựng Đông Á"],
      contract_no: "DEMO-02/2026/HĐKT-INCERT",
      title: "Hợp đồng kiểm định thiết bị DEMO - Đông Á",
      signed_date: daysFromNow(-2),
      status: "dang_thuc_hien",
      note: "Hợp đồng dữ liệu mẫu, dùng để demo cho đồng nghiệp -- không phải hợp đồng thật.",
    })
    .select("id, code, contract_no")
    .single();
  if (c2Err) throw new Error(`Tạo hợp đồng DEMO 2 lỗi: ${JSON.stringify(c2Err)}`);

  const { error: ce2Err } = await supabase.from("contract_equipment").insert([
    {
      contract_id: contract2.id,
      equipment_id: equipmentIdByName["Cầu trục 5 tấn DEMO"],
      quantity: 1,
      unit_price: 6000000,
      unit: "Cái",
    },
    {
      contract_id: contract2.id,
      equipment_id: equipmentIdByName["Hệ thống ống dẫn hơi áp lực DEMO"],
      quantity: 1,
      unit_price: 4500000,
      unit: "Hệ thống",
    },
  ]);
  if (ce2Err) throw new Error(`Gắn thiết bị hợp đồng DEMO 2 lỗi: ${JSON.stringify(ce2Err)}`);

  console.log("\nHợp đồng DEMO đã tạo:");
  console.log(`  ${contract1.code} - ${contract1.contract_no}`);
  console.log(`  ${contract2.code} - ${contract2.contract_no}`);

  // 1 báo giá DEMO (tùy chọn, mục B4) -- 2 hạng mục, 1 gắn thiết bị đã có.
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .insert({
      customer_id: customerIdByName["DEMO - Nhà máy Thép Miền Trung"],
      customer_name_snapshot: "DEMO - Nhà máy Thép Miền Trung",
      customer_address_snapshot: "Khu công nghiệp Hòa Khánh, Quận Liên Chiểu, TP. Đà Nẵng",
      customer_contact_snapshot: "Lê Hoàng Nam",
      customer_phone_snapshot: "0905333444",
      title: "Báo giá kiểm định thiết bị DEMO - Thép Miền Trung",
      status: "nhap",
      note: "Báo giá dữ liệu mẫu, dùng để demo cho đồng nghiệp -- không phải báo giá thật.",
    })
    .select("id, code")
    .single();
  if (qErr) throw new Error(`Tạo báo giá DEMO lỗi: ${JSON.stringify(qErr)}`);

  const { error: qiErr } = await supabase.from("quote_items").insert([
    {
      quote_id: quote.id,
      equipment_id: equipmentIdByName["Palăng điện 3 tấn DEMO"],
      item_name: "Kiểm định Palăng điện 3 tấn",
      unit: "Cái",
      quantity: 1,
      unit_price: 3500000,
      order_index: 0,
    },
    {
      quote_id: quote.id,
      equipment_id: null,
      item_name: "Kiểm định hệ thống điện phụ trợ",
      unit: "Hệ thống",
      quantity: 1,
      unit_price: 2000000,
      order_index: 1,
    },
  ]);
  if (qiErr) throw new Error(`Tạo hạng mục báo giá DEMO lỗi: ${JSON.stringify(qiErr)}`);

  console.log(`\nBáo giá DEMO đã tạo: ${quote.code}`);
  console.log("\nXong Phase 2.");
}

(async () => {
  try {
    await runDeletePhase();
    await runSeedPhase();
    console.log("\n=== HOÀN TẤT ===");
  } catch (err) {
    console.error("\n!!! LỖI, DỪNG LẠI:", err.message ?? err);
    process.exit(1);
  }
})();
