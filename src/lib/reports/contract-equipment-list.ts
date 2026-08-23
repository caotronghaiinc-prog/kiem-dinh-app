import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { getEquipmentModelCode } from "@/lib/equipment/spec-fields";
import type { ContractEquipmentRow } from "@/app/(dashboard)/contracts/types";

// PROMPT-59: bảng kê thiết bị KHÔNG phải mẫu nhà nước bắt buộc -- dựng trực
// tiếp bằng thư viện docx (Document/Table/Paragraph), khác cách M3 dùng file
// mẫu tĩnh + docxtemplater (xem src/lib/reports/generate-docx.ts). Toàn văn
// hợp đồng pháp lý (Điều khoản, căn cứ Thông tư 41...) vẫn soạn qua skill
// Cowork soan-hop-dong-kiem-dinh, KHÔNG port vào đây.
export interface ContractEquipmentListInput {
  code: string;
  contract_no: string;
  customer_name: string | null;
}

const COLUMN_WIDTHS = [5, 18, 11, 10, 7, 10, 10, 14, 15];

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "999999" };
const CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function headerCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true })],
      }),
    ],
  });
}

function bodyCell(
  text: string,
  widthPercent: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    children: [new Paragraph({ alignment, children: [new TextRun(text)] })],
  });
}

export async function buildContractEquipmentListDocx(
  contract: ContractEquipmentListInput,
  equipment: ContractEquipmentRow[]
): Promise<Blob> {
  const total = equipment.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("STT", COLUMN_WIDTHS[0]),
      headerCell("Tên thiết bị", COLUMN_WIDTHS[1]),
      headerCell("Mã hiệu", COLUMN_WIDTHS[2]),
      headerCell("Số chế tạo", COLUMN_WIDTHS[3]),
      headerCell("Số lượng", COLUMN_WIDTHS[4]),
      headerCell("Số tem", COLUMN_WIDTHS[5]),
      headerCell("Ngày kiểm định", COLUMN_WIDTHS[6]),
      headerCell("Đơn giá (đ)", COLUMN_WIDTHS[7]),
      headerCell("Thành tiền (đ)", COLUMN_WIDTHS[8]),
    ],
  });

  const bodyRows = equipment.map(
    (row, index) =>
      new TableRow({
        children: [
          bodyCell(String(index + 1), COLUMN_WIDTHS[0], AlignmentType.CENTER),
          bodyCell(row.equipment?.name || "—", COLUMN_WIDTHS[1]),
          bodyCell(getEquipmentModelCode(row.equipment?.spec_values) || "—", COLUMN_WIDTHS[2]),
          bodyCell(row.equipment?.serial_number || "—", COLUMN_WIDTHS[3]),
          bodyCell(String(row.quantity), COLUMN_WIDTHS[4], AlignmentType.CENTER),
          bodyCell(row.so_tem || "—", COLUMN_WIDTHS[5], AlignmentType.CENTER),
          bodyCell(formatDate(row.ngay_kiem_dinh), COLUMN_WIDTHS[6], AlignmentType.CENTER),
          bodyCell(row.unit_price.toLocaleString("vi-VN"), COLUMN_WIDTHS[7], AlignmentType.RIGHT),
          bodyCell(
            (row.quantity * row.unit_price).toLocaleString("vi-VN"),
            COLUMN_WIDTHS[8],
            AlignmentType.RIGHT
          ),
        ],
      })
  );

  // PROMPT-62: contract_equipment.unit_price giờ là giá CHƯA VAT (migration
  // 0034) -- 1 dòng "Tổng cộng" gộp sẵn cũ sẽ THIẾU 8% so với số khách thực
  // trả nếu để nguyên. Đổi thành 3 dòng, mirror ĐÚNG cấu trúc bảng báo giá
  // (quote-export.ts): Cộng chưa VAT / Thuế VAT (8%) / TỔNG CỘNG, tính trực
  // tiếp từ equipment (không lấy contract.total_value).
  const vat = Math.round(total * 0.08);
  const grandTotal = total + vat;

  function totalRow(label: string, value: number, emphasize?: boolean): TableRow {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 8,
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: label, bold: true })],
            }),
          ],
        }),
        new TableCell({
          borders: CELL_BORDERS,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: value.toLocaleString("vi-VN"), bold: emphasize })],
            }),
          ],
        }),
      ],
    });
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "INCERT", bold: true, size: 24 })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `BẢNG KÊ THIẾT BỊ KÈM HỢP ĐỒNG SỐ ${contract.contract_no}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Mã hợp đồng: ${contract.code}` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Khách hàng: ${contract.customer_name || "—"}` }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: `Ngày xuất: ${formatDate(new Date().toISOString())}` }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow,
              ...bodyRows,
              totalRow("Cộng chưa VAT:", total),
              totalRow("Thuế VAT (8%):", vat),
              totalRow("TỔNG CỘNG:", grandTotal, true),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
