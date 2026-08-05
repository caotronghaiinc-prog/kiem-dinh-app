import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/get-current-user-profile";
import { RoleGate } from "@/components/auth/role-gate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">
          Xin chào {profile?.full_name || profile?.email}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trạng thái hệ thống</CardTitle>
          <CardDescription>Kiểm tra nhanh các module đã dựng.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Button asChild variant="outline">
            <Link href="/test-connection">Kiểm tra kết nối Supabase</Link>
          </Button>
          <RoleGate allowedRoles={["admin"]}>
            <p className="text-sm text-muted-foreground">
              Bạn đang đăng nhập với quyền Quản trị viên — có toàn quyền quản
              lý khách hàng, thiết bị và lịch sử kiểm định.
            </p>
          </RoleGate>
        </CardContent>
      </Card>
    </div>
  );
}
