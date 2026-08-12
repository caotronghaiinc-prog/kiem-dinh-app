import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearch } from "@/components/search/global-search";
import type { UserRole } from "@/lib/types/profile";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị viên",
  inspector: "Kiểm định viên",
  accountant: "Kế toán",
  office: "Văn phòng",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            INCERT AI OS
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Tổng quan
            </Link>
            <Link href="/customers" className="hover:text-foreground">
              Khách hàng
            </Link>
            <Link href="/equipment" className="hover:text-foreground">
              Thiết bị
            </Link>
            <Link href="/test-connection" className="hover:text-foreground">
              Kiểm tra kết nối
            </Link>
          </nav>
        </div>
        <GlobalSearch />
        <div className="flex items-center gap-3 text-sm">
          {profile && (
            <span className="text-muted-foreground">
              {profile.full_name || profile.email} ·{" "}
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
