"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  editRequestFormSchema,
  EDIT_REQUEST_EMPTY_VALUES,
  type EditRequestFormValues,
} from "@/lib/inspection/edit-request-form-schema";

// Ràng buộc "chỉ 1 yêu cầu pending mỗi bản ghi" -- unique index MỘT PHẦN
// inspection_edit_requests_one_pending_idx (migration 0027). UI đã tự chặn
// bằng cách chỉ hiện nút này khi chưa có pending_edit_request, nhưng vẫn bắt
// lỗi 23505 ở đây phòng trường hợp đua (2 tab/2 người cùng gửi gần như đồng
// thời) -- mirror đúng cách loan-dialog.tsx (/tools) xử lý race tương tự.
function isPendingRequestConflict(error: { code?: string; message: string }): boolean {
  return (
    error.code === "23505" || error.message.includes("inspection_edit_requests_one_pending_idx")
  );
}

export function EditRequestDialog({ inspectionHistoryId }: { inspectionHistoryId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<EditRequestFormValues>({
    resolver: zodResolver(editRequestFormSchema),
    defaultValues: EDIT_REQUEST_EMPTY_VALUES,
  });

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) form.reset(EDIT_REQUEST_EMPTY_VALUES);
    setOpen(next);
  }

  async function onSubmit(values: EditRequestFormValues) {
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

    // status dùng default 'pending' của DB, không gửi field này lên.
    const { error } = await supabase.from("inspection_edit_requests").insert({
      inspection_history_id: inspectionHistoryId,
      requested_by: user.id,
      reason: values.reason.trim(),
    });

    setSubmitting(false);

    if (error) {
      if (isPendingRequestConflict(error)) {
        toast({
          variant: "destructive",
          title: "Đã có yêu cầu đang chờ duyệt",
          description:
            "Bản ghi này đã có 1 yêu cầu xin sửa đang chờ Admin duyệt. Vui lòng tải lại trang.",
        });
        router.refresh();
        return;
      }
      toast({
        variant: "destructive",
        title: "Gửi yêu cầu thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã gửi yêu cầu xin sửa" });
    form.reset(EDIT_REQUEST_EMPTY_VALUES);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Xin sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xin sửa bản ghi kiểm định</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do cần sửa *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gửi yêu cầu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
