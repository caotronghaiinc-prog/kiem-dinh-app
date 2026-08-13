"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
 * Ô tìm kiếm toàn hệ thống trên nav (PROMPT-13) -- desktop hiện luôn dạng
 * input, mobile thu gọn thành icon kính lúp, bấm vào mới mở overlay
 * full-width (dùng chung 1 <input> + 1 state, chỉ khác class responsive
 * qua Tailwind, không dựng 2 component input riêng để tránh lệch trạng
 * thái giữa 2 bản).
 */
export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đóng dropdown/overlay mobile mỗi khi điều hướng sang trang khác.
  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
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
    if (!dropdownOpen && !mobileOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, mobileOpen]);

  function goTo(href: string) {
    setQuery("");
    setResults(null);
    setDropdownOpen(false);
    setMobileOpen(false);
    router.push(href);
  }

  function openMobile() {
    setMobileOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const trimmedQuery = query.trim();
  const hasResults = Boolean(
    results && (results.customers.length > 0 || results.equipment.length > 0)
  );
  const showEmpty = dropdownOpen && !loading && results !== null && !hasResults;

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
        aria-label="Tìm kiếm"
        data-testid="global-search-mobile-trigger"
      >
        <Search className="h-5 w-5" />
      </button>

      <div
        ref={containerRef}
        className={cn(
          "relative sm:relative sm:z-auto sm:block sm:w-64 sm:bg-transparent sm:p-0 lg:w-80",
          mobileOpen ? "fixed inset-0 z-50 block bg-background p-4" : "hidden"
        )}
        data-testid="global-search"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
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
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:hidden"
            aria-label="Đóng tìm kiếm"
            data-testid="global-search-mobile-close"
          >
            <X className="h-5 w-5" />
          </button>
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
    </>
  );
}
