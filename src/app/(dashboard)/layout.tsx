import Link from "next/link";
import Image from "next/image";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileNav } from "@/components/nav/mobile-nav";
import type { UserRole } from "@/lib/types/profile";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  inspector: "Kiểm định viên",
  accountant: "Kế toán",
  office: "Văn phòng",
};

const BASE_NAV_LINKS = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/customers", label: "Khách hàng" },
  { href: "/equipment", label: "Thiết bị" },
  { href: "/tools", label: "Dụng cụ đo" },
  { href: "/contracts", label: "Hợp đồng" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();
  const userLabel = profile
    ? `${profile.full_name || profile.email} · ${ROLE_LABELS[profile.role] ?? profile.role}`
    : null;
  // PROMPT-54: "Nhật ký thay đổi" (/audit-log) chỉ dành cho admin (RLS +
  // requireRole đã chặn ở tầng trang, ẩn link luôn cho gọn UI với role khác).
  const NAV_LINKS =
    profile?.role === "admin"
      ? [...BASE_NAV_LINKS, { href: "/audit-log", label: "Nhật ký thay đổi" }]
      : BASE_NAV_LINKS;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        {/* Hàng 1: logo + nav (hoặc hamburger dưới sm) + user/đăng xuất --
            `relative` ở đây (không phải <header>) để menu hamburger neo
            đúng ngay dưới hàng này, không bị đẩy xuống dưới cả hàng tìm
            kiếm bên dưới. */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="shrink-0">
              <Image src="/logo.png" alt="INCERT" width={108} height={36} priority />
            </Link>
            {/* Desktop/tablet: nav ngang bình thường. Dưới sm, thay bằng
                <MobileNav> (hamburger) ở cuối hàng này. */}
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 text-sm sm:flex">
            {userLabel && <span className="text-muted-foreground">{userLabel}</span>}
            <LogoutButton />
          </div>
          <MobileNav navLinks={NAV_LINKS} userLabel={userLabel} />
        </div>

        {/* Hàng 2: ô tìm kiếm toàn hệ thống, full-width, cùng lề ngang với
            hàng 1 -- giống hệt nhau trên mọi kích thước màn hình (không
            còn thu gọn icon riêng cho mobile). Gọn hơn hàng 1 (py-2 thay
            py-3) để đỡ chiếm chiều cao trên màn hình mobile vốn đã hẹp. */}
        <div className="border-t px-4 py-2 sm:px-6">
          <GlobalSearch />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
