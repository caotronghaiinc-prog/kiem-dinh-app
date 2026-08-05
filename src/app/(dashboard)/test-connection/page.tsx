import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TestConnectionPage() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let connected = false;
  let customerCount: number | null = null;
  let errorMessage: string | null = null;

  if (!hasEnv) {
    errorMessage =
      "Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local";
  } else {
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      if (error) {
        errorMessage = error.message;
      } else {
        connected = true;
        customerCount = count ?? 0;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Lỗi không xác định";
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Kiểm tra kết nối Supabase</h1>
        <p className="text-muted-foreground">
          Trang xác nhận pipeline Next.js → Supabase hoạt động đúng.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Trạng thái kết nối
            {connected ? (
              <Badge className="bg-green-600 hover:bg-green-600/90">
                Thành công
              </Badge>
            ) : (
              <Badge variant="destructive">Lỗi</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {connected
              ? "Đã kết nối thành công tới Supabase project."
              : errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Số bản ghi trong bảng{" "}
            <code className="rounded bg-muted px-1 py-0.5">customers</code>:{" "}
            <span className="font-semibold">
              {customerCount !== null ? customerCount : "—"}
            </span>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
