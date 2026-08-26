import {
  AlignmentType,
  BorderStyle,
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
import { getEquipmentModelCode } from "@/lib/equipment/spec-fields";
import type { ContractDetail, ContractEquipmentRow, ContractPerson } from "@/app/(dashboard)/contracts/types";
import { INCERT_COMPANY } from "./company-info";

// PROMPT-66: "Giấy đề nghị thực hiện công việc" -- port ĐÚNG mẫu thật
// De_nghi_thuc_hien_cong_viec.pdf do Hải gửi, chỉ đổi pháp nhân sang
// INCERT (mirror PROMPT-64 với Biên bản nghiệm thu) -- bỏ hẳn dòng chi
// nhánh/đơn vị trực thuộc của pháp nhân cũ trong mẫu gốc, cùng quyết định
// PROMPT-64. Mirror khổ A4/FONT/CONTENT_WIDTH_DXA của contract-
// acceptance.ts (PROMPT-61) -- văn bản pháp lý thu gọn công ty <-> kiểm
// định viên, không phải mức chi tiết đơn giản như bảng kê cũ đã xóa.
const FONT = "Times New Roman";
const BODY_SIZE = 26; // 13pt
const TITLE_SIZE = 32; // 16pt
const LINE_SPACING = 276;

const PAGE_WIDTH_DXA = 11907;
const PAGE_HEIGHT_DXA = 16840;
const MARGIN_LEFT_DXA = 1701;
const MARGIN_RIGHT_DXA = 1134;
const MARGIN_TOP_BOTTOM_DXA = 1134;
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_LEFT_DXA - MARGIN_RIGHT_DXA; // 9072

const DIRECTOR_NAME = "Ông Thái Tân";
const DIRECTOR_TITLE = "Giám đốc";

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
  return trimmed ? trimmed : "……………………";
}

// Nối tên nhiều người bằng ", " trên 1 dòng -- lọc bỏ full_name null (tài
// khoản không tra được tên, vd đã bị active=false sau khi gán) thay vì in
// "null" ra văn bản.
function joinNames(people: ContractPerson[]): string {
  const names = people.map((p) => p.full_name).filter((n): n is string => !!n?.trim());
  return names.length > 0 ? names.join(", ") : "……………………";
}

function vietnameseDateParts(isoDate: string): { day: string; month: string; year: string } {
  const date = new Date(isoDate);
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

// Khối tiêu đề 2 cột không viền: trái = công ty (INCERT), phải = quốc hiệu
// tiêu ngữ -- mirror kỹ thuật buildLetterhead() của quote-export.ts
// (BorderStyle.NONE toàn bộ viền + insideH/V). Dòng dưới cùng "Số:.../KĐ"
// trái, "Đà Nẵng, ngày d tháng m năm y" phải, cùng 1 bảng không viền.
function buildLetterhead(documentNo: string | null, documentDate: string): Table {
  const colWidth = CONTENT_WIDTH_DXA / 2;
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const dateParts = vietnameseDateParts(documentDate);

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: LINE_SPACING, after: 0 },
                children: [run(INCERT_COMPANY.name, { bold: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: LINE_SPACING, after: 0 },
                children: [run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: LINE_SPACING, after: 0 },
                children: [run(INCERT_COMPANY.address)],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: LINE_SPACING, after: 0 },
                children: [run("Độc lập - Tự do - Hạnh phúc", { bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: LINE_SPACING, after: 0 },
                children: [run("---o0o---")],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { line: LINE_SPACING, before: 240 },
                children: [run(`Số: ${orPlaceholder(documentNo)}/KĐ`, { italics: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: LINE_SPACING, before: 240 },
                children: [
                  run(
                    `Đà Nẵng, ngày ${dateParts.day} tháng ${dateParts.month} năm ${dateParts.year}`,
                    { italics: true }
                  ),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
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
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment, children: [run(text)] })],
  });
}

// STT/Nội dung công việc/ĐVT/KL/Đơn giá chưa VAT/Thành tiền -- tổng đúng
// bằng CONTENT_WIDTH_DXA (9072), mirror ĐÚNG cách chia cột của
// contract-acceptance.ts (dòng tổng dùng columnSpan gộp 5 cột đầu, phải
// khớp tuyệt đối tổng width tương ứng).
const COL_STT = 500;
const COL_NOI_DUNG = 3200;
const COL_DVT = 1000;
const COL_SO_LUONG = 900;
const COL_DON_GIA = 1600;
const COL_THANH_TIEN = 1872;

function buildWorkContentLine(row: ContractEquipmentRow): string {
  const modelCode = getEquipmentModelCode(row.equipment?.spec_values);
  const base = `Kiểm định kỹ thuật an toàn ${row.equipment?.name || "—"}`;
  return modelCode ? `${base} (mã hiệu ${modelCode})` : base;
}

function totalRow(label: string, value: number, opts?: { emphasize?: boolean }): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        width: { size: COL_STT + COL_NOI_DUNG + COL_DVT + COL_SO_LUONG + COL_DON_GIA, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run(label, { bold: true })],
          }),
        ],
      }),
      new TableCell({
        width: { size: COL_THANH_TIEN, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run(value.toLocaleString("vi-VN"), { bold: opts?.emphasize })],
          }),
        ],
      }),
    ],
  });
}

