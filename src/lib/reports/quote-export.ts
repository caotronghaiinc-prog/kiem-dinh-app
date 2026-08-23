"use client";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
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
import { INCERT_COMPANY } from "./company-info";
import type { QuoteItemRow } from "@/app/(dashboard)/quotes/types";

// PROMPT-62: làm lại theo ĐÚNG mẫu thật Mau_Bao_Gia_INCERT.pdf anh Hải gửi
// -- khác hẳn bảng đơn giản PROMPT-60 ban đầu. quote_items.unit_price giờ
// là giá CHƯA VAT (migration 0034), bảng có 3 dòng tổng riêng (Cộng chưa
// VAT/Thuế VAT 8%/TỔNG CỘNG) thay vì 1 dòng "Tổng cộng" gộp sẵn VAT.
const FONT = "Times New Roman";
const BODY_SIZE = 20; // 10pt
const TITLE_SIZE = 32; // 16pt
const BRAND_COLOR = "13577E";
const WHITE_COLOR = "FFFFFF";
const LINE_COLOR = "999999";

const PAGE_WIDTH_DXA = 11907;
const PAGE_HEIGHT_DXA = 16840;
const MARGIN_TOP_DXA = 900;
const MARGIN_RIGHT_DXA = 850;
const MARGIN_BOTTOM_DXA = 1000;
const MARGIN_LEFT_DXA = 1701;
// Khác PAGE_WIDTH trừ margin trái/phải của contract-acceptance.ts (PROMPT-61,
// 1134 phải) -- báo giá dùng đúng margin skill baogia-incosaf gốc (850
// phải) nên content width khác: 11907 - 1701 - 850 = 9356.
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_LEFT_DXA - MARGIN_RIGHT_DXA;

const LOGO_TARGET_HEIGHT_PX = 55;

function run(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; size?: number; color?: string }
): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts?.size ?? BODY_SIZE,
    bold: opts?.bold,
    italics: opts?.italics,
    color: opts?.color,
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
    spacing: { before: opts?.spacingBefore ?? 0, after: opts?.spacingAfter ?? 100 },
    children,
  });
}

function formatMoney(value: number): string {
  return Math.round(value).toLocaleString("vi-VN");
}

// Đọc kích thước gốc thật của logo (không đoán tỉ lệ) để tính width giữ
// đúng khung hình -- chiều cao mục tiêu ~55px trong trang A4.
async function loadLogo(): Promise<{ data: ArrayBuffer; width: number; height: number }> {
  const response = await fetch("/logo.png");
  const data = await response.arrayBuffer();
  const bitmap = await createImageBitmap(new Blob([data]));
  const width = Math.round((bitmap.width / bitmap.height) * LOGO_TARGET_HEIGHT_PX);
  bitmap.close();
  return { data, width, height: LOGO_TARGET_HEIGHT_PX };
}

function buildLetterhead(logo: { data: ArrayBuffer; width: number; height: number }): (Paragraph | Table)[] {
  const logoColWidth = 2200;
  const textColWidth = CONTENT_WIDTH_DXA - logoColWidth;

  return [
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
        bottom: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
        left: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
        right: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: WHITE_COLOR },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: logoColWidth, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: "png",
                      data: logo.data,
                      transformation: { width: logo.width, height: logo.height },
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: textColWidth, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [run(INCERT_COMPANY.name, { bold: true, color: BRAND_COLOR })],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [run(`Địa chỉ: ${INCERT_COMPANY.address}`, { color: BRAND_COLOR })],
                }),
                new Paragraph({
                  children: [
                    run(`Email: ${INCERT_COMPANY.email} • Hotline: ${INCERT_COMPANY.hotline}`, {
                      color: BRAND_COLOR,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 100, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: BRAND_COLOR } },
      children: [run("")],
    }),
  ];
}

function buildFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE_COLOR } },
        children: [
          run(
            `${INCERT_COMPANY.name} – ${INCERT_COMPANY.address} – Email: ${INCERT_COMPANY.email} – Hotline: ${INCERT_COMPANY.hotline}`,
            { italics: true, size: 16 }
          ),
        ],
      }),
    ],
  });
}

const COL_STT = 500;
const COL_TEN = 3500;
const COL_DVT = 900;
const COL_SL = 800;
const COL_DON_GIA = 1800;
const COL_THANH_TIEN = CONTENT_WIDTH_DXA - COL_STT - COL_TEN - COL_DVT - COL_SL - COL_DON_GIA; // 1856

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.SOLID, color: BRAND_COLOR, fill: BRAND_COLOR },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(text, { bold: true, color: WHITE_COLOR })],
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

function totalRow(label: string, value: number, opts?: { emphasize?: boolean }): TableRow {
  const color = opts?.emphasize ? WHITE_COLOR : undefined;
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 5,
        width: { size: COL_STT + COL_TEN + COL_DVT + COL_SL + COL_DON_GIA, type: WidthType.DXA },
        shading: opts?.emphasize
          ? { type: ShadingType.SOLID, color: BRAND_COLOR, fill: BRAND_COLOR }
          : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run(label, { bold: true, color })],
          }),
        ],
      }),
      new TableCell({
        width: { size: COL_THANH_TIEN, type: WidthType.DXA },
        shading: opts?.emphasize
          ? { type: ShadingType.SOLID, color: BRAND_COLOR, fill: BRAND_COLOR }
          : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [run(formatMoney(value), { bold: true, color })],
          }),
        ],
      }),
    ],
  });
}

function buildQuoteTable(items: QuoteItemRow[]): { table: Table; totalBeforeVat: number; vat: number; grandTotal: number } {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("STT", COL_STT),
      headerCell("Tên công việc / hạng mục", COL_TEN),
      headerCell("ĐVT", COL_DVT),
      headerCell("Số lượng", COL_SL),
      headerCell("Đơn giá (VNĐ)", COL_DON_GIA),
      headerCell("Thành tiền (VNĐ)", COL_THANH_TIEN),
    ],
  });

  const bodyRows = items.map(
    (row, index) =>
      new TableRow({
        children: [
          bodyCell(String(index + 1), COL_STT, AlignmentType.CENTER),
          bodyCell(row.item_name, COL_TEN),
          bodyCell(row.unit || "—", COL_DVT, AlignmentType.CENTER),
          bodyCell(String(row.quantity), COL_SL, AlignmentType.CENTER),
          bodyCell(formatMoney(row.unit_price), COL_DON_GIA, AlignmentType.RIGHT),
          bodyCell(formatMoney(row.quantity * row.unit_price), COL_THANH_TIEN, AlignmentType.RIGHT),
        ],
      })
  );

  // Tính độc lập từ items (không lấy quote.total_value) để khớp đúng bảng
  // đang hiển thị -- nếu lệch quote.total_value thì đó là dấu hiệu cần
  // kiểm tra lại trigger sync_quote_total_value(), không phải bịa số ở đây.
  const totalBeforeVat = items.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  const vat = Math.round(totalBeforeVat * 0.08);
  const grandTotal = totalBeforeVat + vat;

  const table = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    rows: [
      headerRow,
      ...bodyRows,
      totalRow("Cộng chưa VAT:", totalBeforeVat),
      totalRow("Thuế VAT (8%):", vat),
      totalRow("TỔNG CỘNG:", grandTotal, { emphasize: true }),
    ],
  });

  return { table, totalBeforeVat, vat, grandTotal };
}

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
  site_location: string | null;
}

function formatDateVi(date: Date): string {
  return date.toLocaleDateString("vi-VN");
}

