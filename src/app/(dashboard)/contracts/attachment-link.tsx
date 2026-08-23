"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Bucket "inspection-files" là private -- không dùng public URL cố định.
 * Tạo signed URL ngay lúc bấm, hết hạn sau 10 phút, mở tab mới để trình
 * duyệt tự hiển thị (PDF xem trực tiếp, ảnh hiện preview). Copy nguyên từ
 * equipment/[id]/attachment-link.tsx -- đặt ở gốc contracts/ (không phải
 * contracts/[id]/) vì contract-form.tsx (dùng chung cho new/ và [id]/edit/)
 * cũng cần hiện file hiện có, không chỉ trang chi tiết.
 */
export function AttachmentLink({ path, label = "Xem file hợp đồng" }: { path: string; label?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    setLoading(false);

    if (error || !data?.signedUrl) {
      toast({
        variant: "destructive",
        title: "Không mở được file",
        description: error?.message ?? "Vui lòng thử lại.",
      });
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto gap-1 p-0"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {label}
    </Button>
  );
}