// Bảng: STT | Nội dung công việc | ĐVT | KL | Đơn giá chưa VAT (đ) | Thành
// tiền (đ) -- 3 dòng tổng Tổng tiền chưa VAT / Tiền thuế VAT 8% / Tổng
// cộng, GIỐNG quy ước contract-equipment-list.ts cũ (đã xóa -- unit_price
// = giá CHƯA VAT, migration 0034), KHÁC bảng contract-acceptance.ts (đã
// nhân 1.08 sẵn khi hiển thị vì bảng đó chỉ có 1 dòng tổng).
function buildWorkTable(equipment: ContractEquipmentRow[]): { table: Table; grandTotal: number } {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("STT", COL_STT),
      headerCell("Nội dung công việc", COL_NOI_DUNG),
      headerCell("ĐVT", COL_DVT),
      headerCell("KL", COL_SO_LUONG),
      headerCell("Đơn giá chưa VAT (đ)", COL_DON_GIA),
      headerCell("Thành tiền (đ)", COL_THANH_TIEN),
    ],
  });

  const bodyRows = equipment.map((row, index) => {
    const thanhTien = row.quantity * row.unit_price;
    return new TableRow({
      children: [
        bodyCell(String(index + 1), COL_STT, AlignmentType.CENTER),
        bodyCell(buildWorkContentLine(row), COL_NOI_DUNG),
        bodyCell(row.unit || "Cái", COL_DVT, AlignmentType.CENTER),
        bodyCell(String(row.quantity), COL_SO_LUONG, AlignmentType.CENTER),
        bodyCell(row.unit_price.toLocaleString("vi-VN"), COL_DON_GIA, AlignmentType.RIGHT),
        bodyCell(thanhTien.toLocaleString("vi-VN"), COL_THANH_TIEN, AlignmentType.RIGHT),
      ],
    });
  });

  const totalBeforeVat = equipment.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  const vat = Math.round(totalBeforeVat * 0.08);
  const grandTotal = totalBeforeVat + vat;

  const table = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    rows: [
      headerRow,
      ...bodyRows,
      totalRow("Tổng tiền chưa VAT:", totalBeforeVat),
      totalRow("Tiền thuế VAT (8%):", vat),
      totalRow("Tổng cộng:", grandTotal, { emphasize: true }),
    ],
  });

  return { table, grandTotal };
}

function signatureCell(label: string, representativeName: string, width: number): TableCell {
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
        children: [run("(Ký, ghi rõ họ tên)", { italics: true })],
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

// documentDate: ISO string, nút xuất tự tính new Date().toISOString() rồi
// truyền vào -- KHÔNG gọi new Date() bên trong hàm này (mirror
// contract-acceptance.ts, dễ test/tái lập kết quả).
export async function buildWorkRequestDocx(
  contract: ContractDetail,
  equipment: ContractEquipmentRow[],
  documentDate: string
): Promise<Blob> {
  const { table: workTable, grandTotal } = buildWorkTable(equipment);
  const amountWords = numberToVietnameseWords(grandTotal);
  const requesterName = contract.requester?.full_name ?? null;
  const responsibleNames = joinNames(contract.technicalResponsibles);

  const children: (Paragraph | Table)[] = [
    buildLetterhead(contract.work_request_document_no, documentDate),

    para([run("GIẤY ĐỀ NGHỊ THỰC HIỆN CÔNG VIỆC", { bold: true, size: TITLE_SIZE })], {
      alignment: AlignmentType.CENTER,
      spacingBefore: 240,
      spacingAfter: 240,
    }),

    para([run(`Tôi tên là: ${orPlaceholder(requesterName)}`)]),
    para([run(`Đề nghị ${DIRECTOR_TITLE} cho phép thực hiện công việc như sau:`)], {
      spacingAfter: 120,
    }),

    workTable,

    para([run(`Số tiền bằng chữ: ${amountWords} đồng`, { italics: true })], {
      spacingBefore: 120,
      spacingAfter: 240,
    }),

    para([run(`- Đơn vị yêu cầu (Bên A): ${orPlaceholder(contract.customer?.company_name)}`)]),
    para([run(`- Địa chỉ: ${orPlaceholder(contract.customer?.address)}`)]),
    para([run(`- Mã số thuế: ${orPlaceholder(contract.customer?.tax_code)}`)]),
    para([run(`- Địa điểm thực hiện: ${orPlaceholder(contract.site_location)}`)]),
    para([run(`- Thời gian thực hiện: ${orPlaceholder(contract.execution_time_note)}`)]),
    para([
      run(
        `- Người liên hệ: ${orPlaceholder(contract.customer?.contact_name)} — Số điện thoại liên hệ: ${orPlaceholder(contract.customer?.phone)}`
      ),
    ]),
    para([run(`- Người chịu trách nhiệm kỹ thuật: ${responsibleNames}`)]),
    para([run(`- Loại hình hợp đồng: ${orPlaceholder(contract.contract_type_note)}`)]),
    para([run(`- Đơn vị/Dự án sử dụng: ${orPlaceholder(contract.using_unit_name)}`)]),
    para([run(`- Địa chỉ ĐV/DA sử dụng: ${orPlaceholder(contract.using_unit_address)}`)], {
      spacingAfter: 360,
    }),

    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            signatureCell(DIRECTOR_TITLE.toUpperCase(), DIRECTOR_NAME, CONTENT_WIDTH_DXA / 2),
            signatureCell("NGƯỜI ĐỀ NGHỊ", orPlaceholder(requesterName), CONTENT_WIDTH_DXA / 2),
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
