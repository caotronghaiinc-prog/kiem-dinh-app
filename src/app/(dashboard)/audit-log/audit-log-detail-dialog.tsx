"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AuditAction } from "./types";

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function formatValue(value: unknown): string {
  if (isEmpty(value)) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface DetailRow {
  field: string;
  content: string;
}

// Ngoài phạm vi công cụ nội bộ này -- KHÔNG dịch tên field DB sang tiếng
// Việt (giữ nguyên tên cột), chỉ cần đủ để admin tra cứu/đối soát.
function buildRows(
  action: AuditAction,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): DetailRow[] {
  if (action === "insert") {
    const data = newData ?? {};
    return Object.keys(data)
      .filter((key) => !isEmpty(data[key]))
      .sort()
      .map((key) => ({ field: key, content: formatValue(data[key]) }));
  }

  if (action === "delete") {
    const data = oldData ?? {};
    return Object.keys(data)
      .filter((key) => !isEmpty(data[key]))
      .sort()
      .map((key) => ({ field: key, content: formatValue(data[key]) }));
  }

  // update: chỉ liệt kê field có giá trị KHÁC nhau giữa old_data/new_data.
  const old = oldData ?? {};
  const next = newData ?? {};
  const keys = Array.from(new Set([...Object.keys(old), ...Object.keys(next)])).sort();
  return keys
    .filter((key) => JSON.stringify(old[key]) !== JSON.stringify(next[key]))
    .map((key) => ({
      field: key,
      content: `${formatValue(old[key])} → ${formatValue(next[key])}`,
    }));
}

export function AuditLogDetailDialog({
  action,
  oldData,
  newData,
}: {
  action: AuditAction;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);
  const rows = buildRows(action, oldData, newData);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Xem chi tiết
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết thay đổi</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có thay đổi nội dung.</p>
        ) : (
          <div className="flex flex-col divide-y text-sm">
            {rows.map((row) => (
              <div key={row.field} className="flex flex-col gap-1 py-2">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {row.field}
                </span>
                <span className="whitespace-pre-wrap break-words">{row.content}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
