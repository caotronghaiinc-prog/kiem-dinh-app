"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileOption } from "./types";

const ALL_VALUE = "all";

const TABLE_OPTIONS = [
  { value: "equipment", label: "Thiết bị" },
  { value: "customers", label: "Khách hàng" },
  { value: "inspection_history", label: "Lịch sử kiểm định" },
];

const ACTION_OPTIONS = [
  { value: "insert", label: "Thêm mới" },
  { value: "update", label: "Cập nhật" },
  { value: "delete", label: "Xóa" },
];

export function AuditLogToolbar({
  initialTable,
  initialAction,
  initialChangedBy,
  initialFrom,
  initialTo,
  profileOptions,
}: {
  initialTable: string;
  initialAction: string;
  initialChangedBy: string;
  initialFrom: string;
  initialTo: string;
  profileOptions: ProfileOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL_VALUE) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={initialTable || ALL_VALUE} onValueChange={(v) => updateParam("table", v)}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Loại đối tượng" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tất cả đối tượng</SelectItem>
          {TABLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={initialAction || ALL_VALUE} onValueChange={(v) => updateParam("action", v)}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Hành động" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tất cả hành động</SelectItem>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={initialChangedBy || ALL_VALUE}
        onValueChange={(v) => updateParam("changed_by", v)}
      >
        <SelectTrigger className="sm:w-52">
          <SelectValue placeholder="Người thực hiện" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tất cả người thực hiện</SelectItem>
          {profileOptions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name || "—"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Từ</label>
        <Input
          type="date"
          value={initialFrom}
          onChange={(e) => updateParam("from", e.target.value)}
          className="sm:w-40"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Đến</label>
        <Input
          type="date"
          value={initialTo}
          onChange={(e) => updateParam("to", e.target.value)}
          className="sm:w-40"
        />
      </div>
    </div>
  );
}
