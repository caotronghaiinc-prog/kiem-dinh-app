import { requireRole } from "@/lib/auth/require-role";

export default async function NewEquipmentPage() {
  await requireRole(["admin", "inspector"]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-16 text-center">
      <h1 className="text-2xl font-bold">Thêm thiết bị</h1>
      <p className="text-muted-foreground">Sắp ra mắt — PROMPT-08.</p>
    </div>
  );
}
