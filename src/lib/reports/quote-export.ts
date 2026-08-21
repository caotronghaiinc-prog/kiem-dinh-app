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
import type { QuoteItemRow, QuoteRecord } from "@/app/(dashboard)/quotes/types";

// PROMPT-60: báo giá KHÔNG phải mẫu nhà nước bắt buộc -- dựng trực tiếp bằng
// thư viện docx (Document/Table/Paragraph), mirror ĐÚNG cách PROMPT-59 xuất
// bảng kê thiết bị (src/lib/reports/contract-equipment-list.ts), KHÔNG cần
// file mẫu tải lên. Toàn văn hợp đồng pháp lý vẫn dùng skill Cowork riêng,
// không áp dụng ở đây.
export interface QuoteExportInput {
  code: string;
  customer_name_snapshot: string;
  customer_address_snapshot: string | null;
  customer_contact_snapshot: string | null;
  customer_phone_snapshot: string | null;
  customer_tax_code_snapshot: string | null;
  title: string | null;
  valid_until: string | null;
  note: string | null;
}

const COLUMN_WIDTHS = [7, 38, 12, 8, 17, 18];

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

function infoParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)],
  });
}

export async function buildQuoteDocx(quote: QuoteExportInput, items: QuoteItemRow[]): Promise<Blob> {
  const total = items.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("STT", COLUMN_WIDTHS[0]),
      headerCell("Tên hạng mục", COLUMN_WIDTHS[1]),
      headerCell("Đơn vị tính", COLUMN_WIDTHS[2]),
      headerCell("Số lượng", COLUMN_WIDTHS[3]),
      headerCell("Đơn giá (đ)", COLUMN_WIDTHS[4]),
      headerCell("Thành tiền (đ)", COLUMN_WIDTHS[5]),
    ],
  });

  const bodyRows = items.map(
    (row, index) =>
      new TableRow({
        children: [
          bodyCell(String(index + 1), COLUMN_WIDTHS[0], AlignmentType.CENTER),
          bodyCell(row.item_name, COLUMN_WIDTHS[1]),
          bodyCell(row.unit || "—", COLUMN_WIDTHS[2], AlignmentType.CENTER),
          bodyCell(String(row.quantity), COLUMN_WIDTHS[3], AlignmentType.CENTER),
          bodyCell(row.unit_price.toLocaleString("vi-VN"), COLUMN_WIDTHS[4], AlignmentType.RIGHT),
          bodyCell(
            (row.quantity * row.unit_price).toLocaleString("vi-VN"),
            COLUMN_WIDTHS[5],
            AlignmentType.RIGHT
          ),
        ],
      })
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        borders: CELL_BORDERS,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Tổng cộng", bold: true })],
          }),
        ],
      }),
      new TableCell({
        borders: CELL_BORDERS,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: total.toLocaleString("vi-VN"), bold: true })],
          }),
        ],
      }),
    ],
  });

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
              new TextRun({ text: "BÁO GIÁ DỊCH VỤ KIỂM ĐỊNH KỸ THUẬT AN TOÀN", bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `Số: ${quote.code}` })],
          }),
          infoParagraph("Kính gửi", quote.customer_name_snapshot),
          ...(quote.customer_address_snapshot
            ? [infoParagraph("Địa chỉ", quote.customer_address_snapshot)]
            : []),
          ...(quote.customer_contact_snapshot
            ? [infoParagraph("Người liên hệ", quote.customer_contact_snapshot)]
            : []),
          ...(quote.customer_phone_snapshot
            ? [infoParagraph("Điện thoại", quote.customer_phone_snapshot)]
            : []),
          ...(quote.customer_tax_code_snapshot
            ? [infoParagraph("Mã số thuế", quote.customer_tax_code_snapshot)]
            : []),
          ...(quote.title ? [infoParagraph("Nội dung", quote.title)] : []),
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun("Chúng tôi xin trân trọng gửi báo giá dịch vụ như sau:"),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows, totalRow],
          }),
          new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: "Đơn giá trên đã bao gồm thuế GTGT 8%.", italics: true })],
          }),
          new Paragraph({
            children: [new TextRun(`Báo giá có hiệu lực đến: ${formatDate(quote.valid_until)}`)],
          }),
          ...(quote.note ? [infoParagraph("Ghi chú", quote.note)] : []),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
