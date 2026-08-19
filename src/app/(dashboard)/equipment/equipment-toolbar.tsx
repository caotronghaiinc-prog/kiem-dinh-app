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
import type { FilterOption } from "./types";

const ALL_VALUE = "all";

export function EquipmentToolbar({
  initialQuery,
  initialType,
  initialCustomerId,
  typeOptions,
  customerOptions,
}: {
  initialQuery: string;
  initialType: string;
  initialCustomerId: string;
  typeOptions: string[];
  customerOptions: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType || ALL_VALUE);
  const [customerId, setCustomerId] = useState(initialCustomerId || ALL_VALUE);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => setType(initialType || ALL_VALUE), [initialType]);
  useEffect(() => setCustomerId(initialCustomerId || ALL_VALUE), [initialCustomerId]);

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
          placeholder="Tìm theo tên thiết bị, mã TB, tên khách hàng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            updateParam("type", value);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Loại thiết bị" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả loại</SelectItem>
            {typeOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={customerId}
          onValueChange={(value) => {
            setCustomerId(value);
            updateParam("customerId", value);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Khách hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả khách hàng</SelectItem>
            {customerOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <RoleGate allowedRoles={["admin", "inspector"]}>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/equipment/import">Import Excel</Link>
          </Button>
          <Button asChild>
            <Link href="/equipment/new">+ Thêm thiết bị</Link>
          </Button>
        </div>
      </RoleGate>
    </div>
  );
}
