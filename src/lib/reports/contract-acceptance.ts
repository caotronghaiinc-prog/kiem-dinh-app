import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { numberToVietnameseWords } from "@/lib/utils/number-to-words-vi";
import type { ContractDetail, ContractEquipmentRow } from "@/app/(dashboard)/contracts/types";

// PROMPT-61: Biên bản nghiệm thu -- văn bản pháp lý thật (căn cứ thanh
// toán), bố cục 16 mục đã chốt qua thực tế với anh Hải qua skill Cowork
// skil-bb-nt, PHẢI port nguyên văn, không tự ý diễn giải lại. KHÁC mức chi
// tiết đơn giản của contract-equipment-list.ts (PROMPT-59)/quote-export.ts
// (PROMPT-60) -- văn bản này dùng khổ A4/dxa/Times New Roman đúng chuẩn để
// khớp visual với văn bản giấy đã ký nhiều lần.
const FONT = "Times New Roman";
const BODY_SIZE = 26; // 13pt
const TITLE_SIZE = 36; // 18pt (+5pt so với thân bài, trong khoảng 4-6pt yêu cầu)
const LINE_SPACING = 276;

// Khổ A4 = 11907 x 16840 dxa, margin trái 1701 / phải 1134 / trên-dưới 1134
// -> chiều rộng nội dung khả dụng = 11907 - 1701 - 1134 = 9072 dxa. MỌI
// bảng trong văn bản phải có columnWidths cộng lại <= 9072 (lỗi tràn lề đã
// từng xảy ra thật trong skill gốc nếu sai chỗ này).
const PAGE_WIDTH_DXA = 11907;
const PAGE_HEIGHT_DXA = 16840;
const MARGIN_LEFT_DXA = 1701;
const MARGIN_RIGHT_DXA = 1134;
const MARGIN_TOP_BOTTOM_DXA = 1134;
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_LEFT_DXA - MARGIN_RIGHT_DXA; // 9072

const BEN_B_NAME =
  "CÔNG TY CỔ PHẦN KIỂM ĐỊNH KỸ THUẬT, AN TOÀN VÀ TƯ VẤN XÂY DỰNG – INCOSAF – CHI NHÁNH ĐÀ NẴNG";
const BEN_B_REPRESENTATIVE = "Ông Dương Kim Ái";
const BEN_B_TITLE = "Giám đốc";
const BEN_B_ADDRESS = "20 Nguyễn Lộ Trạch, Phường Hòa Cường, TP. Đà Nẵng";

function run(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; size?: number }
): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts?.size ?? BODY_SIZE,
    bold: opts?.bold,
    italics: opts?.italics,
  });
}

function para(
  children: TextRun[],
  opts?: {
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingBefore?: number;
    spacingAfter?: number;
  }
): Paragraph {
  return new Paragraph({
    alignment: opts?.alignment ?? AlignmentType.JUSTIFIED,
    spacing: {
      line: LINE_SPACING,
      before: opts?.spacingBefore ?? 0,
      after: opts?.spacingAfter ?? 120,
    },
    children,
  });
}

function orPlaceholder(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "……";
}

function vietnameseDateParts(dateStr: string | null): { day: string; month: string; year: string } {
  if (!dateStr) return { day: "……", month: "……", year: "……" };
  const date = new Date(dateStr);
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.SOLID, color: "D9D9D9", fill: "D9D9D9" },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(text, { bold: true })],
      }),
    ],
  });
}

function bodyCell(
  text: string,
  width: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  opts?: { bold?: boolean }
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment,
        children: [run(text, { bold: opts?.bold })],
      }),
    ],
  });
}

// STT/Nội dung công việc/Đơn vị tính/Số lượng/Đơn giá/Thành tiền -- tổng
// đúng bằng CONTENT_WIDTH_DXA (9072), KHÔNG được lệch dù chỉ 1 dxa vì dòng
// "Tổng cộng" dùng columnSpan gộp 5 cột đầu, phải khớp tuyệt đối với tổng
// width của 5 cột header tương ứng để không bị lệch cột (lỗi đã từng xảy ra
// thật trong skill gốc khi chỉ set width thay vì columnSpan).
const COL_STT = 500;
const COL_NOI_DUNG = 3200;
const COL_DVT = 1000;
const COL_SO_LUONG = 900;
const COL_DON_GIA = 1600;
const COL_THANH_TIEN = 1872;

