"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logAndGetSafeMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";
import { buildQuoteDocx, type QuoteExportInput } from "@/lib/reports/quote-export";
import type { QuoteItemRow } from "../types";

export function ExportQuoteButton({
  quoteId,
  quote,
  items,
}: {
  quoteId: string;
  quote: QuoteExportInput;
  items: QuoteItemRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await buildQuoteDocx(quote, items);
      const fileName = `Bao-gia-${quote.code}.docx`;

      // Lưu lại bản đã xuất vào Storage + cập nhật quotes.quote_file_path
      // ("lưu lại bản đã gửi khách" -- đúng ý nghĩa cột này ở migration
      // 0032), song song vẫn tự tải file về máy ngay cho người dùng.
      const supabase = createClient();
      const path = `quote-files/${quoteId}/${crypto.randomUUID()}.docx`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("quotes")
        .update({ quote_file_path: path })
        .eq("id", quoteId);
      if (updateError) throw updateError;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Đã xuất báo giá" });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Xuất báo giá thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={exporting || items.length === 0}
      onClick={handleExport}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Xuất báo giá
    </Button>
  );
}
