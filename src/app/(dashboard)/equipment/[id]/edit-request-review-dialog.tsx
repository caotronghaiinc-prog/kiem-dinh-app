"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("vi-VN");
}

export function EditRequestReviewDialog({
  editRequestId,
  reason,
  requestedByName,
  createdAt,
}: {
  editRequestId: string;
  reason: string;
  requestedByName: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      setShowRejectNote(false);
      setRejectNote("");
    }
    setOpen(next);
  }

  async function review(status: "approved" | "rejected") {
    setSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      toast({
        variant: "destructive",
        title: "Phiên đăng nhập đã hết hạn",
        description: "Vui lòng đăng nhập lại rồi thử lại.",
      });
      return;
    }

    // "approved": trigger DB (unlock_inspection_after_approval, migration
    // 0027) tự set inspection_history.is_locked = false -- KHÔNG tự làm ở
    // client. "rejected": bản ghi vẫn khóa, trigger chỉ xử lý nhánh approved.
    const { error } = await supabase
      .from("inspection_edit_requests")
      .update({
        status,
        admin_note: status === "rejected" ? rejectNote.trim() || null : null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", editRequestId);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: status === "approved" ? "Duyệt yêu cầu thất bại" : "Từ chối yêu cầu thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({
      title: status === "approved" ? "Đã duyệt -- bản ghi đã mở khóa" : "Đã từ chối yêu cầu",
    });
    setOpen(false);
    setShowRejectNote(false);
    setRejectNote("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
        >
          Yêu cầu xin sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yêu cầu xin sửa bản ghi kiểm định</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Người gửi</span>
            <span>{requestedByName || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Thời gian gửi
            </span>
            <span>{formatDateTime(createdAt)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">Lý do</span>
            <span className="whitespace-pre-wrap">{reason}</span>
          </div>
        </div>

        {showRejectNote && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Lý do từ chối (không bắt buộc)</label>
            <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          </div>
        )}

        <DialogFooter>
          {showRejectNote ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setShowRejectNote(false)}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => review("rejected")}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận từ chối
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setShowRejectNote(true)}
              >
                Từ chối
              </Button>
              <Button type="button" disabled={submitting} onClick={() => review("approved")}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Duyệt
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
