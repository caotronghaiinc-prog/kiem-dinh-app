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

const NAV_LINKS = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/customers", label: "Khách hàng" },
  { href: "/equipment", label: "Thiết bị" },
  { href: "/test-connection", label: "Kiểm tra kết nối" },
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

  return (
    <div className="min-h-screen">
      <header className="relative flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="shrink-0">
            <Image src="/logo.png" alt="INCERT" width={108} height={36} priority />
          </Link>
          {/* Desktop/tablet: nav ngang bình thường. Dưới sm, thay bằng
              <MobileNav> (hamburger) ở cuối header -- cùng breakpoint với
              <GlobalSearch> để không có trạng thái nửa-mobile nửa-desktop. */}
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <GlobalSearch />
        <div className="hidden items-center gap-3 text-sm sm:flex">
          {userLabel && <span className="text-muted-foreground">{userLabel}</span>}
          <LogoutButton />
        </div>
        <MobileNav navLinks={NAV_LINKS} userLabel={userLabel} />
      </header>
      <main>{children}</main>
    </div>
  );
}
