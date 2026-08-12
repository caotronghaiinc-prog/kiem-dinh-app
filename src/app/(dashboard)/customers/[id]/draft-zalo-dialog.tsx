"use client";

import { useState } from "react";
import { Copy, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Nút này chỉ được render ở page.tsx khi khách hàng có ít nhất 1 thiết bị
 * đỏ/vàng (tính server-side qua getExpiryStatus) -- component không tự
 * kiểm tra lại điều kiện đó.
 */
export function DraftZaloDialog({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function fetchDraft() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/draft-zalo-message`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Không soạn được tin nhắn.");
      }
      setMessage(data.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMessage("");
      setError(null);
      fetchDraft();
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    toast({ title: "Đã copy, dán vào Zalo để gửi" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="zalo-draft-trigger">
          <MessageCircle className="mr-2 h-4 w-4" />
          Soạn tin nhắn Zalo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Soạn tin nhắn Zalo</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div
            className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
            data-testid="zalo-draft-loading"
          >
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Đang soạn tin nhắn...</p>
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center gap-3 py-6 text-center"
            data-testid="zalo-draft-error"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchDraft} data-testid="zalo-draft-retry">
              Thử lại
            </Button>
          </div>
        ) : (
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="min-h-[200px]"
            data-testid="zalo-draft-textarea"
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={loading || Boolean(error) || !message}
            data-testid="zalo-draft-copy"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
