"use client";

import { QuotePreviewDialog } from "./quote-preview-dialog";
import type { QuoteItemRow, QuoteRecord } from "../types";

// PROMPT-67: giữ nguyên tên file/component (chỗ gọi ở [id]/page.tsx không
// cần đổi) -- đổi hành vi bên trong từ tải thẳng sang mở dialog xem trước +
// sửa trực tiếp (quote-preview-dialog.tsx).
export function ExportQuoteButton({
  quoteId,
  quote,
  items,
}: {
  quoteId: string;
  quote: QuoteRecord;
  items: QuoteItemRow[];
}) {
  return <QuotePreviewDialog quoteId={quoteId} quote={quote} items={items} />;
}
