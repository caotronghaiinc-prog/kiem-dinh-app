"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SearchResults } from "./types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

function ResultRow({
  primary,
  secondary,
  onClick,
  testId,
}: {
  primary: string;
  secondary?: string | null;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
      data-testid={testId}
    >
      <span className="font-medium">{primary}</span>
      {secondary && <span className="text-xs text-muted-foreground">{secondary}</span>}
    </button>
  );
}

function SeeAllRow({
  total,
  onClick,
  testId,
}: {
  total: number;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-accent hover:underline"
      data-testid={testId}
    >
      Xem tất cả {total} kết quả →
    </button>
  );
}

/**
 * Ô tìm kiếm toàn hệ thống -- nằm ở hàng riêng, full-width, ngay dưới hàng
 * nav chính (xem (dashboard)/layout.tsx). Giống hệt nhau trên mọi kích
 * thước màn hình -- KHÔNG thu gọn thành icon trên mobile như bản
 * PROMPT-13/14 nữa (phản hồi: nhét chung 1 hàng với nav trông chật), nên
 * component gọn hơn hẳn bản trước: không còn state/nút mở-đóng overlay
 * riêng cho mobile.
 */
export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Đóng dropdown mỗi khi điều hướng sang trang khác.
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  // Debounce 300ms trước khi gọi API -- chưa đủ 2 ký tự thì không query.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setDropdownOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setDropdownOpen(true);

    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then(async (res) => {
          if (!res.ok) {
            setResults(null);
            return;
          }
          setResults((await res.json()) as SearchResults);
        })
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [query]);

  // Click ra ngoài / phím Escape -> đóng.
  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  function goTo(href: string) {
    setQuery("");
    setResults(null);
    setDropdownOpen(false);
    router.push(href);
  }

  const trimmedQuery = query.trim();
  const hasResults = Boolean(
    results && (results.customers.length > 0 || results.equipment.length > 0)
  );
  const showEmpty = dropdownOpen && !loading && results !== null && !hasResults;

  return (
    <div ref={containerRef} className="relative w-full" data-testid="global-search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && trimmedQuery.length >= MIN_QUERY_LENGTH) setDropdownOpen(true);
          }}
          placeholder="Tìm khách hàng, thiết bị..."
          className="pl-8"
          data-testid="global-search-input"
        />
      </div>

      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          data-testid="global-search-dropdown"
        >
          {loading ? (
            <div
              className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground"
              data-testid="global-search-loading"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tìm...
            </div>
          ) : showEmpty ? (
            <p
              className="p-4 text-center text-sm text-muted-foreground"
              data-testid="global-search-empty"
            >
              Không tìm thấy kết quả
            </p>
          ) : results ? (
            <div className="flex flex-col divide-y">
              {results.customers.length > 0 && (
                <div className="flex flex-col py-1">
                  <p className="px-3 pt-1 text-xs font-semibold uppercase text-muted-foreground">
                    Khách hàng
                  </p>
                  {results.customers.map((c) => (
                    <ResultRow
                      key={c.id}
                      primary={`${c.code} · ${c.companyName}`}
                      onClick={() => goTo(`/customers/${c.id}`)}
                      testId="global-search-customer-result"
                    />
                  ))}
                  {results.customersTotal > results.customers.length && (
                    <SeeAllRow
                      total={results.customersTotal}
                      onClick={() => goTo(`/customers?q=${encodeURIComponent(trimmedQuery)}`)}
                      testId="global-search-see-all-customers"
                    />
                  )}
                </div>
              )}

              {results.equipment.length > 0 && (
                <div className="flex flex-col py-1">
                  <p className="px-3 pt-1 text-xs font-semibold uppercase text-muted-foreground">
                    Thiết bị
                  </p>
                  {results.equipment.map((e) => (
                    <ResultRow
                      key={e.id}
                      primary={`${e.code} · ${e.name}`}
                      secondary={e.customerCompanyName}
                      onClick={() => goTo(`/equipment/${e.id}`)}
                      testId="global-search-equipment-result"
                    />
                  ))}
                  {results.equipmentTotal > results.equipment.length && (
                    <SeeAllRow
                      total={results.equipmentTotal}
                      onClick={() => goTo(`/equipment?q=${encodeURIComponent(trimmedQuery)}`)}
                      testId="global-search-see-all-equipment"
                    />
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