function buildWorkTable(equipment: ContractEquipmentRow[], totalValue: number): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("STT", COL_STT),
      headerCell("Nội dung công việc", COL_NOI_DUNG),
      headerCell("Đơn vị tính", COL_DVT),
      headerCell("Số lượng", COL_SO_LUONG),
      headerCell("Đơn giá (đồng)", COL_DON_GIA),
      headerCell("Thành tiền (đồng)", COL_THANH_TIEN),
    ],
  });

  // PROMPT-62: contract_equipment.unit_price giờ là giá CHƯA VAT (migration
  // 0034), nhưng dòng "Tổng cộng (đã bao gồm thuế GTGT 8%)" bên dưới lấy từ
  // contract.total_value (đã tự gồm VAT nhờ trigger) -- nếu in thẳng
  // row.unit_price thô thì cộng các dòng lại sẽ KHÔNG khớp dòng tổng. CHỈ
  // đổi cách HIỂN THỊ ở đây (nhân 1.08 khi in), KHÔNG đổi số lưu trong DB.
  const bodyRows = equipment.map((row, index) => {
    const unitPriceWithVat = Math.round(row.unit_price * 1.08);
    return new TableRow({
      children: [
        bodyCell(String(index + 1), COL_STT, AlignmentType.CENTER),
        bodyCell(row.equipment?.name || "—", COL_NOI_DUNG),
        bodyCell(row.unit || "Cái", COL_DVT, AlignmentType.CENTER),
        bodyCell(String(row.quantity), COL_SO_LUONG, AlignmentType.CENTER),
        bodyCell(unitPriceWithVat.toLocaleString("vi-VN"), COL_DON_GIA, AlignmentType.RIGHT),
        bodyCell(
          (row.quantity * unitPriceWithVat).toLocaleString("vi-VN"),
          COL_THANH_TIEN,
          AlignmentType.RIGHT
        ),
      ],
    });
  });

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        width: { size: COL_STT + COL_NOI_DUNG + COL_DVT + COL_SO_LUONG + COL_DON_GIA, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run("Tổng cộng (đã bao gồm thuế GTGT 8%):", { bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: COL_THANH_TIEN, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run(totalValue.toLocaleString("vi-VN"), { bold: true })],
          }),
        ],
      }),
    ],
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows, totalRow],
  });
}

function signatureCell(
  label: string,
  representativeName: string,
  width: number
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_SPACING, after: 0 },
        children: [run(label, { bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_SPACING, after: 0 },
        children: [run("(Ký, ghi rõ họ tên, đóng dấu)", { italics: true })],
      }),
      new Paragraph({ spacing: { line: LINE_SPACING }, children: [run("")] }),
      new Paragraph({ spacing: { line: LINE_SPACING }, children: [run("")] }),
      new Paragraph({ spacing: { line: LINE_SPACING }, children: [run("")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_SPACING },
        children: [run(representativeName, { bold: true })],
      }),
    ],
  });
}

export interface ContractAcceptanceCustomer {
  company_name: string;
  address: string | null;
  contact_name: string | null;
}

