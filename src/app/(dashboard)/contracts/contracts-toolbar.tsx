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
import { CONTRACT_STATUS_OPTIONS } from "@/lib/contracts/status";

const ALL_VALUE = "all";

export function ContractsToolbar({
  initialQuery,
  initialStatus,
}: {
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus || ALL_VALUE);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => setStatus(initialStatus || ALL_VALUE), [initialStatus]);

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
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(handle);
  }, [query, initialQuery, pathname, router, searchParams]);

  function handleStatusChange(value: string) {
    setStatus(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Tìm theo số hợp đồng, mã HĐ, tên khách hàng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả trạng thái</SelectItem>
            {CONTRACT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <RoleGate allowedRoles={["admin", "inspector"]}>
        <Button asChild>
          <Link href="/contracts/new">+ Thêm hợp đồng</Link>
        </Button>
      </RoleGate>
    </div>
  );
}
