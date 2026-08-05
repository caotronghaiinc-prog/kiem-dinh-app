import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">403</h1>
      <p className="text-muted-foreground">
        Bạn không có quyền truy cập trang này.
      </p>
      <Button asChild>
        <Link href="/dashboard">Về trang tổng quan</Link>
      </Button>
    </main>
  );
}