export async function buildQuoteDocx(quote: QuoteExportInput, items: QuoteItemRow[]): Promise<Blob> {
  const logo = await loadLogo();
  const now = new Date();
  const { table: quoteTable } = buildQuoteTable(items);

  const children: (Paragraph | Table)[] = [
    ...buildLetterhead(logo),

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
    para([run("BÁO GIÁ", { bold: true, size: TITLE_SIZE, color: BRAND_COLOR })], {
      alignment: AlignmentType.CENTER,
      spacingAfter: 60,
    }),

    // 3. Phụ đề
    para([run("Dịch vụ kiểm định kỹ thuật an toàn thiết bị", { bold: true, italics: true })], {
      alignment: AlignmentType.CENTER,
      spacingAfter: 240,
    }),

    // 4. Số
    para([run(`Số: ${quote.code}`)]),

    // 5. V/v
    para([run(`V/v: ${quote.title || "Báo giá dịch vụ kiểm định kỹ thuật an toàn"}`)]),

    // 6. Kính gửi
    para([run("Kính gửi: ", { bold: true }), run(quote.customer_name_snapshot)]),

    // 7. Địa chỉ (bỏ nếu rỗng)
    ...(quote.customer_address_snapshot
      ? [para([run(`Địa chỉ: ${quote.customer_address_snapshot}`)])]
      : []),

    // 8. Địa điểm thực hiện (chỉ in nếu có)
    ...(quote.site_location ? [para([run(`Địa điểm thực hiện: ${quote.site_location}`)])]: []),

    // 9. Căn cứ
    para([run("Căn cứ:", { bold: true })], { spacingAfter: 60 }),
    para([
      run(
        "- Thông tư số 41/2016/TT-BLĐTBXH ngày 11/11/2016 của Bộ Lao động - Thương binh và Xã hội quy định giá tối thiểu đối với dịch vụ kiểm định kỹ thuật an toàn lao động máy, thiết bị, vật tư và các chất có yêu cầu nghiêm ngặt về an toàn lao động;"
      ),
    ]),
    para([run("- Nhu cầu kiểm định kỹ thuật an toàn thiết bị của Quý khách hàng.")], {
      spacingAfter: 240,
    }),

    // 10. Đoạn giới thiệu
    para([
      run(
        `${INCERT_COMPANY.name} trân trọng gửi tới Quý khách hàng bảng báo giá dịch vụ kiểm định kỹ thuật an toàn như sau:`
      ),
    ]),

    // 11. Bảng báo giá + 3 dòng tổng
    quoteTable,

    // 12. Ghi chú
    para([run("GHI CHÚ:", { bold: true })], { spacingBefore: 240, spacingAfter: 60 }),
    para([
      run(
        "1. Đơn giá trên chưa bao gồm chi phí di chuyển, lưu trú (nếu có) – sẽ thỏa thuận thêm theo thực tế."
      ),
    ]),
    para([run("2. Thuế VAT 8% áp dụng theo quy định hiện hành.")]),
    para([
      run("3. Thời gian thực hiện: Sau khi nhận được xác nhận hợp đồng và đủ điều kiện triển khai."),
    ]),
    para([run("4. Kết quả: Cấp đầy đủ hồ sơ kiểm định theo quy định.")]),
    ...(quote.valid_until
      ? [
          para([
            run(`5. Báo giá có hiệu lực đến hết ngày ${formatDateVi(new Date(quote.valid_until))}.`),
          ]),
        ]
      : []),
    ...(quote.note ? [para([run(quote.note)], { spacingBefore: 120 })] : []),

    // 13. Khối ký tên -- căn phải, chỉ 1 bên
    para([
      run(
        `Đà Nẵng, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`,
        { italics: true }
      ),
    ], { alignment: AlignmentType.RIGHT, spacingBefore: 360, spacingAfter: 0 }),
    para([run(INCERT_COMPANY.name, { bold: true })], {
      alignment: AlignmentType.RIGHT,
      spacingBefore: 0,
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
              top: MARGIN_TOP_DXA,
              bottom: MARGIN_BOTTOM_DXA,
            },
          },
        },
        footers: { default: buildFooter() },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