export async function buildContractAcceptanceDocx(
  contract: ContractDetail,
  customer: ContractAcceptanceCustomer | null,
  equipment: ContractEquipmentRow[]
): Promise<Blob> {
  const signedDateParts = vietnameseDateParts(contract.signed_date);
  const acceptanceDateParts = vietnameseDateParts(contract.acceptance_date);
  const totalWords = numberToVietnameseWords(contract.total_value);

  const children: (Paragraph | Table)[] = [
    // 1. Quốc hiệu tiêu ngữ
    para([run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true })], {
      alignment: AlignmentType.CENTER,
      spacingAfter: 0,
    }),
    para([run("Độc lập - Tự do - Hạnh phúc", { bold: true })], {
      alignment: AlignmentType.CENTER,
      spacingAfter: 0,
    }),
    para([run("---o0o---")], { alignment: AlignmentType.CENTER, spacingAfter: 240 }),

    // 2. Tiêu đề
    para([run("BIÊN BẢN NGHIỆM THU", { bold: true, size: TITLE_SIZE })], {
      alignment: AlignmentType.CENTER,
      spacingAfter: 60,
    }),

    // 3. Phụ đề
    para(
      [
        run("Khối lượng, chất lượng công việc kiểm định kỹ thuật an toàn thiết bị", {
          bold: true,
          italics: true,
        }),
      ],
      { alignment: AlignmentType.CENTER, spacingAfter: 60 }
    ),

    // 4. Dòng số hợp đồng
    para(
      [
        run(
          `Thuộc Hợp đồng kinh tế số: ${contract.contract_no} ngày ${signedDateParts.day} tháng ${signedDateParts.month} năm ${signedDateParts.year}`,
          { italics: true }
        ),
      ],
      { alignment: AlignmentType.CENTER, spacingAfter: 240 }
    ),

    // 5. Căn cứ
    para([run(`- Căn cứ Hợp đồng kinh tế số ${contract.contract_no} đã ký kết giữa hai bên;`)]),
    para([
      run(
        "- Căn cứ kết quả, thực tế công việc kiểm định kỹ thuật an toàn thiết bị đã thực hiện,"
      ),
    ]),

    // 6.
    para([
      run(
        `Hôm nay, ngày ${acceptanceDateParts.day} tháng ${acceptanceDateParts.month} năm ${acceptanceDateParts.year}, tại ${orPlaceholder(contract.acceptance_location)}, chúng tôi gồm có:`
      ),
    ]),

    // 7. Đại diện Bên A
    para([run(`I. ĐẠI DIỆN BÊN A: ${orPlaceholder(customer?.company_name)}`, { bold: true })], {
      spacingAfter: 0,
    }),
    para([
      run(
        `${orPlaceholder(contract.representative_a_name)}          Chức vụ: ${orPlaceholder(contract.representative_a_title)}`
      ),
    ], { spacingAfter: 0 }),
    para([run(`Địa chỉ: ${orPlaceholder(customer?.address)}`)]),

    // 8. Đại diện Bên B (cố định)
    para([run(`II. ĐẠI DIỆN BÊN B: ${BEN_B_NAME}`, { bold: true })], { spacingAfter: 0 }),
    para([run(`${BEN_B_REPRESENTATIVE} — ${BEN_B_TITLE}`)], { spacingAfter: 0 }),
    para([run(`Địa chỉ: ${BEN_B_ADDRESS}`)]),

    // 9.
    para([
      run(
        "Hai bên cùng tiến hành nghiệm thu khối lượng, chất lượng công việc thực hiện theo Hợp đồng kinh tế nêu trên, cụ thể như sau:"
      ),
    ]),

    // 10. Bảng khối lượng
    para([run("1. KHỐI LƯỢNG CÔNG VIỆC NGHIỆM THU", { bold: true })], { spacingAfter: 120 }),
    buildWorkTable(equipment, contract.total_value),

    // 11. Bằng chữ
    para([run(`Bằng chữ: ${totalWords} đồng./.`, { italics: true })], { spacingBefore: 120 }),

    // 12. Nhận xét, đánh giá
    para([run("2. NHẬN XÉT, ĐÁNH GIÁ", { bold: true })], { spacingAfter: 120 }),
    para([run("- Đã tiến hành kiểm định đúng quy trình, tiêu chuẩn kỹ thuật hiện hành;")]),
    para([
      run(
        contract.acceptance_result === "co_van_de"
          ? `- ${orPlaceholder(contract.acceptance_note)}`
          : "- Kết quả kiểm định đạt yêu cầu;"
      ),
    ]),
    para([
      run(
        "- Đã bàn giao đầy đủ hồ sơ kỹ thuật (biên bản kiểm định, kết quả kiểm định, tem kiểm định);"
      ),
    ]),
    para([
      run(
        "- Khối lượng, chất lượng công việc thực hiện đúng theo thỏa thuận tại Hợp đồng kinh tế nêu trên."
      ),
    ]),

    // 13. Kết luận
    para([run("3. KẾT LUẬN", { bold: true })], { spacingAfter: 120 }),
    para([
      run(
        "Hai bên thống nhất nghiệm thu khối lượng, chất lượng công việc nêu trên, xác nhận Bên B đã hoàn thành đầy đủ nghĩa vụ theo Hợp đồng kinh tế đã ký. Biên bản này là cơ sở để hai bên tiến hành thanh toán theo thỏa thuận."
      ),
    ]),

    // 14. Số bản lập
    para([run(orPlaceholder(contract.acceptance_copies_note))], {
      alignment: AlignmentType.CENTER,
      spacingBefore: 120,
      spacingAfter: 240,
    }),

    // 15. (cố ý bỏ dòng "Biên bản kết thúc lúc...")

    // 16. Bảng chữ ký -- viền mặc định của Table, KHÔNG set borders NONE.
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            signatureCell("ĐẠI DIỆN BÊN A", orPlaceholder(contract.representative_a_name), CONTENT_WIDTH_DXA / 2),
            signatureCell("ĐẠI DIỆN BÊN B", BEN_B_REPRESENTATIVE, CONTENT_WIDTH_DXA / 2),
          ],
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
            margin: {
              left: MARGIN_LEFT_DXA,
              right: MARGIN_RIGHT_DXA,
              top: MARGIN_TOP_BOTTOM_DXA,
              bottom: MARGIN_TOP_BOTTOM_DXA,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
