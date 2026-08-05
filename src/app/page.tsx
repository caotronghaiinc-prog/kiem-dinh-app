import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-3xl font-bold">INCERT AI OS</h1>
        <p className="text-muted-foreground">
          Hệ thống quản lý nội bộ kiểm định kỹ thuật an toàn.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Đăng nhập</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/test-connection">Kiểm tra kết nối Supabase</Link>
        </Button>
      </div>
    </main>
  );
}
