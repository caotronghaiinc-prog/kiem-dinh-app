"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

interface NavLink {
  href: string;
  label: string;
}

/**
 * Menu hamburger cho mobile (PROMPT-14) -- dưới breakpoint `sm` (đồng bộ
 * với breakpoint <GlobalSearch> đang dùng để không có trạng thái nửa-mobile
 * nửa-desktop). Trên `sm` trở lên component này ẩn hoàn toàn, layout.tsx tự
 * hiện <nav> + tên user/Đăng xuất bình thường như trước PROMPT-14.
 */
export function MobileNav({
  navLinks,
  userLabel,
}: {
  navLinks: NavLink[];
  userLabel: string | null;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        data-testid="mobile-nav-trigger"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-40 border-b bg-background p-4 shadow-md"
          data-testid="mobile-nav-menu"
        >
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-3 text-base text-foreground hover:bg-accent"
                data-testid="mobile-nav-link"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            {userLabel && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">{userLabel}</span>
            )}
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
