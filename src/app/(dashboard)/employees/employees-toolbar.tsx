"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/auth/role-labels";

const ALL_VALUE = "all";

export function EmployeesToolbar({
  initialQuery,
  initialRole,
}: {
  initialQuery: string;
  initialRole: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState(initialRole || ALL_VALUE);

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => setRole(initialRole || ALL_VALUE), [initialRole]);

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

  function handleRoleChange(value: string) {
    setRole(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete("role");
    } else {
      params.set("role", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Tìm theo tên, email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select value={role} onValueChange={handleRoleChange}>
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Vai trò" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tất cả vai trò</SelectItem>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
