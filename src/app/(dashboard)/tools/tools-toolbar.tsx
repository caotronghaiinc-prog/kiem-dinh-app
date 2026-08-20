"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

const ALL_VALUE = "all";

export function ToolsToolbar({
  initialQuery,
  initialStatus,
  initialCalibration,
}: {
  initialQuery: string;
  initialStatus: string;
  initialCalibration: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus || ALL_VALUE);
  const [calibration, setCalibration] = useState(initialCalibration || ALL_VALUE);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => setStatus(initialStatus || ALL_VALUE), [initialStatus]);
  useEffect(() => setCalibration(initialCalibration || ALL_VALUE), [initialCalibration]);

  // Debounce search input -> URL navigation (không gọi API mỗi lần gõ 1 ký tự)
  useEffect(() => {
    if (query === initialQuery) return;

    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handle);
  }, [query, initialQuery, pathname, router, searchParams]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tìm theo tên dụng cụ, mã DC, model..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            updateParam("status", value);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Trạng thái mượn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả trạng thái</SelectItem>
            <SelectItem value="available">Sẵn có</SelectItem>
            <SelectItem value="on_loan">Đang mượn</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={calibration}
          onValueChange={(value) => {
            setCalibration(value);
            updateParam("calibration", value);
          }}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Hạn hiệu chuẩn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Mọi hạn hiệu chuẩn</SelectItem>
            <SelectItem value="expiring">Sắp/đã hết hạn (≤60 ngày)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <RoleGate allowedRoles={["admin", "inspector"]}>
        <Button asChild>
          <Link href="/tools/new">+ Thêm dụng cụ</Link>
        </Button>
      </RoleGate>
    </div>
  );
}
